import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
export declare class AuthController {
    private readonly authService;
    private readonly googleOAuthService;
    constructor(authService: AuthService, googleOAuthService: GoogleOAuthService);
    signup(body: Record<string, unknown>, req: Request): Promise<{
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
        accessToken: string;
    }>;
    login(body: Record<string, unknown>, req: Request): Promise<{
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
        accessToken: string;
    }>;
    googleStart(origin: string | undefined, res: Response): void;
    googleCallback(code: string | undefined, state: string | undefined, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private renderPopupResponse;
}
