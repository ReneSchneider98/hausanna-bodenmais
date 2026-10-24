import { Body, Controller, Get, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { type Login, loginSchema, type User } from '@hausanna/shared';
import { ENV, type Env } from '../../../config/env.js';
import { CurrentUser, Public, type SessionUser } from '../../../common/auth.decorators.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { AuthService } from '../application/auth.service.js';
import { SESSION_COOKIE, SESSION_HOURS } from '../domain/session-token.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(loginSchema)) body: Login,
    @Res({ passthrough: true }) res: Response,
  ): Promise<User> {
    const { token, user } = await this.auth.login(body.email, body.password);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.env.NODE_ENV === 'production',
      maxAge: SESSION_HOURS * 3600_000,
      path: '/',
    });
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Post('logout-everywhere')
  @HttpCode(204)
  async logoutEverywhere(
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutEverywhere(user.id);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): Promise<User> {
    return this.auth.me(user.id);
  }
}
