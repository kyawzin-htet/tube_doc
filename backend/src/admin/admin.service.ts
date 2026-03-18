import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from '../account/account.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
  ) {}

  async getOverview() {
    const [totalUsers, recentLogins, usageTotals, users, dailyLogins, dailyUsage] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.loginActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              plan: true,
            },
          },
        },
      }),
      this.prisma.translationUsage.aggregate({
        _sum: {
          totalTokens: true,
          estimatedCostUsd: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          _count: {
            select: {
              usage: true,
              loginActivities: true,
            },
          },
        },
      }),
      this.prisma.loginActivity.findMany({
        where: {
          createdAt: {
            gte: this.daysAgo(6),
          },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      }),
      this.prisma.translationUsage.findMany({
        where: {
          createdAt: {
            gte: this.daysAgo(6),
          },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totals: {
        totalUsers,
        totalTranslations: usageTotals._count.id,
        totalTokens: usageTotals._sum.totalTokens ?? 0,
        totalCostUsd: Number((usageTotals._sum.estimatedCostUsd ?? 0).toFixed(4)),
      },
      dailyActiveUsers: this.buildDailyActiveUsers(dailyLogins, dailyUsage),
      recentLogins: recentLogins.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        provider: entry.provider,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        user: entry.user,
      })),
      users: users.map((user) => ({
        ...this.accountService.serializeUser(user),
        translationCount: user._count.usage,
        loginCount: user._count.loginActivities,
      })),
    };
  }

  async updateUser(userId: string, body: Record<string, unknown>) {
    const updates: Parameters<AccountService['updateUserSettings']>[1] = {};

    if (typeof body.tokenBalance === 'number') {
      updates.tokenBalance = body.tokenBalance;
    }
    if (typeof body.tokenCap === 'number') {
      updates.tokenCap = body.tokenCap;
    }
    if (typeof body.dailyTranslationLimit === 'number') {
      updates.dailyTranslationLimit = body.dailyTranslationLimit;
    }
    if (typeof body.isRestricted === 'boolean') {
      updates.isRestricted = body.isRestricted;
    }
    if (body.role === 'USER' || body.role === 'ADMIN') {
      updates.role = body.role;
    }
    if (body.plan === 'FREE' || body.plan === 'PREMIUM') {
      updates.plan = body.plan;
    }

    return this.accountService.updateUserSettings(userId, updates);
  }

  private buildDailyActiveUsers(
    dailyLogins: Array<{ userId: string; createdAt: Date }>,
    dailyUsage: Array<{ userId: string; createdAt: Date }>,
  ) {
    const map = new Map<string, Set<string>>();

    const record = (userId: string, createdAt: Date) => {
      const day = createdAt.toISOString().slice(0, 10);
      if (!map.has(day)) {
        map.set(day, new Set());
      }
      map.get(day)!.add(userId);
    };

    dailyLogins.forEach((entry) => record(entry.userId, entry.createdAt));
    dailyUsage.forEach((entry) => record(entry.userId, entry.createdAt));

    return Array.from({ length: 7 }, (_, index) => {
      const date = this.daysAgo(6 - index).toISOString().slice(0, 10);
      return {
        date,
        users: map.get(date)?.size ?? 0,
      };
    });
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }
}
