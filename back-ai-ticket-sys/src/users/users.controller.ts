import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiAuth } from '../auth/decorators/api.decorator';

@ApiTags('users')
@ApiAuth()
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiOkResponse({
    description: 'Listado de usuarios',
    schema: {
      example: [
        { uuid: 'a49997dd-8066-4da1-a493-91efc65763a0', username: 'admin', role: 'ADMIN' },
        { uuid: 'b19997dd-8066-4da1-a493-91efc65763a1', username: 'cliente1', role: 'CLIENTE' },
      ],
    },
  })
  findAll() {
    return this.usersService.findAll();
  }
}