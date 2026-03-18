import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserPlan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onModuleInit() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

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
          role: UserRole.ADMIN,
          plan: UserPlan.PREMIUM,
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
        role: UserRole.ADMIN,
        plan: UserPlan.PREMIUM,
        dailyTranslationLimit: 100,
        tokenBalance: 500000,
        tokenCap: 1000000,
      },
    });
    this.logger.log(`Created bootstrap admin account for ${normalizedEmail}`);
  }
}
