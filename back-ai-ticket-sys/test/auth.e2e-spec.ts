import {
    CanActivate,
    ExecutionContext,
    INestApplication,
    Injectable,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request = require('supertest');
import { Role } from '@prisma/client';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
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

        if (authorization === 'Bearer admin-token') {
            req.user = {
                uuid: '11111111-1111-1111-1111-111111111111',
                username: 'admin',
                role: Role.ADMIN,
            };
            return true;
        }

        if (authorization === 'Bearer client-token') {
            req.user = {
                uuid: '22222222-2222-2222-2222-222222222222',
                username: 'client',
                role: Role.CLIENTE,
            };
            return true;
        }

        throw new UnauthorizedException('Token inválido');
    }
}

describe('Auth endpoint edge cases', () => {
    let app: INestApplication;
    const authServiceMock = {
        login: jest.fn(async (loginDto: { username: string; password: string }) => {
            if (loginDto.username === 'wrong-user') {
                throw new UnauthorizedException('Credenciales inválidas');
            }

            return {
                access_token: 'test-token',
                user: {
                    uuid: '22222222-2222-2222-2222-222222222222',
                    username: loginDto.username,
                    role: Role.CLIENTE,
                },
            };
        }),
    };

    beforeAll(async () => {
        const moduleBuilder = Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                RolesGuard,
                Reflector,
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
        authServiceMock.login.mockClear();
    });

    it.each([
        ['missing username', { password: 'secret123' }],
        ['missing password', { username: 'user' }],
        ['short password', { username: 'user', password: '123' }],
        ['wrong type username', { username: 123, password: 'secret123' }],
        ['extra field', { username: 'user', password: 'secret123', role: 'ADMIN' }],
    ])('rejects login with %s', async (_name, payload) => {
        await request(app.getHttpServer())
            .post('/api/auth/login')
            .send(payload)
            .expect(400);

        expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid credentials', async () => {
        await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ username: 'wrong-user', password: 'secret123' })
            .expect(401);
    });

    it('rejects profile without token', async () => {
        await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('rejects admin-only access for a non-admin user', async () => {
        await request(app.getHttpServer())
            .get('/api/auth/admin-only')
            .set('Authorization', 'Bearer client-token')
            .expect(403);
    });
});