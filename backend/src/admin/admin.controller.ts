import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('api/admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateUser(id, body);
  }

  @Post('upgrade-requests/:id/approve')
  approveUpgradeRequest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.approveUpgradeRequest(id, user.id);
  }

  @Post('upgrade-requests/:id/cancel')
  cancelUpgradeRequest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.cancelUpgradeRequest(id, user.id);
  }
}
