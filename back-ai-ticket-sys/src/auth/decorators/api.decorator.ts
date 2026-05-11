import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export const ApiAuth = (() => {
    return applyDecorators(
        ApiResponse({ status: 200, description: 'Acceso permitido solo para ADMIN' }),
        ApiResponse({ status: 401, description: 'Acceso denegado' }),
        ApiResponse({ status: 403, description: 'No tienes permisos para acceder' }),
        ApiResponse({ status: 500, description: 'Error interno del servidor' })
    );
})