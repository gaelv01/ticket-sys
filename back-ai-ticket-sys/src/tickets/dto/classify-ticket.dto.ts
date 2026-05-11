import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClassifyTicketDto {
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
    description: 'Descripción detallada del problema a clasificar',
    example: 'El servidor de producción principal dejó de responder a las 08:42. Los logs indican un fallo en el proceso de base de datos.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;
}