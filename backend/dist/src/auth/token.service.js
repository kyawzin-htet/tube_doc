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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
let TokenService = class TokenService {
    configService;
    jwtSecret;
    stateSecret;
    tokenTtlSeconds;
    googleStateTtlSeconds;
    constructor(configService) {
        this.configService = configService;
        this.jwtSecret = this.configService.get('JWT_SECRET') || 'tubedoc-dev-secret';
        this.stateSecret =
            this.configService.get('GOOGLE_STATE_SECRET') || `${this.jwtSecret}-google-state`;
        this.tokenTtlSeconds = Number(this.configService.get('JWT_TTL_SECONDS') ?? 60 * 60 * 24 * 7);
        this.googleStateTtlSeconds = Number(this.configService.get('GOOGLE_STATE_TTL_SECONDS') ?? 60 * 10);
    }
    signUser(user) {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            plan: user.plan,
            name: user.name,
            iat: now,
            exp: now + this.tokenTtlSeconds,
        };
        return this.sign(payload, this.jwtSecret);
    }
    verifyUserToken(token) {
        const payload = this.verify(token, this.jwtSecret);
        if (payload.exp <= Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
        }
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            plan: payload.plan,
            name: payload.name,
        };
    }
    signGoogleState(origin) {
        const now = Math.floor(Date.now() / 1000);
        return this.sign({
            origin,
            nonce: Math.random().toString(36).slice(2),
            iat: now,
            exp: now + this.googleStateTtlSeconds,
        }, this.stateSecret);
    }
    verifyGoogleState(token) {
        const payload = this.verify(token, this.stateSecret);
        if (payload.exp <= Math.floor(Date.now() / 1000)) {
            throw new Error('Google OAuth state expired');
        }
        return { origin: payload.origin };
    }
    sign(payload, secret) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = this.base64url(JSON.stringify(header));
        const encodedPayload = this.base64url(JSON.stringify(payload));
        const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }
    verify(token, secret) {
        const [encodedHeader, encodedPayload, signature] = token.split('.');
        if (!encodedHeader || !encodedPayload || !signature) {
            throw new Error('Malformed token');
        }
        const expected = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
        const valid = expected.length === signature.length &&
            (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(signature));
        if (!valid) {
            throw new Error('Invalid token signature');
        }
        return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    }
    createSignature(input, secret) {
        return (0, crypto_1.createHmac)('sha256', secret).update(input).digest('base64url');
    }
    base64url(value) {
        return Buffer.from(value, 'utf8').toString('base64url');
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map