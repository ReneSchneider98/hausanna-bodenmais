import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './application/auth.service.js';
import { UsersRepository } from './infrastructure/users.repository.js';
import { AuthController } from './presentation/auth.controller.js';
import { AuthGuard } from './presentation/auth.guard.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [AuthController, UsersController],
  providers: [UsersRepository, AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
