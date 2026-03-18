import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserPlan, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const FREE_DAILY_LIMIT = 1;
const PREMIUM_DAILY_LIMIT = 10;
const FREE_STARTING_TOKENS = 20000;
const PREMIUM_STARTING_TOKENS = 150000;
const PREMIUM_TOKEN_CAP = 500000;

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCanTranslate(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isRestricted) {
      throw new ForbiddenException('Your account is currently restricted by an administrator');
    }
    if (user.tokenBalance <= 0) {
      throw new ForbiddenException('No translation tokens remaining. Upgrade or contact an admin.');
    }

    const usedToday = await this.countTranslationsToday(userId);
    if (usedToday >= user.dailyTranslationLimit) {
      throw new ForbiddenException(
        `Daily translation limit reached (${user.dailyTranslationLimit}/day). Upgrade for a higher limit.`,
      );
    }

    return {
      user,
      usedToday,
      remainingToday: Math.max(0, user.dailyTranslationLimit - usedToday),
    };
  }

  async getAccountSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        usage: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            video: {
              select: {
                id: true,
                title: true,
                videoUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [usedToday, aggregate, lastLogin] = await Promise.all([
      this.countTranslationsToday(user.id),
      this.prisma.translationUsage.aggregate({
        where: { userId: user.id },
        _count: { id: true },
        _sum: {
          totalTokens: true,
          estimatedCostUsd: true,
        },
      }),
      this.prisma.loginActivity.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      user: this.serializeUser(user),
      usage: {
        translationsUsedToday: usedToday,
        remainingToday: Math.max(0, user.dailyTranslationLimit - usedToday),
        dailyLimit: user.dailyTranslationLimit,
        totalTranslations: aggregate._count.id,
        totalTokensConsumed: aggregate._sum.totalTokens ?? 0,
        totalCostUsd: Number((aggregate._sum.estimatedCostUsd ?? 0).toFixed(4)),
        tokenBalance: user.tokenBalance,
        tokenCap: user.tokenCap,
        lastLoginAt: lastLogin?.createdAt ?? user.lastLoginAt,
        recentTranslations: user.usage.map((entry) => ({
          id: entry.id,
          requestDate: entry.requestDate,
          totalTokens: entry.totalTokens,
          estimatedCostUsd: Number(entry.estimatedCostUsd.toFixed(4)),
          transcriptCharacters: entry.transcriptCharacters,
          summaryCharacters: entry.summaryCharacters,
          video: entry.video,
        })),
      },
    };
  }

  async upgradeToPremium(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: UserPlan.PREMIUM,
        dailyTranslationLimit: Math.max(user.dailyTranslationLimit, PREMIUM_DAILY_LIMIT),
        tokenBalance: Math.max(user.tokenBalance, PREMIUM_STARTING_TOKENS),
        tokenCap: Math.max(user.tokenCap, PREMIUM_TOKEN_CAP),
      },
    });

    return this.getAccountSummary(updated.id);
  }

  async deductTokens(userId: string, totalTokens: number) {
    if (totalTokens <= 0) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenBalance: {
          decrement: totalTokens,
        },
      },
    });
  }

  async createInitialUserConfig(userId: string, plan: UserPlan = UserPlan.FREE) {
    const defaults =
      plan === UserPlan.PREMIUM
        ? {
            plan,
            dailyTranslationLimit: PREMIUM_DAILY_LIMIT,
            tokenBalance: PREMIUM_STARTING_TOKENS,
            tokenCap: PREMIUM_TOKEN_CAP,
          }
        : {
            plan,
            dailyTranslationLimit: FREE_DAILY_LIMIT,
            tokenBalance: FREE_STARTING_TOKENS,
            tokenCap: FREE_STARTING_TOKENS,
          };

    return this.prisma.user.update({
      where: { id: userId },
      data: defaults,
    });
  }

  async countTranslationsToday(userId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return this.prisma.processingJob.count({
      where: {
        userId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });
  }

  async recordUsage(params: {
    userId: string;
    jobId: string;
    videoId?: string;
    transcriptCharacters: number;
    summaryCharacters: number;
    transcriptionInputTokens: number;
    transcriptionOutputTokens: number;
    summaryInputTokens: number;
    summaryOutputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }) {
    const { userId, jobId, videoId, ...rest } = params;

    await this.prisma.translationUsage.upsert({
      where: { jobId },
      update: {
        videoId,
        ...rest,
        requestDate: new Date(),
      },
      create: {
        userId,
        jobId,
        videoId,
        ...rest,
        requestDate: new Date(),
      },
    });

    await this.deductTokens(userId, rest.totalTokens);
  }

  async updateUserSettings(
    userId: string,
    updates: {
      tokenBalance?: number;
      tokenCap?: number;
      dailyTranslationLimit?: number;
      isRestricted?: boolean;
      role?: User['role'];
      plan?: User['plan'];
    },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (
      typeof updates.dailyTranslationLimit === 'number' &&
      updates.dailyTranslationLimit < 1
    ) {
      throw new BadRequestException('Daily translation limit must be at least 1');
    }
    if (typeof updates.tokenBalance === 'number' && updates.tokenBalance < 0) {
      throw new BadRequestException('Token balance cannot be negative');
    }
    if (typeof updates.tokenCap === 'number' && updates.tokenCap < 0) {
      throw new BadRequestException('Token cap cannot be negative');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return this.serializeUser(updated);
  }

  serializeUser(user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'role' | 'plan' | 'dailyTranslationLimit' | 'tokenBalance' | 'tokenCap' | 'isRestricted' | 'createdAt' | 'lastLoginAt'>) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      plan: user.plan,
      dailyTranslationLimit: user.dailyTranslationLimit,
      tokenBalance: user.tokenBalance,
      tokenCap: user.tokenCap,
      isRestricted: user.isRestricted,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
