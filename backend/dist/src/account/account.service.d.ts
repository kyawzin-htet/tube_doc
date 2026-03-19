import { UserPlan, type PremiumUpgradeRequest, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AccountService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureCanTranslate(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            googleId: string | null;
            passwordHash: string | null;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        usedToday: number;
        remainingToday: number;
    }>;
    getAccountSummary(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            createdAt: Date;
            lastLoginAt: Date | null;
        };
        usage: {
            translationsUsedToday: number;
            remainingToday: number;
            dailyLimit: number;
            totalTranslations: number;
            totalTokensConsumed: number;
            totalCostUsd: number;
            tokenBalance: number;
            tokenCap: number;
            lastLoginAt: Date | null;
            recentTranslations: {
                id: string;
                requestDate: Date;
                totalTokens: number;
                estimatedCostUsd: number;
                transcriptCharacters: number;
                summaryCharacters: number;
                video: {
                    id: string;
                    createdAt: Date;
                    videoUrl: string;
                    title: string | null;
                } | null;
            }[];
        };
        premiumUpgradeRequest: {
            id: string;
            status: import("@prisma/client").$Enums.UpgradeRequestStatus;
            requestedPlan: import("@prisma/client").$Enums.UserPlan;
            createdAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
    }>;
    requestPremiumUpgrade(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            createdAt: Date;
            lastLoginAt: Date | null;
        };
        usage: {
            translationsUsedToday: number;
            remainingToday: number;
            dailyLimit: number;
            totalTranslations: number;
            totalTokensConsumed: number;
            totalCostUsd: number;
            tokenBalance: number;
            tokenCap: number;
            lastLoginAt: Date | null;
            recentTranslations: {
                id: string;
                requestDate: Date;
                totalTokens: number;
                estimatedCostUsd: number;
                transcriptCharacters: number;
                summaryCharacters: number;
                video: {
                    id: string;
                    createdAt: Date;
                    videoUrl: string;
                    title: string | null;
                } | null;
            }[];
        };
        premiumUpgradeRequest: {
            id: string;
            status: import("@prisma/client").$Enums.UpgradeRequestStatus;
            requestedPlan: import("@prisma/client").$Enums.UserPlan;
            createdAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
    }>;
    applyPremiumUpgrade(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            createdAt: Date;
            lastLoginAt: Date | null;
        };
        usage: {
            translationsUsedToday: number;
            remainingToday: number;
            dailyLimit: number;
            totalTranslations: number;
            totalTokensConsumed: number;
            totalCostUsd: number;
            tokenBalance: number;
            tokenCap: number;
            lastLoginAt: Date | null;
            recentTranslations: {
                id: string;
                requestDate: Date;
                totalTokens: number;
                estimatedCostUsd: number;
                transcriptCharacters: number;
                summaryCharacters: number;
                video: {
                    id: string;
                    createdAt: Date;
                    videoUrl: string;
                    title: string | null;
                } | null;
            }[];
        };
        premiumUpgradeRequest: {
            id: string;
            status: import("@prisma/client").$Enums.UpgradeRequestStatus;
            requestedPlan: import("@prisma/client").$Enums.UserPlan;
            createdAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
    }>;
    approvePremiumUpgradeRequest(requestId: string, reviewedById: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            createdAt: Date;
            lastLoginAt: Date | null;
        };
        usage: {
            translationsUsedToday: number;
            remainingToday: number;
            dailyLimit: number;
            totalTranslations: number;
            totalTokensConsumed: number;
            totalCostUsd: number;
            tokenBalance: number;
            tokenCap: number;
            lastLoginAt: Date | null;
            recentTranslations: {
                id: string;
                requestDate: Date;
                totalTokens: number;
                estimatedCostUsd: number;
                transcriptCharacters: number;
                summaryCharacters: number;
                video: {
                    id: string;
                    createdAt: Date;
                    videoUrl: string;
                    title: string | null;
                } | null;
            }[];
        };
        premiumUpgradeRequest: {
            id: string;
            status: import("@prisma/client").$Enums.UpgradeRequestStatus;
            requestedPlan: import("@prisma/client").$Enums.UserPlan;
            createdAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
    }>;
    cancelPremiumUpgradeRequest(requestId: string, reviewedById: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            plan: import("@prisma/client").$Enums.UserPlan;
            dailyTranslationLimit: number;
            tokenBalance: number;
            tokenCap: number;
            isRestricted: boolean;
            createdAt: Date;
            lastLoginAt: Date | null;
        };
        usage: {
            translationsUsedToday: number;
            remainingToday: number;
            dailyLimit: number;
            totalTranslations: number;
            totalTokensConsumed: number;
            totalCostUsd: number;
            tokenBalance: number;
            tokenCap: number;
            lastLoginAt: Date | null;
            recentTranslations: {
                id: string;
                requestDate: Date;
                totalTokens: number;
                estimatedCostUsd: number;
                transcriptCharacters: number;
                summaryCharacters: number;
                video: {
                    id: string;
                    createdAt: Date;
                    videoUrl: string;
                    title: string | null;
                } | null;
            }[];
        };
        premiumUpgradeRequest: {
            id: string;
            status: import("@prisma/client").$Enums.UpgradeRequestStatus;
            requestedPlan: import("@prisma/client").$Enums.UserPlan;
            createdAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
    }>;
    deductTokens(userId: string, totalTokens: number): Promise<void>;
    createInitialUserConfig(userId: string, plan?: UserPlan): Promise<{
        id: string;
        email: string;
        googleId: string | null;
        passwordHash: string | null;
        name: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        plan: import("@prisma/client").$Enums.UserPlan;
        dailyTranslationLimit: number;
        tokenBalance: number;
        tokenCap: number;
        isRestricted: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    countTranslationsToday(userId: string): Promise<number>;
    recordUsage(params: {
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
    }): Promise<void>;
    updateUserSettings(userId: string, updates: {
        tokenBalance?: number;
        tokenCap?: number;
        dailyTranslationLimit?: number;
        isRestricted?: boolean;
        role?: User['role'];
        plan?: User['plan'];
    }): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        plan: import("@prisma/client").$Enums.UserPlan;
        dailyTranslationLimit: number;
        tokenBalance: number;
        tokenCap: number;
        isRestricted: boolean;
        createdAt: Date;
        lastLoginAt: Date | null;
    }>;
    serializeUser(user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'role' | 'plan' | 'dailyTranslationLimit' | 'tokenBalance' | 'tokenCap' | 'isRestricted' | 'createdAt' | 'lastLoginAt'>): {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        plan: import("@prisma/client").$Enums.UserPlan;
        dailyTranslationLimit: number;
        tokenBalance: number;
        tokenCap: number;
        isRestricted: boolean;
        createdAt: Date;
        lastLoginAt: Date | null;
    };
    serializeUpgradeRequest(request: PremiumUpgradeRequest | null | undefined): {
        id: string;
        status: import("@prisma/client").$Enums.UpgradeRequestStatus;
        requestedPlan: import("@prisma/client").$Enums.UserPlan;
        createdAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    } | null;
}
