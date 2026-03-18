import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, UserPlan, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly accountService: AccountService,
  ) {}

  async signup(body: Record<string, unknown>, request: Request) {
    const email = this.normalizeEmail(body.email);
    const password = this.parsePassword(body.password);
    const name = typeof body.name === 'string' ? body.name.trim() || null : null;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('An account with that email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: this.passwordService.hash(password),
        name,
        role: UserRole.USER,
        plan: UserPlan.FREE,
      },
    });

    await this.accountService.createInitialUserConfig(user.id, UserPlan.FREE);
    await this.recordLogin(user.id, AuthProvider.EMAIL, request);
    return this.buildAuthResponse(user.id);
  }

  async login(body: Record<string, unknown>, request: Request) {
    const email = this.normalizeEmail(body.email);
    const password = this.parsePassword(body.password);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!this.passwordService.verify(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.recordLogin(user.id, AuthProvider.EMAIL, request);
    return this.buildAuthResponse(user.id);
  }

  async handleGoogleCallback(code: string, state: string, request: Request) {
    const { origin, profile } = await this.googleOAuthService.exchangeCodeForProfile(code, state);

    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.sub },
    });
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(profile.email) },
    });

    const user =
      existingByGoogleId ||
      existingByEmail ||
      (await this.prisma.user.create({
        data: {
          email: this.normalizeEmail(profile.email),
          googleId: profile.sub,
          name: profile.name || null,
          avatarUrl: profile.picture || null,
          role: UserRole.USER,
          plan: UserPlan.FREE,
        },
      }));

    const updatedUser =
      user.googleId === profile.sub && user.avatarUrl === (profile.picture || null) && user.name === (profile.name || null)
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
      await this.accountService.createInitialUserConfig(updatedUser.id, UserPlan.FREE);
    }

    await this.recordLogin(updatedUser.id, AuthProvider.GOOGLE, request);

    return {
      origin,
      ...(await this.buildAuthResponse(updatedUser.id)),
    };
  }

  async buildAuthResponse(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.accountService.getAccountSummary(user.id);
    return {
      accessToken: this.tokenService.signUser(user),
      ...account,
    };
  }

  private async recordLogin(userId: string, provider: AuthProvider, request: Request) {
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

  private normalizeEmail(input: unknown) {
    if (typeof input !== 'string' || !input.trim()) {
      throw new BadRequestException('Email is required');
    }
    return input.trim().toLowerCase();
  }

  private parsePassword(input: unknown) {
    if (typeof input !== 'string' || input.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    return input;
  }

  private extractIp(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]!.trim();
    }
    return request.ip || null;
  }
}
