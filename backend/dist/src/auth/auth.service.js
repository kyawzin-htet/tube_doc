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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const account_service_1 = require("../account/account.service");
const prisma_service_1 = require("../prisma/prisma.service");
const google_oauth_service_1 = require("./google-oauth.service");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
let AuthService = class AuthService {
    prisma;
    passwordService;
    tokenService;
    googleOAuthService;
    accountService;
    constructor(prisma, passwordService, tokenService, googleOAuthService, accountService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.googleOAuthService = googleOAuthService;
        this.accountService = accountService;
    }
    async signup(body, request) {
        const email = this.normalizeEmail(body.email);
        const password = this.parsePassword(body.password);
        const name = typeof body.name === 'string' ? body.name.trim() || null : null;
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.BadRequestException('An account with that email already exists');
        }
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash: this.passwordService.hash(password),
                name,
                role: client_1.UserRole.USER,
                plan: client_1.UserPlan.FREE,
            },
        });
        await this.accountService.createInitialUserConfig(user.id, client_1.UserPlan.FREE);
        await this.recordLogin(user.id, client_1.AuthProvider.EMAIL, request);
        return this.buildAuthResponse(user.id);
    }
    async login(body, request) {
        const email = this.normalizeEmail(body.email);
        const password = this.parsePassword(body.password);
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!this.passwordService.verify(password, user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.recordLogin(user.id, client_1.AuthProvider.EMAIL, request);
        return this.buildAuthResponse(user.id);
    }
    async handleGoogleCallback(code, state, request) {
        const { origin, profile } = await this.googleOAuthService.exchangeCodeForProfile(code, state);
        const existingByGoogleId = await this.prisma.user.findUnique({
            where: { googleId: profile.sub },
        });
        const existingByEmail = await this.prisma.user.findUnique({
            where: { email: this.normalizeEmail(profile.email) },
        });
        const user = existingByGoogleId ||
            existingByEmail ||
            (await this.prisma.user.create({
                data: {
                    email: this.normalizeEmail(profile.email),
                    googleId: profile.sub,
                    name: profile.name || null,
                    avatarUrl: profile.picture || null,
                    role: client_1.UserRole.USER,
                    plan: client_1.UserPlan.FREE,
                },
            }));
        const updatedUser = user.googleId === profile.sub && user.avatarUrl === (profile.picture || null) && user.name === (profile.name || null)
            ? user
            : await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: profile.sub,
                    name: profile.name || user.name,
                    avatarUrl: profile.picture || user.avatarUrl,
                },
            });
        if (!existingByGoogleId && !existingByEmail) {
            await this.accountService.createInitialUserConfig(updatedUser.id, client_1.UserPlan.FREE);
        }
        await this.recordLogin(updatedUser.id, client_1.AuthProvider.GOOGLE, request);
        return {
            origin,
            ...(await this.buildAuthResponse(updatedUser.id)),
        };
    }
    async buildAuthResponse(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const account = await this.accountService.getAccountSummary(user.id);
        return {
            accessToken: this.tokenService.signUser(user),
            ...account,
        };
    }
    async recordLogin(userId, provider, request) {
        await this.prisma.$transaction([
            this.prisma.loginActivity.create({
                data: {
                    userId,
                    provider,
                    ipAddress: this.extractIp(request),
                    userAgent: request.headers['user-agent'] || null,
                },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    lastLoginAt: new Date(),
                },
            }),
        ]);
    }
    normalizeEmail(input) {
        if (typeof input !== 'string' || !input.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        return input.trim().toLowerCase();
    }
    parsePassword(input) {
        if (typeof input !== 'string' || input.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters long');
        }
        return input;
    }
    extractIp(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (typeof forwarded === 'string' && forwarded.trim()) {
            return forwarded.split(',')[0].trim();
        }
        return request.ip || null;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        google_oauth_service_1.GoogleOAuthService,
        account_service_1.AccountService])
], AuthService);
//# sourceMappingURL=auth.service.js.map