import { Module } from '@nestjs/common';
import { RuleEngineService } from './rules.service';
import { RulesController } from './rules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RulesController],
  providers: [RuleEngineService],
  exports: [RuleEngineService],
})
export class RulesModule {}
