import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(port);
  logger.log(`🚀 HealthClaim Pro Backend running at: http://localhost:${port}/${apiPrefix.replace(/^\//, '')}`);
}

bootstrap();
