import { describe, it, expect } from 'vitest';
import { extractClientIp, sanitizeIp } from '../../src/common/decorators/client-ip.decorator';

describe('Client IP Extraction (Cloudflare -> AWS ALB -> AWS ECS Topology)', () => {
  it('should prioritize CF-Connecting-IP over other headers', () => {
    const mockReq: any = {
      headers: {
        'cf-connecting-ip': '203.0.113.195',
        'true-client-ip': '198.51.100.22',
        'x-forwarded-for': '10.0.1.50, 172.31.0.1',
        'x-real-ip': '10.0.1.50',
      },
      ip: '10.0.1.50',
      socket: { remoteAddress: '10.0.1.50' },
    };

    expect(extractClientIp(mockReq)).toBe('203.0.113.195');
  });

  it('should use True-Client-IP if CF-Connecting-IP is absent', () => {
    const mockReq: any = {
      headers: {
        'true-client-ip': '198.51.100.77',
        'x-forwarded-for': '10.0.1.50, 172.31.0.1',
      },
    };

    expect(extractClientIp(mockReq)).toBe('198.51.100.77');
  });

  it('should extract the first client IP from multi-hop X-Forwarded-For if CF headers are absent', () => {
    const mockReq: any = {
      headers: {
        'x-forwarded-for': '192.0.2.146, 203.0.113.195, 10.0.0.1',
      },
    };

    expect(extractClientIp(mockReq)).toBe('192.0.2.146');
  });

  it('should use X-Real-IP if X-Forwarded-For is absent', () => {
    const mockReq: any = {
      headers: {
        'x-real-ip': '198.51.100.99',
      },
    };

    expect(extractClientIp(mockReq)).toBe('198.51.100.99');
  });

  it('should fall back to req.ip and socket.remoteAddress', () => {
    const mockReq1: any = {
      headers: {},
      ip: '172.16.0.4',
    };
    expect(extractClientIp(mockReq1)).toBe('172.16.0.4');

    const mockReq2: any = {
      headers: {},
      socket: { remoteAddress: '10.200.0.15' },
    };
    expect(extractClientIp(mockReq2)).toBe('10.200.0.15');

    const mockReq3: any = null;
    expect(extractClientIp(mockReq3)).toBe('127.0.0.1');
  });

  it('should sanitize IPv6-mapped IPv4 addresses (::ffff:x.x.x.x)', () => {
    expect(sanitizeIp('::ffff:198.51.100.12')).toBe('198.51.100.12');
    expect(sanitizeIp('  ::ffff:203.0.113.1  ')).toBe('203.0.113.1');
  });

  it('should sanitize accidental port suffixes from IP headers', () => {
    expect(sanitizeIp('198.51.100.1:54321')).toBe('198.51.100.1');
  });
});
