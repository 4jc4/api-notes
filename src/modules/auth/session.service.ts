import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { parseDurationMs } from '../../common/utils/duration.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface SessionUser {
  sub: string;
  email: string;
}

interface CreatedSession {
  token: string;
  expiresAt: Date;
}

const TOKEN_BYTES = 32;

@Injectable()
export class SessionService {
  private readonly secret: string;
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('SESSION_SECRET', { infer: true });
    this.ttlMs = parseDurationMs(config.get('SESSION_TTL', { infer: true }));
  }

  get ttl(): number {
    return this.ttlMs;
  }

  private hash(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('hex');
  }

  async create(userId: string): Promise<CreatedSession> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.prisma.session.create({
      data: { tokenHash: this.hash(token), userId, expiresAt },
    });

    return { token, expiresAt };
  }

  async validate(token: string): Promise<SessionUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return { sub: session.user.id, email: session.user.email };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hash(token) },
    });
  }
}
