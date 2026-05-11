import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Category, Impact, Severity, TicketType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Título del ticket',
    example: 'Servidor caído - URGENTE',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción del ticket',
    example: 'El servidor de producción principal dejó de responder...',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: Severity, example: 'CRITICAL' })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ enum: TicketType, example: 'CORRECTIVE' })
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @ApiPropertyOptional({ enum: Impact, example: 'HIGH' })
  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @ApiPropertyOptional({ enum: Category, example: 'PRODUCTION' })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional({
    description: 'UUID del usuario asignado',
    example: 'a49997dd-8066-4da1-a493-91efc65763a0',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;
}