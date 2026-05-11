import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ClassifyTicketDto } from './dto/classify-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async classify(dto: ClassifyTicketDto) {
    return this.aiService.classify(dto.title, dto.description);
  }

  async create(dto: CreateTicketDto, createdById: string) {
    // Si se asigna a alguien, validar que exista
    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { uuid: dto.assignedToId },
      });
      if (!assignee) {
        throw new BadRequestException('El usuario asignado no existe');
      }
    }

    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        type: dto.type,
        impact: dto.impact,
        category: dto.category,
        assignedToId: dto.assignedToId,
        createdById,
        aiSuggested: dto.aiSuggested ?? false,
        aiConfidence: dto.aiConfidence,
        aiPayload: dto.aiPayload as never,
      },
      include: {
        createdBy: { select: { uuid: true, username: true, role: true } },
        assignedTo: { select: { uuid: true, username: true, role: true } },
      },
    });
  }

  async findById(uuid: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { uuid },
      include: {
        createdBy: { select: { uuid: true, username: true, role: true } },
        assignedTo: { select: { uuid: true, username: true, role: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }
}