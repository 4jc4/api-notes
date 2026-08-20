import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../../modules/auth/session-auth.guard.js';
import type { SessionUser } from '../../modules/auth/session.service.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
