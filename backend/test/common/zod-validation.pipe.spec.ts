import { describe, it, expect } from 'vitest';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    email: z.string().email(),
    amount: z.number().positive(),
  });

  const pipe = new ZodValidationPipe(schema);

  it('should successfully pass valid data through schema', () => {
    const validData = { email: 'user@example.com', amount: 150 };
    const result = pipe.transform(validData, {} as any);
    expect(result).toEqual(validData);
  });

  it('should throw BadRequestException with detailed error list on validation error', () => {
    const invalidData = { email: 'not-an-email', amount: -10 };

    try {
      pipe.transform(invalidData, {} as any);
      expect.fail('Should have thrown BadRequestException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = err.getResponse();
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
      expect(response.errors.length).toBeGreaterThan(0);
    }
  });

  it('should throw BadRequestException if non-Zod error occurs', () => {
    const brokenSchema: any = {
      parse: () => {
        throw new Error('Custom parsing error');
      },
    };
    const brokenPipe = new ZodValidationPipe(brokenSchema);

    expect(() => brokenPipe.transform({}, {} as any)).toThrow(BadRequestException);
  });
});
