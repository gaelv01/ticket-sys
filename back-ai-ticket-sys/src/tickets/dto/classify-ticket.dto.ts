import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ClassifyTicketDto {
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
}