import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { ClassifyTicketDto } from './dto/classify-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ApiAuth } from '../auth/decorators/api.decorator';

@ApiTags('tickets')
@ApiAuth()
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  // Sugerencia de clasificación por IA (no guarda nada todavía)
  @Post('classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sugerir clasificación por IA' })
  @ApiBody({
    description: 'Datos mínimos para que la IA sugiera una clasificación del ticket',
    type: ClassifyTicketDto,
    examples: {
      ticketBase: {
        summary: 'Ejemplo de clasificación sugerida por IA',
        value: {
          title: 'Servidor principal caído en producción',
          description: 'El servidor de producción principal dejó de responder a las 08:42. Los logs indican un fallo en el proceso de base de datos.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Sugerencia de clasificación por IA' })
  classify(@Body() dto: ClassifyTicketDto) {
    return this.ticketsService.classify(dto);
  }

  // Crear el ticket definitivo (ya con clasificación posiblemente editada)
  @Post()
  @ApiOperation({ summary: 'Crear un ticket' })
  @ApiBody({
    description: 'Datos requeridos para crear un ticket',
    type: CreateTicketDto,
    examples: {
      incidenteEnProduccion: {
        summary: 'Ejemplo completo de un ticket de producción',
        value: {
          title: 'Servidor principal caído en producción',
          description: 'El servidor de producción principal dejó de responder...',
          severity: 'CRITICAL',
          type: 'CORRECTIVE',
          impact: 'HIGH',
          category: 'PRODUCTION',
          assignedToId: 'a49997dd-8066-4da1-a493-91efc65763a0',
          aiSuggested: true,
          aiConfidence: 0.94,
          aiPayload: {
            severity: 'CRITICAL',
            type: 'CORRECTIVE',
            impact: 'HIGH',
            category: 'PRODUCTION',
          },
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Ticket creado correctamente' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ticketsService.create(dto, user.uuid);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Obtener un ticket por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID del ticket', type: String })
  @ApiOkResponse({
    description: 'Ticket encontrado',
    schema: {
      example: {
        uuid: 'c819497c-c0df-4b30-9840-5fb82bdd117e',
        title: 'Servidor principal caído en producción',
        description: 'El servidor de producción principal dejó de responder...',
        severity: 'CRITICAL',
        type: 'CORRECTIVE',
        impact: 'HIGH',
        category: 'PRODUCTION',
        status: 'OPEN',
        createdById: 'a49997dd-8066-4da1-a493-91efc65763a0',
        assignedToId: 'a49997dd-8066-4da1-a493-91efc65763a0',
        aiSuggested: true,
        aiConfidence: 0.94,
        aiPayload: {
          type: 'CORRECTIVE',
          impact: 'HIGH',
          category: 'PRODUCTION',
          severity: 'CRITICAL'
        },
        createdAt: '2026-05-11T06:52:49.618Z',
        updatedAt: '2026-05-11T06:52:49.618Z',
        createdBy: {
          uuid: 'a49997dd-8066-4da1-a493-91efc65763a0',
          username: 'Ctest',
          role: 'CLIENTE'
        },
        assignedTo: {
          uuid: 'a49997dd-8066-4da1-a493-91efc65763a0',
          username: 'Ctest',
          role: 'CLIENTE'
        }
      }
    }
  })
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.ticketsService.findById(uuid);
  }
}