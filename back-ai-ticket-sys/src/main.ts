import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Ticket API')
    .setDescription('Documentation and testing interface for the Ticket API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();