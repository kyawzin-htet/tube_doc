import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
export declare class AuthBootstrapService implements OnModuleInit {
    private readonly configService;
    private readonly prisma;
    private readonly passwordService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, passwordService: PasswordService);
    onModuleInit(): Promise<void>;
}
