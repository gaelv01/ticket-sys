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
import { GeminiClassifier } from '../src/ai/classifiers/gemini.classifier';
import { GroqClassifier } from '../src/ai/classifiers/groq.classifier';
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
    const http = () => request(app.getHttpServer());

    const classify = (payload: { title: string; description: string }) =>
        http()
            .post('/api/tickets/classify')
            .set('Authorization', 'Bearer test-token')
            .send(payload);

    const assertRuleBasedClassification = async (
        payload: { title: string; description: string },
        expected: {
            severity: string;
            type: string;
            impact: string;
            category: string;
        },
    ) => {
        const response = await classify(payload).expect(200);

        expect(response.body.provider).toBe('rule-based');
        expect(response.body.severity).toBe(expected.severity);
        expect(response.body.type).toBe(expected.type);
        expect(response.body.impact).toBe(expected.impact);
        expect(response.body.category).toBe(expected.category);
        expect(response.body.confidence).toBeGreaterThanOrEqual(0.4);
        expect(response.body.confidence).toBeLessThanOrEqual(0.85);
    };

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

        moduleBuilder
            .overrideProvider(GeminiClassifier)
            .useValue({
                name: 'gemini',
                isAvailable: () => false,
                classify: async () => {
                    throw new Error('Gemini deshabilitado en este test');
                },
            })
            .overrideProvider(GroqClassifier)
            .useValue({
                name: 'groq',
                isAvailable: () => false,
                classify: async () => {
                    throw new Error('Groq deshabilitado en este test');
                },
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

    it('rejects classify without token', async () => {
        await http()
            .post('/api/tickets/classify')
            .send({
                title: 'Servidor principal caído en producción',
                description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            })
            .expect(401);
    });

    it.each([
        ['missing description', { title: 'Servidor caído' }],
        ['short title', {
            title: 'ab',
            description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
        }],
        ['extra field', {
            title: 'Servidor principal caído en producción',
            description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            priority: 'high',
        }],
        ['invalid token', {
            title: 'Servidor principal caído en producción',
            description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            token: 'wrong-token',
        }],
    ])('rejects classify with %s', async (_name, payload) => {
        const requestBuilder = http().post('/api/tickets/classify');

        if ('token' in payload && payload.token) {
            await requestBuilder
                .set('Authorization', 'Bearer wrong-token')
                .send({
                    title: payload.title,
                    description: payload.description,
                })
                .expect(401);

            return;
        }

        const body = {
            ...(payload as Record<string, unknown>),
        };

        await requestBuilder
            .set('Authorization', 'Bearer test-token')
            .send(body)
            .expect(400);
    });

    it('uses the rule-based classifier when API keys are missing', async () => {
        await assertRuleBasedClassification(
            {
                title: 'Servidor principal caído en producción',
                description: 'El servidor de producción principal dejó de responder y el equipo no puede acceder al servicio.',
            },
            {
                severity: 'CRITICAL',
                type: 'CORRECTIVE',
                impact: 'HIGH',
                category: 'PRODUCTION',
            },
        );
    });

    it.each([
        [
            'intermittent multi-user incident',
            {
                title: 'Servicio con comportamiento intermitente',
                description: 'El servicio presenta comportamiento intermitente en el área de soporte y afecta varios usuarios.',
            },
            {
                severity: 'MEDIUM',
                type: 'PREVENTIVE',
                impact: 'MEDIUM',
                category: 'ADMINISTRATIVE',
            },
        ],
        [
            'administrative access request',
            {
                title: 'Solicitud de licencia para nuevo usuario',
                description: 'Necesito habilitar acceso para un colaborador nuevo que empieza esta semana.',
            },
            {
                severity: 'LOW',
                type: 'PREVENTIVE',
                impact: 'LOW',
                category: 'ADMINISTRATIVE',
            },
        ],
        [
            'infrastructure issue',
            {
                title: 'Problemas de red en sucursal',
                description: 'La red de la sucursal presenta fallas y la VPN está inestable de forma constante.',
            },
            {
                severity: 'HIGH',
                type: 'CORRECTIVE',
                impact: 'LOW',
                category: 'INFRASTRUCTURE',
            },
        ],
    ])('classifies %s correctly without API keys', async (_name, payload, expected) => {
        await assertRuleBasedClassification(payload, expected);
    });

});