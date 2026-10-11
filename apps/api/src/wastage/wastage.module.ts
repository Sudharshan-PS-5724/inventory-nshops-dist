import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WastageController } from './wastage.controller.js';
import { WastageService } from './wastage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WastageController],
  providers: [WastageService],
})
export class WastageModule {}
