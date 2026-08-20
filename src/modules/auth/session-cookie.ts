import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'sid';

export function buildSessionCookieOptions(
  maxAgeMs: number,
  secure: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: maxAgeMs,
  };
}
