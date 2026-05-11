import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { ClassifyTicketDto } from './dto/classify-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // OJO: rutas específicas ANTES que `:uuid`, si no Nest las matchea como UUID

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  classify(@Body() dto: ClassifyTicketDto) {
    return this.ticketsService.classify(dto);
  }

  @Get('metrics/dashboard')
  getDashboardMetrics() {
    return this.ticketsService.getDashboardMetrics();
  }

  @Get()
  findAll(@Query() filters: ListTicketsDto) {
    return this.ticketsService.findAll(filters);
  }

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

  @Patch(':uuid')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ticketsService.update(uuid, dto, user.uuid);
  }

  @Patch(':uuid/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  changeStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ticketsService.changeStatus(uuid, dto, user.uuid);
  }

  @Post(':uuid/comments')
  @HttpCode(HttpStatus.CREATED)
  addComment(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ticketsService.addComment(uuid, dto, user.uuid);
  }
}