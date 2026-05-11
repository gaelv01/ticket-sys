import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    INestApplication,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request = require('supertest');
import { Category, Impact, Role, Severity, TicketType } from '@prisma/client';
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const authorization = req.headers.authorization as string | undefined;

        if (!authorization) {
            throw new UnauthorizedException('Token requerido');
        }

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

describe('Tickets endpoint edge cases', () => {
    let app: INestApplication;
    const missingAssigneeUuid = '00000000-0000-4000-8000-000000000001';
    const missingTicketUuid = '00000000-0000-4000-8000-000000000099';

    const ticketsServiceMock = {
        classify: jest.fn(async () => ({
            severity: Severity.CRITICAL,
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
            confidence: 0.94,
        })),
        create: jest.fn(async (dto: { assignedToId?: string }) => {
            if (dto.assignedToId === missingAssigneeUuid) {
                throw new BadRequestException('El usuario asignado no existe');
            }

            return {
                uuid: '99999999-9999-4999-9999-999999999999',
            };
        }),
        findById: jest.fn(async (uuid: string) => {
            if (uuid === missingTicketUuid) {
                throw new NotFoundException('Ticket no encontrado');
            }

            return {
                uuid,
            };
        }),
    };

    beforeAll(async () => {
        const moduleBuilder = Test.createTestingModule({
            controllers: [TicketsController],
            providers: [
                { provide: TicketsService, useValue: ticketsServiceMock },
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

    beforeEach(() => {
        ticketsServiceMock.classify.mockClear();
        ticketsServiceMock.create.mockClear();
        ticketsServiceMock.findById.mockClear();
    });

    it('rejects classify without token', async () => {
        await request(app.getHttpServer())
            .post('/api/tickets/classify')
            .send({
                title: 'Servidor caído',
                description: 'El servidor de producción no responde desde hace minutos',
            })
            .expect(401);
    });

    it.each([
        ['missing description', { title: 'Servidor caído' }],
        ['short title', {
            title: 'ab',
            description: 'El servidor de producción no responde desde hace minutos',
        }],
        ['extra field', {
            title: 'Servidor caído',
            description: 'El servidor de producción no responde desde hace minutos',
            priority: 'high',
        }],
    ])('rejects classify with %s', async (_name, payload) => {
        await request(app.getHttpServer())
            .post('/api/tickets/classify')
            .set('Authorization', 'Bearer test-token')
            .send(payload)
            .expect(400);

        expect(ticketsServiceMock.classify).not.toHaveBeenCalled();
    });

    it.each([
        ['missing severity', {
            title: 'Servidor caído',
            description: 'El servidor de producción principal dejó de responder.',
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
        }],
        ['invalid enum value', {
            title: 'Servidor caído',
            description: 'El servidor de producción principal dejó de responder.',
            severity: 'EXTREME',
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
        }],
        ['aiConfidence out of range', {
            title: 'Servidor caído',
            description: 'El servidor de producción principal dejó de responder.',
            severity: Severity.CRITICAL,
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
            aiConfidence: 1.5,
        }],
        ['assignedToId with invalid format', {
            title: 'Servidor caído',
            description: 'El servidor de producción principal dejó de responder.',
            severity: Severity.CRITICAL,
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
            assignedToId: 'not-a-uuid',
        }],
        ['extra field', {
            title: 'Servidor caído',
            description: 'El servidor de producción principal dejó de responder.',
            severity: Severity.CRITICAL,
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
            assignedToId: 'a49997dd-8066-4da1-a493-91efc65763a0',
            unexpected: true,
        }],
    ])('rejects create with %s', async (_name, payload) => {
        await request(app.getHttpServer())
            .post('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .send(payload)
            .expect(400);

        expect(ticketsServiceMock.create).not.toHaveBeenCalled();
    });

    it('returns 400 when the assignee does not exist', async () => {
        await request(app.getHttpServer())
            .post('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .send({
                title: 'Servidor caído',
                description: 'El servidor de producción principal dejó de responder.',
                severity: Severity.CRITICAL,
                type: TicketType.CORRECTIVE,
                impact: Impact.HIGH,
                category: Category.PRODUCTION,
                assignedToId: missingAssigneeUuid,
            })
            .expect(400);
    });

    it('rejects malformed ticket UUIDs', async () => {
        await request(app.getHttpServer())
            .get('/api/tickets/not-a-uuid')
            .set('Authorization', 'Bearer test-token')
            .expect(400);
    });

    it('returns 404 for a non-existent ticket', async () => {
        await request(app.getHttpServer())
            .get(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .expect(404);
    });
});