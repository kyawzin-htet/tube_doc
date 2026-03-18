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
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("./public.decorator");
const token_service_1 = require("./token.service");
let AuthGuard = class AuthGuard {
    reflector;
    tokenService;
    constructor(reflector, tokenService) {
        this.reflector = reflector;
        this.tokenService = tokenService;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context
            .switchToHttp()
            .getRequest();
        const authorization = request.headers.authorization;
        const bearerToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
            ? authorization.slice(7)
            : undefined;
        const queryToken = typeof request.query.accessToken === 'string' ? request.query.accessToken : undefined;
        const token = bearerToken || queryToken;
        if (!token) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        try {
            request.user = this.tokenService.verifyUserToken(token);
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid access token';
            throw new common_1.UnauthorizedException(message);
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        token_service_1.TokenService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map