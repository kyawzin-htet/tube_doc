import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccountService } from './account.service';

@Controller('api/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.getAccountSummary(user.id);
  }

  @Post('upgrade-request')
  requestUpgrade(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.requestPremiumUpgrade(user.id);
  }
}
