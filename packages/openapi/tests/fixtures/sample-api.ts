import 'reflect-metadata';
import { Controller } from '@nl-framework/core';
import { Get, Post, Param, Query, Body, Version } from '@nl-framework/http';
import {
  IsString,
  IsInt,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  Length,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiExcludeEndpoint } from '../../src';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export class AddressDto {
  @IsString()
  street!: string;

  @IsString()
  @IsOptional()
  zip?: string;
}

export class CreateUserDto {
  @IsString()
  @Length(2, 50)
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  age?: number;

  @IsEnum(UserRole)
  role!: UserRole;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UserDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() dto: CreateUserDto): UserDto {
    return { id: 'x', name: dto.name };
  }

  @Get(':id')
  findOne(@Param('id') id: string): UserDto {
    return { id, name: 'test' };
  }

  @Get()
  @Version('2')
  list(@Query('limit') limit: number): UserDto {
    return { id: String(limit), name: 'test' };
  }
}

@Controller('admin')
export class AdminController {
  @Get('secret')
  @ApiSecurity('bearer')
  @ApiResponse(403, { description: 'Forbidden' })
  @ApiOperation({ summary: 'Admin only', deprecated: true })
  secret(): UserDto {
    return { id: 'admin', name: 'admin' };
  }

  @Get('hidden')
  @ApiExcludeEndpoint()
  hidden(): UserDto {
    return { id: 'hidden', name: 'hidden' };
  }
}
