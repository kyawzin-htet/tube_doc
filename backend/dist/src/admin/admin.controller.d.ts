import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getOverview(): Promise<{
        totals: {
            totalUsers: number;
            totalTranslations: number;
            totalTokens: number;
            totalCostUsd: number;
        };
        dailyActiveUsers: {
            date: string;
            users: number;
        }[];
        recentLogins: {
            id: string;
            createdAt: Date;
            provider: import("@prisma/client").$Enums.AuthProvider;
            ipAddress: string | null;
            userAgent: string | null;
            user: {
                id: string;
                email: string;
                name: string | null;
                role: import("@prisma/client").$Enums.UserRole;
                plan: import("@prisma/client").$Enums.UserPlan;
            };
        }[];
        users: {
            translationCount: number;
            loginCount: number;
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
        }[];
    }>;
    updateUser(id: string, body: Record<string, unknown>): Promise<{
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
}
