import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE_NAME } from './session-cookie.js';
import { SessionService, type SessionUser } from './session.service.js';

export type RequestWithUser = Request & { user: SessionUser };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies as Record<string, string> | undefined;
    const sessionToken = token?.[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw new UnauthorizedException('Missing session cookie');
    }

    const user = await this.sessionService.validate(sessionToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as RequestWithUser).user = user;
    return true;
  }
}
