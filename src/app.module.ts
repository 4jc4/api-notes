import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { validateEnv } from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    NotesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    // Serializa respostas de rotas marcadas com @ZodResponse/@ZodSerializerDto
    // segundo o schema Zod de saída — necessário para @ZodResponse
    // funcionar em runtime (ver docs OpenAPI da nestjs-zod).
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
