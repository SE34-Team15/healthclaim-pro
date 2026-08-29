import { describe, it, expect } from 'vitest';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('should instantiate cleanly', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });
});
