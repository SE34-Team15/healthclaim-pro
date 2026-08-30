import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { UserRole, ReceiptAttachmentDto } from '@healthclaim/shared';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Upload and envelope-encrypt a medical invoice/receipt attachment
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max limit
      },
    }),
  )
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @ClientIp() ipAddress: string,
  ): Promise<ReceiptAttachmentDto> {
    if (!file) {
      throw new BadRequestException('No file attachment uploaded.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed: PNG, JPEG, WEBP, PDF.`,
      );
    }

    // 1. Encrypt and store payload via in-memory AES-256-GCM envelope
    const encryption = await this.storageService.encryptAndStore(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Persist database record
    const attachment = await this.prisma.receiptAttachment.create({
      data: {
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey: encryption.storageKey,
        encryptedDek: encryption.encryptedDek,
        iv: encryption.iv,
        authTag: encryption.authTag,
        checksum: encryption.checksum,
        magicHeader: encryption.magicHeader,
      },
    });

    // 3. Record audit trail
    await this.auditService.log({
      actorId: userId,
      action: 'UPLOAD_RECEIPT_ATTACHMENT',
      targetResource: 'ReceiptAttachment',
      targetResourceId: attachment.id,
      ipAddress,
      details: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        checksum: encryption.checksum,
      },
    });

    return {
      id: attachment.id,
      claimId: attachment.claimId,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      checksum: attachment.checksum,
      createdAt: attachment.createdAt.toISOString(),
      previewUrl: `/api/v1/attachments/${attachment.id}/preview`,
    };
  }

  /**
   * Secure just-in-time in-memory decrypt & preview stream
   */
  @Get(':id/preview')
  async previewAttachment(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Res() res: Response,
    @ClientIp() ipAddress: string,
  ) {
    const attachment = await this.prisma.receiptAttachment.findUnique({
      where: { id },
      include: {
        claim: {
          select: {
            id: true,
            userId: true,
            claimNumber: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException(`Receipt attachment with ID '${id}' not found.`);
    }

    // RBAC & Ownership access check
    const isOwner = attachment.userId === currentUser.id;
    const isPrivilegedOfficer = [
      UserRole.CLAIM_OFFICER,
      UserRole.FINANCE_MANAGER,
      UserRole.SECURITY_AUDITOR,
      UserRole.SYSTEM_ADMIN,
    ].includes(currentUser.role);

    if (!isOwner && !isPrivilegedOfficer) {
      throw new ForbiddenException('You are not authorized to view this medical receipt attachment.');
    }

    // 1. Decrypt on the fly in memory with GCM Auth Tag verification
    const decryptedBuffer = await this.storageService.retrieveAndDecrypt(
      attachment.storageKey,
      attachment.encryptedDek!,
      attachment.checksum,
    );

    // 2. Log immutable audit entry for medical data access
    await this.auditService.log({
      actorId: currentUser.id,
      action: 'PREVIEW_RECEIPT_ATTACHMENT',
      targetResource: 'ReceiptAttachment',
      targetResourceId: attachment.id,
      ipAddress,
      details: {
        fileName: attachment.fileName,
        claimNumber: attachment.claim?.claimNumber || 'UNLINKED_DRAFT',
      },
    });

    // 3. Stream binary response with strict security headers
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);

    return res.status(200).send(decryptedBuffer);
  }

  /**
   * Secure decrypted file download
   */
  @Get(':id/download')
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Res() res: Response,
    @ClientIp() ipAddress: string,
  ) {
    const attachment = await this.prisma.receiptAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException(`Receipt attachment with ID '${id}' not found.`);
    }

    const isOwner = attachment.userId === currentUser.id;
    const isPrivilegedOfficer = [
      UserRole.CLAIM_OFFICER,
      UserRole.FINANCE_MANAGER,
      UserRole.SECURITY_AUDITOR,
      UserRole.SYSTEM_ADMIN,
    ].includes(currentUser.role);

    if (!isOwner && !isPrivilegedOfficer) {
      throw new ForbiddenException('You are not authorized to download this receipt attachment.');
    }

    const decryptedBuffer = await this.storageService.retrieveAndDecrypt(
      attachment.storageKey,
      attachment.encryptedDek!,
      attachment.checksum,
    );

    await this.auditService.log({
      actorId: currentUser.id,
      action: 'DOWNLOAD_RECEIPT_ATTACHMENT',
      targetResource: 'ReceiptAttachment',
      targetResourceId: attachment.id,
      ipAddress,
      details: {
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
      },
    });

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);

    return res.status(200).send(decryptedBuffer);
  }

  /**
   * Delete an unlinked attachment draft
   */
  @Delete(':id')
  async deleteAttachment(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @ClientIp() ipAddress: string,
  ) {
    const attachment = await this.prisma.receiptAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.userId !== currentUser.id && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Cannot delete an attachment belonging to another user');
    }

    if (attachment.claimId) {
      throw new BadRequestException('Cannot delete an attachment that is already bound to a submitted claim');
    }

    // Delete stored ciphertext
    await this.storageService.deleteStoredFile(attachment.storageKey);

    // Delete DB record
    await this.prisma.receiptAttachment.delete({ where: { id } });

    await this.auditService.log({
      actorId: currentUser.id,
      action: 'DELETE_RECEIPT_ATTACHMENT',
      targetResource: 'ReceiptAttachment',
      targetResourceId: id,
      ipAddress,
    });

    return { message: 'Attachment deleted successfully' };
  }
}
