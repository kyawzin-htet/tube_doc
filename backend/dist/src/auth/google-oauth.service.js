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
exports.GoogleOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const url_1 = require("url");
const token_service_1 = require("./token.service");
let GoogleOAuthService = class GoogleOAuthService {
    configService;
    tokenService;
    clientId;
    clientSecret;
    backendBaseUrl;
    defaultFrontendUrl;
    constructor(configService, tokenService) {
        this.configService = configService;
        this.tokenService = tokenService;
        this.clientId = this.configService.get('GOOGLE_CLIENT_ID') || '';
        this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET') || '';
        this.backendBaseUrl = this.configService.get('BACKEND_BASE_URL') || 'http://localhost:3000';
        this.defaultFrontendUrl =
            this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    }
    isConfigured() {
        return Boolean(this.clientId && this.clientSecret);
    }
    getAuthorizationUrl(origin) {
        if (!this.isConfigured()) {
            throw new Error('Google OAuth is not configured');
        }
        const resolvedOrigin = origin || this.defaultFrontendUrl;
        const state = this.tokenService.signGoogleState(resolvedOrigin);
        const params = new url_1.URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.getRedirectUri(),
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online',
            prompt: 'select_account',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async exchangeCodeForProfile(code, state) {
        if (!this.isConfigured()) {
            throw new Error('Google OAuth is not configured');
        }
        const { origin } = this.tokenService.verifyGoogleState(state);
        const tokenResponse = await this.postForm('https://oauth2.googleapis.com/token', new url_1.URLSearchParams({
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.getRedirectUri(),
            grant_type: 'authorization_code',
        }));
        const profile = await this.getJson('https://openidconnect.googleapis.com/v1/userinfo', tokenResponse.access_token);
        if (!profile.email || !profile.sub) {
            throw new Error('Google account is missing required profile fields');
        }
        return {
            origin,
            profile,
        };
    }
    getRedirectUri() {
        return `${this.backendBaseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    }
    async postForm(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        if (!response.ok) {
            throw new Error(`Google token exchange failed with status ${response.status}`);
        }
        return (await response.json());
    }
    async getJson(url, accessToken) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Google userinfo request failed with status ${response.status}`);
        }
        return (await response.json());
    }
};
exports.GoogleOAuthService = GoogleOAuthService;
exports.GoogleOAuthService = GoogleOAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        token_service_1.TokenService])
], GoogleOAuthService);
//# sourceMappingURL=google-oauth.service.js.map