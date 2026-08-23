import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(loginSchema) {}

// Formato de saída de POST /auth/login — o cookie de sessão vai no
// header Set-Cookie, o corpo só devolve a identidade do usuário.
export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});

export class AuthUserDto extends createZodDto(authUserSchema) {}
