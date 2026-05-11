# Sistema de Tickets con Clasificación por IA

Un sistema completo de gestión de tickets potenciado por inteligencia artificial que clasifica automáticamente incidencias y proporciona una interfaz intuitiva para su gestión.

## 📋 Descripción del Proyecto

Este es un sistema full-stack diseñado para gestionar tickets de incidencias (helpdesk) de forma eficiente. El sistema utiliza **múltiples modelos de IA** para clasificar automáticamente los tickets entrantes según su severidad, categoría, tipo e impacto, mejorando significativamente el flujo de trabajo y asignación de recursos.

### Características Principales

- 🤖 **Clasificación Automática por IA**: Utiliza un sistema en cadena (Gemini → Groq → Reglas)
- 🔐 **Autenticación Segura**: Basada en JWT con roles de usuario
- 📊 **Gestión de Tickets**: CRUD completo con estado, prioridad e impacto
- 💬 **Sistema de Comentarios**: Permite discusiones y seguimiento de tickets
- 📝 **Eventos Auditables**: Registra todos los cambios en los tickets
- 🌐 **API RESTful**: Backend profesional con NestJS
- 💻 **Interfaz Moderna**: Frontend con Next.js y Tailwind CSS

---

## 🏗️ Arquitectura del Proyecto

```
ticket-sys/
├── back-ai-ticket-sys/          # Backend - NestJS + PostgreSQL
│   ├── src/
│   │   ├── ai/                  # Módulo de clasificación por IA
│   │   │   ├── classifiers/     # Gemini, Groq, Rule-based
│   │   │   ├── prompts/         # Templates de prompts para IA
│   │   │   └── utils/           # Validadores de respuestas
│   │   ├── auth/                # Autenticación JWT
│   │   ├── tickets/             # Gestión de tickets
│   │   ├── users/               # Gestión de usuarios
│   │   └── prisma/              # ORM Prisma
│   ├── prisma/
│   │   ├── schema.prisma        # Esquema de base de datos
│   │   └── migrations/          # Historial de migraciones
│   └── package.json
│
├── front-ai-ticket-sys/         # Frontend - Next.js + React
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/           # Página de login
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   └── tickets/         # Gestión de tickets
│   │   └── lib/
│   │       ├── api.ts           # Cliente HTTP
│   │       ├── auth.ts          # Lógica de autenticación
│   │       └── ticket-labels.ts # Utilidades de tickets
│   └── package.json
│
└── docker-compose.yml           # Configuración de servicios (PostgreSQL)
```

---

## 🗄️ Modelo de Datos

### Usuarios (`User`)
```
- uuid: Identificador único
- username: Nombre de usuario único
- password: Contraseña encriptada (bcrypt)
- role: ADMIN | CLIENTE
- createdAt / updatedAt: Timestamps
```

### Tickets (`Ticket`)
```
- uuid: Identificador único
- title: Título del ticket
- description: Descripción detallada
- severity: CRITICAL | HIGH | MEDIUM | LOW
- type: CORRECTIVE | PREVENTIVE
- impact: HIGH | MEDIUM | LOW
- category: PRODUCTION | TECHNICAL | ADMINISTRATIVE | INFRASTRUCTURE | OTHER
- status: OPEN | IN_PROGRESS | RESOLVED | CLOSED | REOPENED
- createdBy: Usuario que creó el ticket
- assignedTo: Usuario asignado (opcional)
```

### Eventos de Ticket (`TicketEvent`)
Registra todos los eventos que ocurren en un ticket:
- TICKET_CREATED
- AI_CLASSIFIED
- ASSIGNED / UNASSIGNED
- STATUS_CHANGED
- COMMENT_ADDED
- EDITED

### Comentarios (`TicketComment`)
```
- content: Contenido del comentario
- author: Usuario que escribió el comentario
- authorType: USER | AI | SYSTEM
- createdAt: Timestamp del comentario
```

---

## 🤖 Sistema de Clasificación por IA

El backend implementa un **sistema de clasificación en cadena** que intenta múltiples modelos de IA en orden:

### 1️⃣ **Gemini (Google)**
- Modelo: `gemini-2.0-flash`
- Proveedor: Google Generative AI
- Ventajas: Muy rápido, preciso
- Requiere: Variable de entorno `GEMINI_API_KEY`

### 2️⃣ **Groq**
- Modelo: `mixtral-8x7b-32768`
- Proveedor: Groq Cloud
- Ventajas: Muy rápido, alternativa a Gemini
- Requiere: Variable de entorno `GROQ_API_KEY`

### 3️⃣ **Rule-Based (Reglas)**
- Lógica: Sistema de reglas predefinidas
- Ventajas: Siempre disponible, sin dependencias externas
- Fallback: Se usa si los modelos de IA fallan

### Flujo de Clasificación
```
Entrada: { title, description }
    ↓
Intenta Gemini → ¿Disponible y funciona?
    ├─ Sí ✓ → Retorna clasificación
    └─ No ✗ → Continúa
    ↓
Intenta Groq → ¿Disponible y funciona?
    ├─ Sí ✓ → Retorna clasificación
    └─ No ✗ → Continúa
    ↓
Utiliza Rule-Based → Siempre retorna clasificación
```

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+
- Docker y Docker Compose
- NPM o Yarn
- API Keys (opcional para IA):
  - `GEMINI_API_KEY`: Clave de Google Gemini
  - `GROQ_API_KEY`: Clave de Groq

### 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone <repo-url>
cd ticket-sys

# Crear archivo .env en la raíz
cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/incidencias"
JWT_SECRET="your-secret-key-change-in-production"
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
EOF
```

### 2. Iniciar Servicios (Backend + Base de Datos)

```bash
# Iniciar PostgreSQL con Docker Compose
docker-compose up -d

# Navegar al backend
cd back-ai-ticket-sys

# Instalar dependencias
npm install

# Aplicar migraciones de base de datos
npx prisma migrate deploy

# Iniciar servidor de desarrollo
npm run start:dev

# El backend estará disponible en http://localhost:3000
```

### 3. Iniciar Frontend

```bash
# En otra terminal, navegar al frontend
cd front-ai-ticket-sys

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# El frontend estará disponible en http://localhost:3001
```

---

## 🔑 Autenticación

### Flujo de Autenticación

1. **Login**: El usuario envía `username` y `password`
2. **Validación**: El servidor verifica las credenciales
3. **Token JWT**: Se genera un token JWT con 24 horas de validez
4. **Almacenamiento**: El token se guarda en localStorage del navegador
5. **Uso**: Cada petición incluye el token en el header `Authorization`

### Roles y Permisos

- **ADMIN**: Acceso completo, puede asignar tickets
- **CLIENTE**: Puede crear tickets y ver sus propios tickets

### Crear Usuario Inicial

```bash
# En la base de datos o mediante la API
POST /auth/register
{
  "username": "admin",
  "password": "password123",
  "role": "ADMIN"
}
```

---

## 📡 API Endpoints Principales

### Autenticación
```
POST   /auth/register         - Crear usuario
POST   /auth/login            - Obtener token JWT
```

### Usuarios
```
GET    /users                 - Listar usuarios
GET    /users/:id             - Obtener usuario
PUT    /users/:id             - Actualizar usuario
```

### Tickets
```
GET    /tickets               - Listar tickets (con filtros)
GET    /tickets/:id           - Obtener ticket
POST   /tickets               - Crear ticket (con clasificación automática)
PUT    /tickets/:id           - Actualizar ticket
PATCH  /tickets/:id/status    - Cambiar estado
```

### Comentarios
```
POST   /tickets/:id/comments  - Añadir comentario
GET    /tickets/:id/comments  - Listar comentarios
```

### Clasificación Manual
```
POST   /tickets/:id/classify  - Reclasificar ticket con IA
```

---

## 💻 Funcionalidades del Frontend

### 🔐 Página de Login
- Autenticación de usuarios
- Manejo de errores
- Redirección a dashboard tras login exitoso

### 📊 Dashboard
- Vista general de tickets
- Filtros por estado, severidad, categoría
- Búsqueda de tickets
- Estadísticas rápidas

### 🎫 Gestión de Tickets
- **Crear Ticket**: Formulario con clasificación automática por IA
- **Editar Ticket**: Actualizar información
- **Cambiar Estado**: OPEN → IN_PROGRESS → RESOLVED → CLOSED
- **Ver Detalles**: Información completa incluyendo eventos y comentarios

### 💬 Comentarios
- Añadir comentarios a tickets
- Ver historial de comentarios
- Identificar comentarios automáticos de IA

---

## 🛠️ Desarrollo

### Estructura del Código Backend (NestJS)

```typescript
// app.module.ts - Módulo principal
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    AiModule,
  ],
})
export class AppModule {}
```

### DTOs (Data Transfer Objects)

Los DTOs validan y transforman datos de entrada:

```typescript
// create-ticket.dto.ts
export class CreateTicketDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(Severity)
  severity: Severity;

  @IsEnum(TicketType)
  type: TicketType;

  @IsEnum(Impact)
  impact: Impact;

  @IsEnum(Category)
  category: Category;
}
```

### Decoradores Personalizados

```typescript
// Obtener usuario actual
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Proteger rutas por rol
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('admin-only')
adminOnly() {
  return 'Solo admin';
}
```

---

## 🧪 Testing

### Backend

```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

### Frontend

```bash
# Linting
npm run lint
```

---

## 📦 Dependencias Principales

### Backend
- **@nestjs/core**: Framework principal
- **@prisma/client**: ORM para base de datos
- **@nestjs/jwt**: Autenticación JWT
- **@google/generative-ai**: Integración Gemini
- **groq-sdk**: Integración Groq
- **bcrypt**: Encriptación de contraseñas

### Frontend
- **next**: Framework React
- **react-hook-form**: Gestión de formularios
- **axios**: Cliente HTTP
- **tailwindcss**: Estilos CSS
- **lucide-react**: Iconos

---

## 🐛 Troubleshooting

### La base de datos no conecta
```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres

# Reiniciar servicios
docker-compose restart
```

### Los clasificadores de IA no funcionan
```bash
# Verificar variables de entorno en .env
# Asegurarse que GEMINI_API_KEY o GROQ_API_KEY son válidas

# El sistema caerá a reglas si no hay claves o fallan
# Revisar logs del backend para ver qué falla
```

### Token JWT expirado
- Se genera un nuevo token con cada login
- El token expira en 24 horas
- Implementar refresh token en mejoras futuras

---

## 📈 Mejoras Futuras

- [ ] Sistema de refresh tokens
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Exportar tickets a PDF/Excel
- [ ] Dashboard con gráficos de estadísticas
- [ ] Asignación automática de tickets
- [ ] Sistema de escalado de tickets
- [ ] Integración con correo electrónico
- [ ] API pública para integraciones

---

## 📄 Licencia

Este proyecto está bajo licencia UNLICENSED.

---

## 👨‍💻 Autor

Proyecto desarrollado como sistema de gestión de incidencias potenciado por IA.

---

## 📞 Soporte

Para reportar problemas o sugerencias:
1. Revisar la documentación del backend y frontend
2. Consultar logs en `docker-compose logs`
3. Verificar variables de entorno en `.env`

---

