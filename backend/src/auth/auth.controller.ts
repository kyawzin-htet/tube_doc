import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Public()
  @Post('signup')
  signup(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.authService.signup(body, req);
  }

  @Public()
  @Post('login')
  login(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.authService.login(body, req);
  }

  @Public()
  @Get('google/start')
  googleStart(@Query('origin') origin: string | undefined, @Res() res: Response) {
    const url = this.googleOAuthService.getAuthorizationUrl(origin);
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing Google OAuth code or state');
    }

    try {
      const result = await this.authService.handleGoogleCallback(code, state, req);
      return res
        .status(200)
        .contentType('text/html')
        .send(this.renderPopupResponse('success', result.origin, result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google authentication failed';
      return res
        .status(400)
        .contentType('text/html')
        .send(this.renderPopupResponse('error', '*', { message }));
    }
  }

  private renderPopupResponse(
    type: 'success' | 'error',
    targetOrigin: string,
    payload: Record<string, unknown>,
  ) {
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
}
