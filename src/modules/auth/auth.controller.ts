import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.schema.js';
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
} from './session-cookie.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ id: string; email: string }> {
    const { token, expiresAt, user } = await this.authService.login(dto);

    res.cookie(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions(
        expiresAt.getTime() - Date.now(),
        this.isSecure(),
      ),
    );

    return user;
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE_NAME
    ];

    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  private isSecure(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
