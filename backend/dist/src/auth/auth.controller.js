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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("./public.decorator");
const auth_service_1 = require("./auth.service");
const google_oauth_service_1 = require("./google-oauth.service");
let AuthController = class AuthController {
    authService;
    googleOAuthService;
    constructor(authService, googleOAuthService) {
        this.authService = authService;
        this.googleOAuthService = googleOAuthService;
    }
    signup(body, req) {
        return this.authService.signup(body, req);
    }
    login(body, req) {
        return this.authService.login(body, req);
    }
    googleStart(origin, res) {
        const url = this.googleOAuthService.getAuthorizationUrl(origin);
        return res.redirect(url);
    }
    async googleCallback(code, state, req, res) {
        if (!code || !state) {
            throw new common_1.BadRequestException('Missing Google OAuth code or state');
        }
        try {
            const result = await this.authService.handleGoogleCallback(code, state, req);
            return res
                .status(200)
                .contentType('text/html')
                .send(this.renderPopupResponse('success', result.origin, result));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Google authentication failed';
            return res
                .status(400)
                .contentType('text/html')
                .send(this.renderPopupResponse('error', '*', { message }));
        }
    }
    renderPopupResponse(type, targetOrigin, payload) {
        const serializedPayload = JSON.stringify(payload).replace(/</g, '\\u003c');
        return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #0b0d12; color: #fff; display:flex; align-items:center; justify-content:center; min-height:100vh;">
    <script>
      const payload = ${serializedPayload};
      if (window.opener) {
        window.opener.postMessage({ type: 'google-auth-${type}', payload }, ${JSON.stringify(targetOrigin)});
      }
      window.close();
    </script>
    <p>${type === 'success' ? 'Authentication complete. You can close this window.' : 'Authentication failed. You can close this window.'}</p>
  </body>
</html>`;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "signup", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/start'),
    __param(0, (0, common_1.Query)('origin')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleStart", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        google_oauth_service_1.GoogleOAuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map