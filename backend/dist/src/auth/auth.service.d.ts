import type { Request } from 'express';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
export declare class AuthService {
    private readonly prisma;
    private readonly passwordService;
    private readonly tokenService;
    private readonly googleOAuthService;
    private readonly accountService;
    constructor(prisma: PrismaService, passwordService: PasswordService, tokenService: TokenService, googleOAuthService: GoogleOAuthService, accountService: AccountService);
    signup(body: Record<string, unknown>, request: Request): Promise<{
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
        accessToken: string;
    }>;
    login(body: Record<string, unknown>, request: Request): Promise<{
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
        accessToken: string;
    }>;
    handleGoogleCallback(code: string, state: string, request: Request): Promise<{
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
        accessToken: string;
        origin: string;
    }>;
    buildAuthResponse(userId: string): Promise<{
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
        accessToken: string;
    }>;
    private recordLogin;
    private normalizeEmail;
    private parsePassword;
    private extractIp;
}
