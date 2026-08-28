import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RulesModule } from '../rules/rules.module';
import { ActuarialModule } from '../actuarial/actuarial.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ClaimStateMachine } from './state-machine/claim-state-machine';

@Module({
  imports: [PrismaModule, RulesModule, ActuarialModule, AuditModule, StorageModule],
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimStateMachine],
  exports: [ClaimsService, ClaimStateMachine],
})
export class ClaimsModule {}
