import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AttachmentsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
