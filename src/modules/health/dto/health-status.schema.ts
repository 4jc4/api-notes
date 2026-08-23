import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Formato de saída de GET /health — espelha HealthStatus
// (src/modules/health/health.service.ts). Existe apenas para
// documentação OpenAPI e serialização de resposta via @ZodResponse.
export const healthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.iso.datetime(),
  uptime: z.number(),
  database: z.enum(['connected', 'disconnected']),
});

export class HealthStatusDto extends createZodDto(healthStatusSchema) {}
