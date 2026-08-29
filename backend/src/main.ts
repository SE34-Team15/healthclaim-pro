import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Static SPA Hosting for Production Unified Container
  const publicDir = path.resolve(__dirname, '..', 'public');
  if (fs.existsSync(publicDir)) {
    logger.log(`Serving frontend static assets from: ${publicDir}`);
    app.use(express.static(publicDir));
    app.use((req: any, res: any, next: any) => {
      const normalizedPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
      if (req.method === 'GET' && !req.url.startsWith(normalizedPrefix)) {
        res.sendFile(path.join(publicDir, 'index.html'));
      } else {
        next();
      }
    });
  }

  await app.listen(port);
  logger.log(`HealthClaim Pro Unified Server running at: http://localhost:${port}`);
}

bootstrap();
