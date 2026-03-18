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
var AuthBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const password_service_1 = require("./password.service");
let AuthBootstrapService = AuthBootstrapService_1 = class AuthBootstrapService {
    configService;
    prisma;
    passwordService;
    logger = new common_1.Logger(AuthBootstrapService_1.name);
    constructor(configService, prisma, passwordService) {
        this.configService = configService;
        this.prisma = prisma;
        this.passwordService = passwordService;
    }
    async onModuleInit() {
        const adminEmail = this.configService.get('ADMIN_EMAIL');
        const adminPassword = this.configService.get('ADMIN_PASSWORD');
        if (!adminEmail || !adminPassword) {
            return;
        }
        const normalizedEmail = adminEmail.trim().toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existing) {
            await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    role: client_1.UserRole.ADMIN,
                    plan: client_1.UserPlan.PREMIUM,
                    dailyTranslationLimit: Math.max(existing.dailyTranslationLimit, 100),
                    tokenBalance: Math.max(existing.tokenBalance, 500000),
                    tokenCap: Math.max(existing.tokenCap, 1000000),
                    passwordHash: existing.passwordHash || this.passwordService.hash(adminPassword),
                },
            });
            this.logger.log(`Admin account ready for ${normalizedEmail}`);
            return;
        }
        await this.prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash: this.passwordService.hash(adminPassword),
                role: client_1.UserRole.ADMIN,
                plan: client_1.UserPlan.PREMIUM,
                dailyTranslationLimit: 100,
                tokenBalance: 500000,
                tokenCap: 1000000,
            },
        });
        this.logger.log(`Created bootstrap admin account for ${normalizedEmail}`);
    }
};
exports.AuthBootstrapService = AuthBootstrapService;
exports.AuthBootstrapService = AuthBootstrapService = AuthBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        password_service_1.PasswordService])
], AuthBootstrapService);
//# sourceMappingURL=auth-bootstrap.service.js.map