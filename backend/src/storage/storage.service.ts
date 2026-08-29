import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';

export interface EncryptionResult {
  storageKey: string;
  encryptedDek: string;
  iv: string;
  authTag: string;
  checksum: string;
  magicHeader: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageDir: string;
  private readonly masterKey: Buffer;
  private readonly magicHeader = 'HC_ENC';

  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private isS3Available = false;

  constructor() {
    this.storageDir = path.resolve(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // Derive or load master key (32 bytes for AES-256-KW / KEK)
    const secret =
      process.env.MASTER_ENCRYPTION_KEY ||
      'healthclaim-pro-enterprise-zero-trust-master-key-2026';
    this.masterKey = crypto.createHash('sha256').update(secret).digest();

    this.bucketName = process.env.S3_BUCKET_NAME || 'healthclaim-receipts';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY || 'minioadmin';
    const secretAccessKey = process.env.S3_SECRET_KEY || 'minioadmin';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.initS3Bucket();
  }

  /**
   * Initializes and ensures S3 / MinIO bucket exists
   */
  async initS3Bucket(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.isS3Available = true;
      this.logger.log(`Connected to S3 / MinIO bucket '${this.bucketName}' successfully.`);
    } catch (err: any) {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.isS3Available = true;
        this.logger.log(`Created S3 / MinIO bucket '${this.bucketName}' successfully.`);
      } catch (createErr: any) {
        this.logger.warn(
          `MinIO S3 bucket initialization notice: ${createErr.message}. Local storage fallback active.`,
        );
        this.isS3Available = false;
      }
    }
  }

  /**
   * Validate authentic file signatures (Magic Bytes) against spoofing
   */
  validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF: %PDF- (0x25 0x50 0x44 0x46)
    if (mimeType === 'application/pdf') {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    // PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47)
    if (mimeType === 'image/png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    }

    // JPEG / JPG: \xFF\xD8\xFF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // WebP: RIFF....WEBP
    if (mimeType === 'image/webp') {
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer.toString('utf8', 8, 12) === 'WEBP'
      );
    }

    return false;
  }

  /**
   * Encrypt file buffer using Dual-Key Envelope Encryption (AES-256-GCM + KEK)
   * Formats into a custom binary framed envelope and pushes to MinIO / S3 bucket:
   * [ 6B "HC_ENC" ] [ 1B version 0x01 ] [ 12B IV ] [ 16B AuthTag ] [ Ciphertext ]
   */
  async encryptAndStore(
    buffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<EncryptionResult> {
    if (!this.validateMagicBytes(buffer, mimeType)) {
      throw new BadRequestException(
        `File magic byte signature does not match declared MIME type '${mimeType}'. Potential file tampering or polyglot detected.`,
      );
    }

    // 1. Calculate SHA-256 integrity checksum over original plain bytes
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Generate cryptographically random one-time Data Encryption Key (DEK) and IV
    const dek = crypto.randomBytes(32); // AES-256 key
    const iv = crypto.randomBytes(12);  // GCM recommended 96-bit IV

    // 3. Encrypt payload with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes authentication tag

    // 4. Encrypt DEK with Master KEK (Key Encryption Key)
    const kekIv = crypto.randomBytes(12);
    const kekCipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, kekIv);
    const encryptedDekPayload = Buffer.concat([kekCipher.update(dek), kekCipher.final()]);
    const kekAuthTag = kekCipher.getAuthTag();

    // Composite encrypted DEK envelope string: kekIv:kekAuthTag:encryptedDek
    const encryptedDek = `${kekIv.toString('hex')}:${kekAuthTag.toString('hex')}:${encryptedDekPayload.toString('hex')}`;

    // 5. Build binary framed envelope
    const headerBuffer = Buffer.from(this.magicHeader, 'utf8');
    const versionBuffer = Buffer.from([0x01]);
    const envelopeBuffer = Buffer.concat([
      headerBuffer,
      versionBuffer,
      iv,
      authTag,
      ciphertext,
    ]);

    // 6. Write to S3 / MinIO Object Storage (and mirror local backup)
    const datePrefix = new Date().toISOString().split('T')[0];
    const uniqueKey = `${datePrefix}-${crypto.randomBytes(16).toString('hex')}.enc`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: uniqueKey,
          Body: envelopeBuffer,
          ContentType: 'application/octet-stream',
          Metadata: {
            'original-filename': encodeURIComponent(originalFileName),
            'checksum-sha256': checksum,
            'encrypted-algorithm': 'AES-256-GCM',
          },
        }),
      );
      this.logger.log(
        `Securely pushed encrypted receipt '${originalFileName}' [${buffer.length}B] -> MinIO Bucket '${this.bucketName}/${uniqueKey}'`,
      );
    } catch (s3Err: any) {
      this.logger.warn(`MinIO S3 upload failed (${s3Err.message}). Writing to local storage directory fallback.`);
      const fullPath = path.join(this.storageDir, uniqueKey);
      await fs.promises.writeFile(fullPath, envelopeBuffer);
    }

    return {
      storageKey: uniqueKey,
      encryptedDek,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      checksum,
      magicHeader: this.magicHeader,
    };
  }

  /**
   * Decrypt file payload on the fly in memory with integrity & GCM Auth Tag verification
   */
  async retrieveAndDecrypt(
    storageKey: string,
    encryptedDekString: string,
    expectedChecksum?: string,
  ): Promise<Buffer> {
    let envelopeBuffer: Buffer;

    // 1. Fetch ciphertext envelope from MinIO S3 (or fallback to local disk)
    try {
      const s3Response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );
      const byteArray = await s3Response.Body?.transformToByteArray();
      if (!byteArray) throw new Error('Empty S3 response stream');
      envelopeBuffer = Buffer.from(byteArray);
    } catch (s3Err: any) {
      const fullPath = path.join(this.storageDir, storageKey);
      if (fs.existsSync(fullPath)) {
        envelopeBuffer = await fs.promises.readFile(fullPath);
      } else {
        throw new BadRequestException(`Encrypted storage object '${storageKey}' not found in S3 or local disk.`);
      }
    }

    // 2. Validate envelope magic header
    const headerLength = 6;
    const magic = envelopeBuffer.subarray(0, headerLength).toString('utf8');
    if (magic !== this.magicHeader) {
      throw new InternalServerErrorException('Corrupted encryption envelope: invalid magic header.');
    }

    const version = envelopeBuffer[6];
    if (version !== 0x01) {
      throw new InternalServerErrorException(`Unsupported envelope encryption version: ${version}`);
    }

    const iv = envelopeBuffer.subarray(7, 19);
    const authTag = envelopeBuffer.subarray(19, 35);
    const ciphertext = envelopeBuffer.subarray(35);

    // 3. Decrypt DEK using Master KEK
    const [kekIvHex, kekAuthTagHex, encryptedDekHex] = encryptedDekString.split(':');
    if (!kekIvHex || !kekAuthTagHex || !encryptedDekHex) {
      throw new InternalServerErrorException('Malformed encrypted DEK envelope metadata.');
    }

    const kekIv = Buffer.from(kekIvHex, 'hex');
    const kekAuthTag = Buffer.from(kekAuthTagHex, 'hex');
    const encryptedDekPayload = Buffer.from(encryptedDekHex, 'hex');

    const kekDecipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, kekIv);
    kekDecipher.setAuthTag(kekAuthTag);
    const dek = Buffer.concat([kekDecipher.update(encryptedDekPayload), kekDecipher.final()]);

    // 4. Decrypt ciphertext using DEK
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(authTag);
    const plainBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // 5. Verify integrity checksum if provided
    if (expectedChecksum) {
      const computedChecksum = crypto.createHash('sha256').update(plainBuffer).digest('hex');
      if (computedChecksum !== expectedChecksum) {
        throw new InternalServerErrorException(
          'Integrity verification failed: decrypted payload SHA-256 checksum mismatch.',
        );
      }
    }

    return plainBuffer;
  }

  /**
   * Delete stored encrypted envelope from MinIO S3 and local storage
   */
  async deleteStoredFile(storageKey: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Could not delete from S3 bucket: ${err.message}`);
    }

    const fullPath = path.join(this.storageDir, storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }
}
