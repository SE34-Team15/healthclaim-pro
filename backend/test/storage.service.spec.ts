import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from '../src/storage/storage.service';
import * as fs from 'fs';

describe('StorageService (Dual-Key Envelope Encryption & Magic Byte Verification)', () => {
  let service: StorageService;
  const createdKeys: string[] = [];

  beforeEach(() => {
    service = new StorageService();
  });

  afterEach(async () => {
    for (const key of createdKeys) {
      await service.deleteStoredFile(key).catch(() => {});
    }
  });

  it('should accurately validate authentic PNG magic bytes', () => {
    // Valid PNG signature: \x89PNG\r\n\x1a\n
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(service.validateMagicBytes(validPng, 'image/png')).toBe(true);

    // Fake PNG (e.g. text file renamed to .png)
    const fakePng = Buffer.from('this is just a text file');
    expect(service.validateMagicBytes(fakePng, 'image/png')).toBe(false);
  });

  it('should accurately validate authentic PDF magic bytes', () => {
    // Valid PDF signature: %PDF-
    const validPdf = Buffer.from('%PDF-1.7 standard header');
    expect(service.validateMagicBytes(validPdf, 'application/pdf')).toBe(true);

    const fakePdf = Buffer.from('fake pdf stream');
    expect(service.validateMagicBytes(fakePdf, 'application/pdf')).toBe(false);
  });

  it('should encrypt, frame into binary envelope, and decrypt payload cleanly with SHA-256 match', async () => {
    const rawContent = '%PDF-1.5 \n Medical Invoice for Consultation \n Amount: $180.00 \n Clinic: Parkway';
    const plainBuffer = Buffer.from(rawContent, 'utf8');

    // 1. Encrypt and store
    const result = await service.encryptAndStore(plainBuffer, 'invoice_180.pdf', 'application/pdf');
    createdKeys.push(result.storageKey);

    expect(result.storageKey).toBeDefined();
    expect(result.storageKey.endsWith('.enc')).toBe(true);
    expect(result.magicHeader).toBe('HC_ENC');
    expect(result.checksum).toBeDefined();
    expect(result.encryptedDek).toBeDefined();

    // 2. Retrieve and decrypt in memory
    const decryptedBuffer = await service.retrieveAndDecrypt(
      result.storageKey,
      result.encryptedDek,
      result.checksum,
    );

    expect(decryptedBuffer.toString('utf8')).toBe(rawContent);
  });

  it('should reject tampered or corrupted ciphertext during decryption', async () => {
    const rawContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xaa, 0xbb]);
    const result = await service.encryptAndStore(rawContent, 'test.png', 'image/png');
    createdKeys.push(result.storageKey);

    // Wrong encryptedDek (tampered KEK)
    await expect(
      service.retrieveAndDecrypt(result.storageKey, 'bad:kek:data', result.checksum),
    ).rejects.toThrow();
  });
});
