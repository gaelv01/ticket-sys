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
import { Category, Impact, Role, Severity, TicketStatus, TicketType } from '@prisma/client';
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

@Injectable()
class TestJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const authorization = req.headers.authorization as string | undefined;

        if (!authorization) {
            throw new UnauthorizedException('Token requerido');
        }

        if (authorization === 'Bearer test-token') {
            req.user = {
                uuid: '22222222-2222-2222-2222-222222222222',
                username: 'client',
                role: Role.CLIENTE,
            };

            return true;
        }

        if (authorization === 'Bearer admin-token') {
            req.user = {
                uuid: '11111111-1111-1111-1111-111111111111',
                username: 'admin',
                role: Role.ADMIN,
            };

            return true;
        }

        throw new UnauthorizedException('Token inválido');
    }
}

describe('Tickets endpoint edge cases', () => {
    let app: INestApplication;
    const missingAssigneeUuid = '00000000-0000-4000-8000-000000000001';
    const missingTicketUuid = '00000000-0000-4000-8000-000000000099';
    const alreadyOpenTicketUuid = '00000000-0000-4000-8000-000000000002';

    const ticketsServiceMock = {
        classify: jest.fn(async () => ({
            severity: Severity.CRITICAL,
            type: TicketType.CORRECTIVE,
            impact: Impact.HIGH,
            category: Category.PRODUCTION,
            confidence: 0.94,
        })),
        findAll: jest.fn(async () => ({
            items: [],
            meta: {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            },
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
        update: jest.fn(async (uuid: string, dto: { assignedToId?: string | null }) => {
            if (uuid === missingTicketUuid) {
                throw new NotFoundException('Ticket no encontrado');
            }

            if (dto.assignedToId === missingAssigneeUuid) {
                throw new BadRequestException('Usuario asignado no existe');
            }

            return {
                uuid,
            };
        }),
        changeStatus: jest.fn(async (uuid: string, dto: { status: TicketStatus }) => {
            if (uuid === missingTicketUuid) {
                throw new NotFoundException('Ticket no encontrado');
            }

            if (uuid === alreadyOpenTicketUuid && dto.status === TicketStatus.OPEN) {
                throw new BadRequestException(`El ticket ya está en estado ${dto.status}`);
            }

            return {
                uuid,
            };
        }),
        addComment: jest.fn(async (uuid: string) => {
            if (uuid === missingTicketUuid) {
                throw new NotFoundException('Ticket no encontrado');
            }

            return {
                uuid: '88888888-8888-4888-8888-888888888888',
            };
        }),
        getDashboardMetrics: jest.fn(async () => ({
            counters: {
                open: { value: 1, deltaToday: 1 },
                critical: { value: 1, deltaToday: 1 },
                resolved: { value: 0, deltaToday: 0 },
                avgResolutionMinutes: 0,
            },
            categoryDistribution: [
                {
                    category: Category.PRODUCTION,
                    count: 1,
                    percentage: 100,
                },
            ],
        })),
    };

    beforeAll(async () => {
        const moduleBuilder = Test.createTestingModule({
            controllers: [TicketsController],
            providers: [
                { provide: TicketsService, useValue: ticketsServiceMock },
                RolesGuard,
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
        ticketsServiceMock.findAll.mockClear();
        ticketsServiceMock.create.mockClear();
        ticketsServiceMock.findById.mockClear();
        ticketsServiceMock.update.mockClear();
        ticketsServiceMock.changeStatus.mockClear();
        ticketsServiceMock.addComment.mockClear();
        ticketsServiceMock.getDashboardMetrics.mockClear();
    });

    const validClassifyPayload = {
        title: 'Servidor caído',
        description: 'El servidor de producción no responde desde hace minutos',
    };

    const validCreatePayload = {
        title: 'Servidor caído',
        description: 'El servidor de producción principal dejó de responder.',
        severity: Severity.CRITICAL,
        type: TicketType.CORRECTIVE,
        impact: Impact.HIGH,
        category: Category.PRODUCTION,
    };

    const validUpdatePayload = {
        title: 'Servidor caído - URGENTE',
        severity: Severity.CRITICAL,
        type: TicketType.CORRECTIVE,
        impact: Impact.HIGH,
        category: Category.PRODUCTION,
    };

    const validCommentPayload = {
        content: 'Estoy revisando los logs del servidor.',
    };

    const http = () => request(app.getHttpServer());

    it('rejects classify without token', async () => {
        await http()
            .post('/api/tickets/classify')
            .send(validClassifyPayload)
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
        await http()
            .post('/api/tickets/classify')
            .set('Authorization', 'Bearer test-token')
            .send(payload)
            .expect(400);

        expect(ticketsServiceMock.classify).not.toHaveBeenCalled();
    });

    it('rejects dashboard metrics without token', async () => {
        await http()
            .get('/api/tickets/metrics/dashboard')
            .expect(401);
    });

    it('rejects list queries with invalid filters', async () => {
        await http()
            .get('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .query({ status: 'BROKEN' })
            .expect(400);

        await http()
            .get('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .query({ page: 0 })
            .expect(400);

        await http()
            .get('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .query({ extra: 'value' })
            .expect(400);

        expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
    });

    it('rejects create with invalid payloads', async () => {
        const invalidPayloads = [
            {
                payload: {
                    title: 'Servidor caído',
                    description: 'El servidor de producción principal dejó de responder.',
                    type: TicketType.CORRECTIVE,
                    impact: Impact.HIGH,
                    category: Category.PRODUCTION,
                },
            },
            {
                payload: {
                    title: 'Servidor caído',
                    description: 'El servidor de producción principal dejó de responder.',
                    severity: 'EXTREME',
                    type: TicketType.CORRECTIVE,
                    impact: Impact.HIGH,
                    category: Category.PRODUCTION,
                },
            },
            {
                payload: {
                    ...validCreatePayload,
                    aiConfidence: 1.5,
                },
            },
            {
                payload: {
                    ...validCreatePayload,
                    assignedToId: 'not-a-uuid',
                },
            },
            {
                payload: {
                    ...validCreatePayload,
                    assignedToId: 'a49997dd-8066-4da1-a493-91efc65763a0',
                    unexpected: true,
                },
            },
            {
                payload: {
                    ...validCreatePayload,
                    description: 'corta',
                },
            },
        ];

        for (const { payload } of invalidPayloads) {
            await http()
                .post('/api/tickets')
                .set('Authorization', 'Bearer test-token')
                .send(payload)
                .expect(400);
        }

        expect(ticketsServiceMock.create).not.toHaveBeenCalled();
    });

    it('returns 400 when the assignee does not exist', async () => {
        await http()
            .post('/api/tickets')
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validCreatePayload,
                assignedToId: missingAssigneeUuid,
            })
            .expect(400);
    });

    it('rejects malformed ticket UUIDs', async () => {
        await http()
            .get('/api/tickets/not-a-uuid')
            .set('Authorization', 'Bearer test-token')
            .expect(400);
    });

    it('returns 404 for a non-existent ticket', async () => {
        await http()
            .get(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .expect(404);
    });

    it('rejects update requests with invalid data', async () => {
        await http()
            .patch('/api/tickets/not-a-uuid')
            .set('Authorization', 'Bearer test-token')
            .send(validUpdatePayload)
            .expect(400);

        await http()
            .patch(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validUpdatePayload,
                severity: 'EXTREME',
            })
            .expect(400);

        await http()
            .patch(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validUpdatePayload,
                assignedToId: 'not-a-uuid',
            })
            .expect(400);

        await http()
            .patch(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validUpdatePayload,
                unexpected: true,
            })
            .expect(400);

        expect(ticketsServiceMock.update).not.toHaveBeenCalled();
    });

    it('returns 404 when updating a non-existent ticket', async () => {
        await http()
            .patch(`/api/tickets/${missingTicketUuid}`)
            .set('Authorization', 'Bearer test-token')
            .send(validUpdatePayload)
            .expect(404);
    });

    it('returns 400 when updating with a missing assignee', async () => {
        await http()
            .patch('/api/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validUpdatePayload,
                assignedToId: missingAssigneeUuid,
            })
            .expect(400);
    });

    it('rejects status changes for non-admin users', async () => {
        await http()
            .patch('/api/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/status')
            .set('Authorization', 'Bearer test-token')
            .send({ status: TicketStatus.IN_PROGRESS })
            .expect(403);
    });

    it('rejects status changes with invalid payloads', async () => {
        await http()
            .patch('/api/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/status')
            .set('Authorization', 'Bearer admin-token')
            .send({ status: 'BROKEN' })
            .expect(400);

        await http()
            .patch('/api/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/status')
            .set('Authorization', 'Bearer admin-token')
            .send({ unexpected: true })
            .expect(400);
    });

    it('returns 400 when the requested status matches the current one', async () => {
        await http()
            .patch(`/api/tickets/${alreadyOpenTicketUuid}/status`)
            .set('Authorization', 'Bearer admin-token')
            .send({ status: TicketStatus.OPEN })
            .expect(400);
    });

    it('rejects comment creation with invalid payloads', async () => {
        await http()
            .post('/api/tickets/not-a-uuid/comments')
            .set('Authorization', 'Bearer test-token')
            .send(validCommentPayload)
            .expect(400);

        await http()
            .post(`/api/tickets/${missingTicketUuid}/comments`)
            .set('Authorization', 'Bearer test-token')
            .send({ content: '' })
            .expect(400);

        await http()
            .post(`/api/tickets/${missingTicketUuid}/comments`)
            .set('Authorization', 'Bearer test-token')
            .send({
                ...validCommentPayload,
                extra: true,
            })
            .expect(400);

        expect(ticketsServiceMock.addComment).not.toHaveBeenCalled();
    });

    it('returns 404 when adding a comment to a missing ticket', async () => {
        await http()
            .post(`/api/tickets/${missingTicketUuid}/comments`)
            .set('Authorization', 'Bearer test-token')
            .send(validCommentPayload)
            .expect(404);
    });

    it('returns dashboard metrics with valid auth', async () => {
        await http()
            .get('/api/tickets/metrics/dashboard')
            .set('Authorization', 'Bearer test-token')
            .expect(200);
    });
});