import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByUuid(uuid: string) {
    return this.prisma.user.findUnique({ where: { uuid } });
  }

  // Para poblar dropdowns - solo retorna campos públicos
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        uuid: true,
        username: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    });
  }
}