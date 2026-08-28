import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RulesModule } from '../rules/rules.module';
import { ActuarialModule } from '../actuarial/actuarial.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, RulesModule, ActuarialModule, AuditModule],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
