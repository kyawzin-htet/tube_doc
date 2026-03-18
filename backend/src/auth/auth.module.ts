import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { AuthBootstrapService } from './auth-bootstrap.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  imports: [AccountModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthBootstrapService,
    AuthGuard,
    RolesGuard,
    TokenService,
    PasswordService,
    GoogleOAuthService,
  ],
  exports: [AuthGuard, RolesGuard, TokenService],
})
export class AuthModule {}
