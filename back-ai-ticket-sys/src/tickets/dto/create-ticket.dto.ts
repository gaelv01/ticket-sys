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

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsEnum(Severity)
  severity: Severity;

  @IsEnum(TicketType)
  type: TicketType;

  @IsEnum(Impact)
  impact: Impact;

  @IsEnum(Category)
  category: Category;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  // Trazabilidad: el front manda lo que sugirió la IA originalmente
  @IsOptional()
  aiSuggested?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @IsOptional()
  aiPayload?: Record<string, unknown>;
}