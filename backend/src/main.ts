import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
