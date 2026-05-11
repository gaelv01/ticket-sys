import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ClassifyTicketDto } from './dto/classify-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { logTicketEvent } from './tickets.events';

const userBrief = {
  select: { uuid: true, username: true, role: true },
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  // ====== AI classification ======
  async classify(dto: ClassifyTicketDto) {
    return this.aiService.classify(dto.title, dto.description);
  }

  // ====== Create ======
  async create(dto: CreateTicketDto, createdById: string) {
    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { uuid: dto.assignedToId },
      });
      if (!assignee) {
        throw new BadRequestException('El usuario asignado no existe');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
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
          aiPayload: dto.aiPayload as Prisma.InputJsonValue,
        },
        include: { createdBy: userBrief, assignedTo: userBrief },
      });

      // Evento: creación
      await logTicketEvent({
        tx,
        ticketId: ticket.uuid,
        actorId: createdById,
        eventType: 'TICKET_CREATED',
        payload: { title: ticket.title, severity: ticket.severity },
      });

      // Evento: clasificación por IA (si aplica)
      if (dto.aiSuggested && dto.aiPayload) {
        await logTicketEvent({
          tx,
          ticketId: ticket.uuid,
          actorId: null,
          eventType: 'AI_CLASSIFIED',
          payload: dto.aiPayload,
        });
      }

      // Evento: asignación (si aplica desde el inicio)
      if (dto.assignedToId) {
        await logTicketEvent({
          tx,
          ticketId: ticket.uuid,
          actorId: createdById,
          eventType: 'ASSIGNED',
          payload: { assignedToId: dto.assignedToId },
        });
      }

      return ticket;
    });
  }

  // ====== List with filters and pagination ======
  async findAll(filters: ListTicketsDto) {
    const {
      search,
      status,
      severity,
      type,
      category,
      impact,
      assignedToId,
      page = 1,
      limit = 10,
    } = filters;

    const where: Prisma.TicketWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (category) where.category = category;
    if (impact) where.impact = impact;
    if (assignedToId) where.assignedToId = assignedToId;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: userBrief, assignedTo: userBrief },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ====== Detail with comments and history ======
  async findById(uuid: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { uuid },
      include: {
        createdBy: userBrief,
        assignedTo: userBrief,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: userBrief },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: { actor: userBrief },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  // ====== Update fields ======
  async update(uuid: string, dto: UpdateTicketDto, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { uuid } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    // Detectar reasignación
    const reassigning =
      dto.assignedToId !== undefined && dto.assignedToId !== ticket.assignedToId;

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { uuid: dto.assignedToId },
      });
      if (!assignee) throw new BadRequestException('Usuario asignado no existe');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { uuid },
        data: dto,
        include: { createdBy: userBrief, assignedTo: userBrief },
      });

      // Evento: edición de campos
      await logTicketEvent({
        tx,
        ticketId: uuid,
        actorId,
        eventType: 'EDITED',
        payload: { changes: dto },
      });

      // Evento adicional: cambio de asignación
      if (reassigning) {
        await logTicketEvent({
          tx,
          ticketId: uuid,
          actorId,
          eventType: dto.assignedToId ? 'ASSIGNED' : 'UNASSIGNED',
          payload: {
            from: ticket.assignedToId,
            to: dto.assignedToId,
          },
        });
      }

      return updated;
    });
  }

  // ====== Change status ======
  async changeStatus(uuid: string, dto: UpdateStatusDto, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { uuid } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    if (ticket.status === dto.status) {
      throw new BadRequestException(`El ticket ya está en estado ${dto.status}`);
    }

    if (!this.isValidTransition(ticket.status, dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${ticket.status} → ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { uuid },
        data: { status: dto.status },
        include: { createdBy: userBrief, assignedTo: userBrief },
      });

      await logTicketEvent({
        tx,
        ticketId: uuid,
        actorId,
        eventType: 'STATUS_CHANGED',
        payload: { from: ticket.status, to: dto.status },
      });

      return updated;
    });
  }

  private isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
    const transitions: Record<TicketStatus, TicketStatus[]> = {
      OPEN: ['IN_PROGRESS', 'CLOSED'],
      IN_PROGRESS: ['RESOLVED', 'OPEN'],
      RESOLVED: ['CLOSED', 'REOPENED'],
      CLOSED: ['REOPENED'],
      REOPENED: ['IN_PROGRESS'],
    };
    return transitions[from]?.includes(to) ?? false;
  }

  // ====== Comments ======
  async addComment(ticketId: string, dto: CreateCommentDto, authorId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { uuid: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId,
          authorId,
          authorType: 'USER',
          content: dto.content,
        },
        include: { author: userBrief },
      });

      await logTicketEvent({
        tx,
        ticketId,
        actorId: authorId,
        eventType: 'COMMENT_ADDED',
        payload: { commentId: comment.uuid },
      });

      return comment;
    });
  }

  // ====== Dashboard metrics ======
  async getDashboardMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      openCount,
      criticalCount,
      resolvedCount,
      createdTodayCount,
      resolvedTodayCount,
      criticalTodayCount,
      byCategory,
      resolvedTickets,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'REOPENED'] } },
      }),
      this.prisma.ticket.count({
        where: { severity: 'CRITICAL', status: { not: 'CLOSED' } },
      }),
      this.prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.ticket.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.ticket.count({
        where: { status: 'RESOLVED', updatedAt: { gte: startOfToday } },
      }),
      this.prisma.ticket.count({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        _count: { uuid: true },
      }),
      this.prisma.ticket.findMany({
        where: { status: 'RESOLVED' },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    // Tiempo promedio de resolución en minutos
    const avgMs =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce(
            (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
            0,
          ) / resolvedTickets.length
        : 0;

    const totalForDistribution = byCategory.reduce(
      (s, c) => s + c._count.uuid,
      0,
    );

    return {
      counters: {
        open: { value: openCount, deltaToday: createdTodayCount },
        critical: { value: criticalCount, deltaToday: criticalTodayCount },
        resolved: { value: resolvedCount, deltaToday: resolvedTodayCount },
        avgResolutionMinutes: Math.round(avgMs / 60000),
      },
      categoryDistribution: byCategory.map((c) => ({
        category: c.category,
        count: c._count.uuid,
        percentage:
          totalForDistribution > 0
            ? Math.round((c._count.uuid / totalForDistribution) * 100)
            : 0,
      })),
    };
  }
}