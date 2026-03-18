import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { URLSearchParams } from 'url';
import { TokenService } from './token.service';

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly backendBaseUrl: string;
  private readonly defaultFrontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    this.backendBaseUrl = this.configService.get<string>('BACKEND_BASE_URL') || 'http://localhost:3000';
    this.defaultFrontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(origin?: string) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured');
    }

    const resolvedOrigin = origin || this.defaultFrontendUrl;
    const state = this.tokenService.signGoogleState(resolvedOrigin);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string, state: string) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured');
    }

    const { origin } = this.tokenService.verifyGoogleState(state);
    const tokenResponse = await this.postForm<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.getRedirectUri(),
        grant_type: 'authorization_code',
      }),
    );

    const profile = await this.getJson<GoogleUserInfo>(
      'https://openidconnect.googleapis.com/v1/userinfo',
      tokenResponse.access_token,
    );

    if (!profile.email || !profile.sub) {
      throw new Error('Google account is missing required profile fields');
    }

    return {
      origin,
      profile,
    };
  }

  private getRedirectUri() {
    return `${this.backendBaseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  }

  private async postForm<T>(url: string, body: URLSearchParams): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Google token exchange failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async getJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google userinfo request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
