import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import type { AuthenticatedUser } from './auth.types';
export declare class TokenService {
    private readonly configService;
    private readonly jwtSecret;
    private readonly stateSecret;
    private readonly tokenTtlSeconds;
    private readonly googleStateTtlSeconds;
    constructor(configService: ConfigService);
    signUser(user: Pick<User, 'id' | 'email' | 'role' | 'plan' | 'name'>): string;
    verifyUserToken(token: string): AuthenticatedUser;
    signGoogleState(origin: string): string;
    verifyGoogleState(token: string): {
        origin: string;
    };
    private sign;
    private verify;
    private createSignature;
    private base64url;
}
