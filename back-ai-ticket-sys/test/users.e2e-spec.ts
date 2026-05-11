import {
    CanActivate,
    ExecutionContext,
    INestApplication,
    Injectable,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request = require('supertest');
import { Role } from '@prisma/client';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
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

describe('Users endpoint edge cases', () => {
    let app: INestApplication;
    const usersServiceMock = {
        findAll: jest.fn(async () => []),
    };

    beforeAll(async () => {
        const moduleBuilder = Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                { provide: UsersService, useValue: usersServiceMock },
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
        usersServiceMock.findAll.mockClear();
    });

    it('rejects access without token', async () => {
        await request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('rejects malformed bearer token', async () => {
        await request(app.getHttpServer())
            .get('/api/users')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401);
    });

    it('returns an empty list when there are no users', async () => {
        await request(app.getHttpServer())
            .get('/api/users')
            .set('Authorization', 'Bearer test-token')
            .expect(200)
            .expect([]);

        expect(usersServiceMock.findAll).toHaveBeenCalledTimes(1);
    });
});