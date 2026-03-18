import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AccountModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
