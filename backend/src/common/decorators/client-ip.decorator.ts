import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Robust Client IP Extraction for Cloudflare Edge -> AWS ALB -> AWS ECS topologies.
 *
 * Header Priority Resolution:
 * 1. 'cf-connecting-ip': Tamper-proof visitor IP injected directly by Cloudflare edge proxy.
 * 2. 'true-client-ip': Enterprise Cloudflare header.
 * 3. 'x-forwarded-for': First IP in the comma-separated proxy chain from AWS ALB / proxies.
 * 4. 'x-real-ip': Ingress / reverse-proxy header fallback.
 * 5. req.ip: Express req.ip (with trust proxy enabled).
 * 6. req.socket.remoteAddress: TCP socket address fallback.
 */
export function extractClientIp(req: Request): string {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare CF-Connecting-IP (Highest Priority)
  const cfConnectingIp = req.headers?.['cf-connecting-ip'];
  if (cfConnectingIp) {
    const ip = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    if (ip && typeof ip === 'string' && ip.trim()) {
      return sanitizeIp(ip);
    }
  }

  // 2. Cloudflare True-Client-IP
  const trueClientIp = req.headers?.['true-client-ip'];
  if (trueClientIp) {
    const ip = Array.isArray(trueClientIp) ? trueClientIp[0] : trueClientIp;
    if (ip && typeof ip === 'string' && ip.trim()) {
      return sanitizeIp(ip);
    }
  }

  // 3. X-Forwarded-For header (e.g. "203.0.113.195, 70.41.3.18, 150.172.238.178")
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const rawIps = Array.isArray(xForwardedFor) ? xForwardedFor.join(',') : xForwardedFor;
    const firstIp = rawIps.split(',')[0];
    if (firstIp && firstIp.trim()) {
      return sanitizeIp(firstIp);
    }
  }

  // 4. X-Real-IP
  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) {
    const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (ip && typeof ip === 'string' && ip.trim()) {
      return sanitizeIp(ip);
    }
  }

  // 5. Express req.ip
  if (req.ip) {
    return sanitizeIp(req.ip);
  }

  // 6. TCP Socket remote address
  if (req.socket?.remoteAddress) {
    return sanitizeIp(req.socket.remoteAddress);
  }

  return '127.0.0.1';
}

/**
 * Sanitize IP address string:
 * - Strips leading/trailing whitespace
 * - Strips IPv6-mapped IPv4 prefix ("::ffff:")
 * - Strips accidental attached ports (e.g. "198.51.100.1:443" -> "198.51.100.1")
 */
export function sanitizeIp(rawIp: string): string {
  let ip = rawIp.trim();

  // Strip IPv6-mapped IPv4 prefix
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Strip port if formatted as IPv4:PORT
  if (/^(\d{1,3}\.){3}\d{1,3}:\d+$/.test(ip)) {
    ip = ip.split(':')[0];
  }

  return ip;
}

/**
 * Custom NestJS Parameter Decorator for extracting real visitor IP
 * Usage in Controllers:
 * `@Post('login') async login(@ClientIp() ipAddress: string) { ... }`
 */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return extractClientIp(request);
  },
);
