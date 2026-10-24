import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  type CreateUser,
  createUserSchema,
  type UpdateUser,
  updateUserSchema,
  type User,
} from '@hausanna/shared';
import { CurrentUser, Roles, type SessionUser } from '../../../common/auth.decorators.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { AuthService } from '../application/auth.service.js';

@Controller('admin/users')
@Roles('admin')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  list(): Promise<User[]> {
    return this.auth.listUsers();
  }

  @Post()
  create(
    @Body(new ZodPipe(createUserSchema)) body: CreateUser,
    @CurrentUser() by: SessionUser,
  ): Promise<User> {
    return this.auth.createUser(body, by);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateUserSchema)) body: UpdateUser,
    @CurrentUser() by: SessionUser,
  ): Promise<User> {
    return this.auth.updateUser(id, body, by);
  }
}
