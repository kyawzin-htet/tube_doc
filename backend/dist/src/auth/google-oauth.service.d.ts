import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
interface GoogleUserInfo {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
}
export declare class GoogleOAuthService {
    private readonly configService;
    private readonly tokenService;
    private readonly clientId;
    private readonly clientSecret;
    private readonly backendBaseUrl;
    private readonly defaultFrontendUrl;
    constructor(configService: ConfigService, tokenService: TokenService);
    isConfigured(): boolean;
    getAuthorizationUrl(origin?: string): string;
    exchangeCodeForProfile(code: string, state: string): Promise<{
        origin: string;
        profile: GoogleUserInfo;
    }>;
    private getRedirectUri;
    private postForm;
    private getJson;
}
export {};
