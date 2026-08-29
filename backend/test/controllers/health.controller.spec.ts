import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '../../src/health/health.controller';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  it('should return 200 and status healthy when DB is connected', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    } as any;

    const controller = new HealthController(mockPrisma);

    const jsonMock = vi.fn();
    const resMock = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as any;

    await controller.checkHealth(resMock);

    expect(resMock.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        database: 'connected',
      }),
    );
  });

  it('should return 503 when DB connection fails', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as any;

    const controller = new HealthController(mockPrisma);

    const jsonMock = vi.fn();
    const resMock = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as any;

    await controller.checkHealth(resMock);

    expect(resMock.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        database: 'disconnected',
        error: 'Connection refused',
      }),
    );
  });
});
