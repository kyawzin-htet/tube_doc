import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import type { AuthTokenPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly stateSecret: string;
  private readonly tokenTtlSeconds: number;
  private readonly googleStateTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'tubedoc-dev-secret';
    this.stateSecret =
      this.configService.get<string>('GOOGLE_STATE_SECRET') || `${this.jwtSecret}-google-state`;
    this.tokenTtlSeconds = Number(this.configService.get('JWT_TTL_SECONDS') ?? 60 * 60 * 24 * 7);
    this.googleStateTtlSeconds = Number(
      this.configService.get('GOOGLE_STATE_TTL_SECONDS') ?? 60 * 10,
    );
  }

  signUser(user: Pick<User, 'id' | 'email' | 'role' | 'plan' | 'name'>) {
    const now = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
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

  verifyUserToken(token: string): AuthenticatedUser {
    const payload = this.verify<AuthTokenPayload>(token, this.jwtSecret);
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

  signGoogleState(origin: string) {
    const now = Math.floor(Date.now() / 1000);
    return this.sign(
      {
        origin,
        nonce: Math.random().toString(36).slice(2),
        iat: now,
        exp: now + this.googleStateTtlSeconds,
      },
      this.stateSecret,
    );
  }

  verifyGoogleState(token: string): { origin: string } {
    const payload = this.verify<{ origin: string; exp: number }>(token, this.stateSecret);
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Google OAuth state expired');
    }
    return { origin: payload.origin };
  }

  private sign<T extends object>(payload: T, secret: string) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify(payload));
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verify<T>(token: string, secret: string): T {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error('Malformed token');
    }

    const expected = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    const valid =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) {
      throw new Error('Invalid token signature');
    }

    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as T;
  }

  private createSignature(input: string, secret: string) {
    return createHmac('sha256', secret).update(input).digest('base64url');
  }

  private base64url(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
}
