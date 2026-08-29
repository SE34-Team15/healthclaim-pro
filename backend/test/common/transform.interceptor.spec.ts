import { describe, it, expect, vi } from 'vitest';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  it('should wrap response data in standardized ApiResponse format', async () => {
    const interceptor = new TransformInterceptor();
    const context: any = {};
    const callHandler: any = {
      handle: () => of({ claimId: '123', status: 'SUBMITTED' }),
    };

    const observable = interceptor.intercept(context, callHandler);

    await new Promise<void>((resolve) => {
      observable.subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ claimId: '123', status: 'SUBMITTED' });
        expect(result.timestamp).toBeDefined();
        resolve();
      });
    });
  });
});
