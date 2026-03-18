import type { UserPlan, UserRole } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    plan: UserPlan;
    name: string | null;
}
export interface AuthTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    plan: UserPlan;
    name: string | null;
    exp: number;
    iat: number;
}
