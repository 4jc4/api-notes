import { z } from 'zod';

const durationRegex = /^\d+[smhd]$/;

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET deve ter pelo menos 32 caracteres'),
  SESSION_TTL: z.string().regex(durationRegex).default('7d'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}
