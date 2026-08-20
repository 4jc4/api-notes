import { Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.schema.js';
import { SessionService } from './session.service.js';

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { token, expiresAt } = await this.sessionService.create(user.id);

    return { token, expiresAt, user: { id: user.id, email: user.email } };
  }

  async logout(token: string): Promise<void> {
    await this.sessionService.revoke(token);
  }
}
