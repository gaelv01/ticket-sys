import {
    CanActivate,
    ExecutionContext,
    INestApplication,
    Injectable,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Role } from '@prisma/client';
import request = require('supertest');
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AiModule } from '../src/ai/ai.module';
import { PrismaService } from '../src/prisma/prisma.service';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const authorization = req.headers.authorization as string | undefined;

        if (authorization !== 'Bearer test-token') {
            throw new UnauthorizedException('Token inválido');
        }

        req.user = {
            uuid: '22222222-2222-2222-2222-222222222222',
            username: 'client',
            role: Role.CLIENTE,
        };

        return true;
    }
}

describe('Tickets classify fallback edge case', () => {
    let app: INestApplication;
    const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
    const itWhenAiKey = hasAiKey ? it : it.skip;

    beforeAll(async () => {
        const moduleBuilder = Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
            controllers: [TicketsController],
            providers: [
                TicketsService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        });

        const moduleFixture: TestingModule = await moduleBuilder
            .overrideGuard(JwtAuthGuard)
            .useClass(TestJwtAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('does not fall back to rule-based classification when API keys are missing', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/tickets/classify')
            .set('Authorization', 'Bearer test-token')
            .send({
                title: 'Servidor principal caído en producción',
                description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            })
            .expect(200);

        expect(response.body.provider).toMatch(/gemini|groq/i);
        expect(response.body.confidence).toBeGreaterThanOrEqual(0.9);
    });

    itWhenAiKey('uses the configured AI provider when keys are available', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/tickets/classify')
            .set('Authorization', 'Bearer test-token')
            .send({
                title: 'Servidor principal caído en producción',
                description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            })
            .expect(200);

        expect(response.body.provider).toMatch(/gemini|groq/i);
        expect(response.body.confidence).toBeGreaterThanOrEqual(0.9);
    });
});