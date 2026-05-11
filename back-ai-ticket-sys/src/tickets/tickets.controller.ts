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
import { TicketsService } from './tickets.service';
import { ClassifyTicketDto } from './dto/classify-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Sugerencia de clasificación por IA (no guarda nada todavía)
  @Post('classify')
  @HttpCode(HttpStatus.OK)
  classify(@Body() dto: ClassifyTicketDto) {
    return this.ticketsService.classify(dto);
  }

  // Crear el ticket definitivo (ya con clasificación posiblemente editada)
  @Post()
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ticketsService.create(dto, user.uuid);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.ticketsService.findById(uuid);
  }
}