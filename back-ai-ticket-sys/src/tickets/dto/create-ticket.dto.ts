import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Category, Impact, Severity, TicketType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Título breve del incidente',
    example: 'Servidor principal caído en producción',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del problema',
    example: 'El servidor de producción principal dejó de responder...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: Severity, example: 'CRITICAL' })
  @IsEnum(Severity)
  severity: Severity;

  @ApiProperty({ enum: TicketType, example: 'CORRECTIVE' })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiProperty({ enum: Impact, example: 'HIGH' })
  @IsEnum(Impact)
  impact: Impact;

  @ApiProperty({ enum: Category, example: 'PRODUCTION' })
  @IsEnum(Category)
  category: Category;

  @ApiPropertyOptional({
    description: 'UUID del usuario asignado',
    example: 'a49997dd-8066-4da1-a493-91efc65763a0',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  // Trazabilidad: el front manda lo que sugirió la IA originalmente
  @ApiPropertyOptional({
    description: 'Indica si el ticket fue sugerido por IA',
    example: true,
  })
  @IsOptional()
  aiSuggested?: boolean;

  @ApiPropertyOptional({
    description: 'Confianza de la IA entre 0 y 1',
    example: 0.94,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @ApiPropertyOptional({
    description: 'Payload original sugerido por la IA',
    example: {
      severity: 'CRITICAL',
      type: 'CORRECTIVE',
      impact: 'HIGH',
      category: 'PRODUCTION',
    },
  })
  @IsOptional()
  aiPayload?: Record<string, unknown>;
}