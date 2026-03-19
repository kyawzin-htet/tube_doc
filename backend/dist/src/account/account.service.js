"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const FREE_DAILY_LIMIT = 1;
const PREMIUM_DAILY_LIMIT = 10;
const FREE_STARTING_TOKENS = 20000;
const PREMIUM_STARTING_TOKENS = 150000;
const PREMIUM_TOKEN_CAP = 500000;
let AccountService = class AccountService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureCanTranslate(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.isRestricted) {
            throw new common_1.ForbiddenException('Your account is currently restricted by an administrator');
        }
        if (user.tokenBalance <= 0) {
            throw new common_1.ForbiddenException('No translation tokens remaining. Upgrade or contact an admin.');
        }
        const usedToday = await this.countTranslationsToday(userId);
        if (usedToday >= user.dailyTranslationLimit) {
            throw new common_1.ForbiddenException(`Daily translation limit reached (${user.dailyTranslationLimit}/day). Upgrade for a higher limit.`);
        }
        return {
            user,
            usedToday,
            remainingToday: Math.max(0, user.dailyTranslationLimit - usedToday),
        };
    }
    async getAccountSummary(userId) {
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
            throw new common_1.NotFoundException('User not found');
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
        const latestUpgradeRequest = await this.prisma.premiumUpgradeRequest.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
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
            premiumUpgradeRequest: this.serializeUpgradeRequest(latestUpgradeRequest),
        };
    }
    async requestPremiumUpgrade(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.plan === client_1.UserPlan.PREMIUM) {
            throw new common_1.BadRequestException('This account is already on Premium');
        }
        const existingPending = await this.prisma.premiumUpgradeRequest.findFirst({
            where: {
                userId,
                status: client_1.UpgradeRequestStatus.PENDING,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existingPending) {
            return this.getAccountSummary(userId);
        }
        await this.prisma.premiumUpgradeRequest.create({
            data: {
                userId,
                status: client_1.UpgradeRequestStatus.PENDING,
                requestedPlan: client_1.UserPlan.PREMIUM,
            },
        });
        return this.getAccountSummary(userId);
    }
    async applyPremiumUpgrade(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                plan: client_1.UserPlan.PREMIUM,
                dailyTranslationLimit: Math.max(user.dailyTranslationLimit, PREMIUM_DAILY_LIMIT),
                tokenBalance: Math.max(user.tokenBalance, PREMIUM_STARTING_TOKENS),
                tokenCap: Math.max(user.tokenCap, PREMIUM_TOKEN_CAP),
            },
        });
        return this.getAccountSummary(updated.id);
    }
    async approvePremiumUpgradeRequest(requestId, reviewedById) {
        const request = await this.prisma.premiumUpgradeRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('Upgrade request not found');
        }
        if (request.status !== client_1.UpgradeRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending upgrade requests can be approved');
        }
        await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: request.userId } });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            await tx.user.update({
                where: { id: user.id },
                data: {
                    plan: client_1.UserPlan.PREMIUM,
                    dailyTranslationLimit: Math.max(user.dailyTranslationLimit, PREMIUM_DAILY_LIMIT),
                    tokenBalance: Math.max(user.tokenBalance, PREMIUM_STARTING_TOKENS),
                    tokenCap: Math.max(user.tokenCap, PREMIUM_TOKEN_CAP),
                },
            });
            await tx.premiumUpgradeRequest.update({
                where: { id: requestId },
                data: {
                    status: client_1.UpgradeRequestStatus.APPROVED,
                    reviewedById,
                    reviewedAt: new Date(),
                },
            });
        });
        return this.getAccountSummary(request.userId);
    }
    async cancelPremiumUpgradeRequest(requestId, reviewedById) {
        const request = await this.prisma.premiumUpgradeRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('Upgrade request not found');
        }
        if (request.status !== client_1.UpgradeRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending upgrade requests can be canceled');
        }
        await this.prisma.premiumUpgradeRequest.update({
            where: { id: requestId },
            data: {
                status: client_1.UpgradeRequestStatus.CANCELED,
                reviewedById,
                reviewedAt: new Date(),
            },
        });
        return this.getAccountSummary(request.userId);
    }
    async deductTokens(userId, totalTokens) {
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
    async createInitialUserConfig(userId, plan = client_1.UserPlan.FREE) {
        const defaults = plan === client_1.UserPlan.PREMIUM
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
    async countTranslationsToday(userId) {
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
    async recordUsage(params) {
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
    async updateUserSettings(userId, updates) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (typeof updates.dailyTranslationLimit === 'number' &&
            updates.dailyTranslationLimit < 1) {
            throw new common_1.BadRequestException('Daily translation limit must be at least 1');
        }
        if (typeof updates.tokenBalance === 'number' && updates.tokenBalance < 0) {
            throw new common_1.BadRequestException('Token balance cannot be negative');
        }
        if (typeof updates.tokenCap === 'number' && updates.tokenCap < 0) {
            throw new common_1.BadRequestException('Token cap cannot be negative');
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: updates,
        });
        return this.serializeUser(updated);
    }
    serializeUser(user) {
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
    serializeUpgradeRequest(request) {
        if (!request) {
            return null;
        }
        return {
            id: request.id,
            status: request.status,
            requestedPlan: request.requestedPlan,
            createdAt: request.createdAt,
            reviewedAt: request.reviewedAt,
            reviewedById: request.reviewedById,
        };
    }
};
exports.AccountService = AccountService;
exports.AccountService = AccountService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountService);
//# sourceMappingURL=account.service.js.map