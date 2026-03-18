import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined>; query: Record<string, string | undefined>; user?: unknown }>();
    const authorization = request.headers.authorization;
    const bearerToken =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined;
    const queryToken =
      typeof request.query.accessToken === 'string' ? request.query.accessToken : undefined;
    const token = bearerToken || queryToken;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.user = this.tokenService.verifyUserToken(token);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid access token';
      throw new UnauthorizedException(message);
    }
  }
}
