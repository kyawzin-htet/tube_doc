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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const account_service_1 = require("../account/account.service");
let AdminService = class AdminService {
    prisma;
    accountService;
    constructor(prisma, accountService) {
        this.prisma = prisma;
        this.accountService = accountService;
    }
    async getOverview() {
        const [totalUsers, recentLogins, usageTotals, users, dailyLogins, dailyUsage, pendingUpgradeRequests] = await Promise.all([
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
            this.prisma.premiumUpgradeRequest.findMany({
                where: {
                    status: 'PENDING',
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            plan: true,
                            role: true,
                        },
                    },
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
            pendingUpgradeRequests: pendingUpgradeRequests.map((request) => ({
                id: request.id,
                status: request.status,
                requestedPlan: request.requestedPlan,
                createdAt: request.createdAt,
                user: request.user,
            })),
            users: users.map((user) => ({
                ...this.accountService.serializeUser(user),
                translationCount: user._count.usage,
                loginCount: user._count.loginActivities,
            })),
        };
    }
    async updateUser(userId, body) {
        const updates = {};
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
    async approveUpgradeRequest(requestId, reviewedById) {
        return this.accountService.approvePremiumUpgradeRequest(requestId, reviewedById);
    }
    async cancelUpgradeRequest(requestId, reviewedById) {
        return this.accountService.cancelPremiumUpgradeRequest(requestId, reviewedById);
    }
    buildDailyActiveUsers(dailyLogins, dailyUsage) {
        const map = new Map();
        const record = (userId, createdAt) => {
            const day = createdAt.toISOString().slice(0, 10);
            if (!map.has(day)) {
                map.set(day, new Set());
            }
            map.get(day).add(userId);
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
    daysAgo(days) {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - days);
        return date;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        account_service_1.AccountService])
], AdminService);
//# sourceMappingURL=admin.service.js.map