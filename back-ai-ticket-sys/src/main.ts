import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // elimina props no declaradas en el DTO
      forbidNonWhitelisted: true, // lanza error si vienen props extra
      transform: true,            // transforma payloads a instancias del DTO
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();