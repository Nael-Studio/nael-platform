import { PackageDocumentation } from '../../types.js';

export const authPackageDocs: PackageDocumentation = {
  name: '@nl-framework/auth',
  description: 'Complete authentication solution with Better Auth integration, supporting multiple strategies, OAuth, JWT, sessions, and role-based access control',
  version: '1.0.0',
  installation: 'bun add @nl-framework/auth better-auth',
  
  features: [
    {
      title: 'Multiple Auth Strategies',
      description: 'Email/password, OAuth (Google, GitHub, etc.), magic links, and more',
      icon: '🔐'
    },
    {
      title: 'JWT & Sessions',
      description: 'Support for both JWT tokens and session-based authentication',
      icon: '🎫'
    },
    {
      title: 'Role-Based Access Control',
      description: 'Built-in RBAC with guards and decorators',
      icon: '👥'
    },
    {
      title: 'OAuth Integration',
      description: 'Easy integration with Google, GitHub, Facebook, and more',
      icon: '🌐'
    },
    {
      title: 'Security Guards',
      description: 'Route guards for protecting endpoints',
      icon: '🛡️'
    },
    {
      title: 'Password Management',
      description: 'Secure password hashing, reset, and change functionality',
      icon: '🔑'
    }
  ],
  
  quickStart: {
    description: 'Set up authentication in your application',
    steps: [
      'Install dependencies: bun add @nl-framework/auth better-auth',
      'Register AuthModule in your app module',
      'Configure authentication strategies',
      'Protect routes with @UseGuards and AuthGuard',
      'Access user info with @CurrentUser decorator'
    ],
    code: `// app.module.ts
import { Module } from '@nl-framework/core';
import { AuthModule } from '@nl-framework/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: process.env.JWT_SECRET,
      strategies: ['local', 'jwt'],
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }
      }
    })
  ]
})
export class AppModule {}

// auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nl-framework/core';
import { AuthService, LocalAuthGuard, JwtAuthGuard, CurrentUser } from '@nl-framework/auth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: { email: string; password: string }) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}`
  },
  
  api: {
    decorators: [
      {
        name: '@UseGuards',
        signature: '@UseGuards(...guards: (Type<CanActivate> | Function)[])',
        description: 'Applies authentication/authorization guards to routes',
        package: '@nl-framework/auth',
        parameters: [
          {
            name: 'guards',
            type: 'Type<CanActivate>[]',
            description: 'Array of guard classes to apply',
            required: true
          }
        ],
        examples: [
          `@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: any) {
  return user;
}`,
          `@Post('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async adminAction() {
  // Only admins can access
}`
        ]
      },
      {
        name: '@CurrentUser',
        signature: '@CurrentUser()',
        description: 'Injects the current authenticated user into the route handler',
        package: '@nl-framework/auth',
        parameters: [],
        examples: [
          `@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}`,
          `@Post('posts')
@UseGuards(JwtAuthGuard)
async createPost(
  @Body() dto: CreatePostDto,
  @CurrentUser() user: User
) {
  return this.postService.create(dto, user.id);
}`
        ]
      },
      {
        name: '@Roles',
        signature: '@Roles(...roles: string[])',
        description: 'Specifies required roles for accessing a route',
        package: '@nl-framework/auth',
        parameters: [
          {
            name: 'roles',
            type: 'string[]',
            description: 'Array of role names required',
            required: true
          }
        ],
        examples: [
          `@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async adminPanel() {
  return 'Admin only';
}`,
          `@Post('moderate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
async moderate(@Body() dto: any) {
  // Admin or moderator can access
}`
        ]
      },
      {
        name: '@Public',
        signature: '@Public()',
        description: 'Marks a route as public (bypasses authentication guards)',
        package: '@nl-framework/auth',
        parameters: [],
        examples: [
          `@Get('health')
@Public()
async healthCheck() {
  return { status: 'ok' };
}`,
          `@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}`
        ]
      }
    ],
    
    classes: [
      {
        name: 'AuthModule',
        description: 'Module for configuring authentication and authorization',
        package: '@nl-framework/auth',
        constructor: {},
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options: AuthModuleOptions): DynamicModule',
            description: 'Register AuthModule with configuration',
            parameters: [
              {
                name: 'options',
                type: 'AuthModuleOptions',
                description: 'Authentication configuration'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `AuthModule.forRoot({
  secret: process.env.JWT_SECRET,
  strategies: ['local', 'jwt'],
  session: {
    enabled: true,
    secret: process.env.SESSION_SECRET
  }
})`,
          `AuthModule.forRoot({
  secret: process.env.JWT_SECRET,
  strategies: ['local', 'jwt', 'oauth'],
  jwt: {
    expiresIn: '7d',
    refreshExpiresIn: '30d'
  },
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  }
})`
        ]
      },
      {
        name: 'AuthService',
        description: 'Core service for authentication operations',
        package: '@nl-framework/auth',
        constructor: {},
        methods: [
          {
            name: 'register',
            signature: 'register(data: RegisterDto): Promise<User>',
            description: 'Register a new user',
            parameters: [
              {
                name: 'data',
                type: 'RegisterDto',
                description: 'Registration data (email, password, etc.)'
              }
            ],
            returns: 'Promise<User>'
          },
          {
            name: 'login',
            signature: 'login(user: User): Promise<{ accessToken: string; refreshToken?: string }>',
            description: 'Generate authentication tokens for a user',
            parameters: [
              {
                name: 'user',
                type: 'User',
                description: 'Authenticated user object'
              }
            ],
            returns: 'Promise<{ accessToken: string; refreshToken?: string }>'
          },
          {
            name: 'validateUser',
            signature: 'validateUser(email: string, password: string): Promise<User | null>',
            description: 'Validate user credentials',
            parameters: [
              {
                name: 'email',
                type: 'string',
                description: 'User email'
              },
              {
                name: 'password',
                type: 'string',
                description: 'User password'
              }
            ],
            returns: 'Promise<User | null>'
          },
          {
            name: 'refreshToken',
            signature: 'refreshToken(refreshToken: string): Promise<{ accessToken: string }>',
            description: 'Generate new access token from refresh token',
            parameters: [
              {
                name: 'refreshToken',
                type: 'string',
                description: 'Valid refresh token'
              }
            ],
            returns: 'Promise<{ accessToken: string }>'
          },
          {
            name: 'resetPassword',
            signature: 'resetPassword(token: string, newPassword: string): Promise<void>',
            description: 'Reset user password with token',
            parameters: [
              {
                name: 'token',
                type: 'string',
                description: 'Password reset token'
              },
              {
                name: 'newPassword',
                type: 'string',
                description: 'New password'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'sendPasswordResetEmail',
            signature: 'sendPasswordResetEmail(email: string): Promise<void>',
            description: 'Send password reset email to user',
            parameters: [
              {
                name: 'email',
                type: 'string',
                description: 'User email address'
              }
            ],
            returns: 'Promise<void>'
          }
        ],
        examples: [
          `const user = await authService.register({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'John Doe'
});`,
          `const tokens = await authService.login(user);
// { accessToken: '...', refreshToken: '...' }`,
          `const user = await authService.validateUser(
  'user@example.com',
  'password'
);`,
          `await authService.sendPasswordResetEmail('user@example.com');`
        ]
      },
      {
        name: 'JwtAuthGuard',
        description: 'Guard for JWT-based authentication',
        package: '@nl-framework/auth',
        constructor: {},
        methods: [],
        examples: [
          `@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}`
        ]
      },
      {
        name: 'LocalAuthGuard',
        description: 'Guard for local email/password authentication',
        package: '@nl-framework/auth',
        constructor: {},
        methods: [],
        examples: [
          `@Post('login')
@UseGuards(LocalAuthGuard)
async login(@CurrentUser() user: User) {
  return this.authService.login(user);
}`
        ]
      },
      {
        name: 'RolesGuard',
        description: 'Guard for role-based access control',
        package: '@nl-framework/auth',
        constructor: {},
        methods: [],
        examples: [
          `@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async adminPanel() {
  return 'Admin only';
}`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'AuthModuleOptions',
        description: 'Configuration options for AuthModule',
        package: '@nl-framework/auth',
        properties: [
          {
            name: 'secret',
            type: 'string',
            description: 'JWT secret key',
            required: true
          },
          {
            name: 'strategies',
            type: 'string[]',
            description: 'Enabled authentication strategies (local, jwt, oauth)',
            required: true
          },
          {
            name: 'jwt',
            type: 'JwtOptions',
            description: 'JWT configuration options',
            required: false
          },
          {
            name: 'session',
            type: 'SessionOptions',
            description: 'Session configuration options',
            required: false
          },
          {
            name: 'providers',
            type: 'OAuthProviders',
            description: 'OAuth provider configurations',
            required: false
          },
          {
            name: 'passwordPolicy',
            type: 'PasswordPolicy',
            description: 'Password strength requirements',
            required: false
          }
        ],
        examples: [
          `{
  secret: process.env.JWT_SECRET,
  strategies: ['local', 'jwt'],
  jwt: {
    expiresIn: '7d',
    refreshExpiresIn: '30d'
  }
}`,
          `{
  secret: process.env.JWT_SECRET,
  strategies: ['local', 'jwt', 'oauth'],
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback'
    }
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
}`
        ]
      },
      {
        name: 'JwtOptions',
        description: 'JWT configuration options',
        package: '@nl-framework/auth',
        properties: [
          {
            name: 'expiresIn',
            type: 'string',
            description: 'Access token expiration time (e.g., "1h", "7d")',
            required: false
          },
          {
            name: 'refreshExpiresIn',
            type: 'string',
            description: 'Refresh token expiration time',
            required: false
          },
          {
            name: 'algorithm',
            type: 'string',
            description: 'JWT signing algorithm (default: HS256)',
            required: false
          }
        ],
        examples: [
          `{
  expiresIn: '15m',
  refreshExpiresIn: '7d',
  algorithm: 'HS256'
}`
        ]
      },
      {
        name: 'User',
        description: 'User entity interface',
        package: '@nl-framework/auth',
        properties: [
          {
            name: 'id',
            type: 'string',
            description: 'User unique identifier',
            required: true
          },
          {
            name: 'email',
            type: 'string',
            description: 'User email address',
            required: true
          },
          {
            name: 'password',
            type: 'string',
            description: 'Hashed password',
            required: false
          },
          {
            name: 'roles',
            type: 'string[]',
            description: 'User roles',
            required: false
          },
          {
            name: 'isActive',
            type: 'boolean',
            description: 'Whether user account is active',
            required: false
          }
        ],
        examples: [
          `interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Complete Authentication Setup',
      description: 'Full authentication system with registration, login, and protected routes',
      code: `// auth.module.ts
import { Module } from '@nl-framework/core';
import { AuthModule } from '@nl-framework/auth';
import { MongoModule } from '@nl-framework/orm';
import { User } from './user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: process.env.JWT_SECRET!,
      strategies: ['local', 'jwt'],
      jwt: {
        expiresIn: '1h',
        refreshExpiresIn: '7d'
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true
      }
    }),
    MongoModule.forFeature([User])
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}

// user.entity.ts
import { Schema, Prop } from '@nl-framework/orm';
import { Types } from 'mongodb';

@Schema({ collection: 'users', timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop()
  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { AuthService as BaseAuthService } from '@nl-framework/auth';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private baseAuthService: BaseAuthService
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    // Check if user exists
    const existing = await this.userRepository.findOne({ 
      email: dto.email 
    });
    
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
      roles: ['user']
    });

    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ email });
    
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.userRepository.update(user._id.toString(), {
      lastLoginAt: new Date()
    });

    return user;
  }

  async login(user: User) {
    const payload = { 
      sub: user._id.toString(), 
      email: user.email,
      roles: user.roles 
    };

    return this.baseAuthService.generateTokens(payload);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}

// auth.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards,
  HttpCode
} from '@nl-framework/core';
import { 
  LocalAuthGuard, 
  JwtAuthGuard, 
  CurrentUser 
} from '@nl-framework/auth';
import { AuthService } from './auth.service';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: { 
    email: string; 
    password: string; 
    name: string 
  }) {
    const user = await this.authService.register(dto);
    
    // Don't return password
    const { password, ...result } = user;
    return result;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  async login(@CurrentUser() user: User) {
    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    const { password, ...result } = user;
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // Implement token blacklist if needed
    return { message: 'Logged out successfully' };
  }
}`,
      tags: ['auth', 'jwt', 'registration', 'login'],
      explanation: 'Complete authentication system with user registration, login, and JWT tokens'
    },
    {
      title: 'Role-Based Access Control (RBAC)',
      description: 'Implement role-based authorization with guards',
      code: `// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nl-framework/core';
import { Reflector } from '@nl-framework/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// roles.decorator.ts
import { SetMetadata } from '@nl-framework/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// user.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body,
  Param,
  UseGuards 
} from '@nl-framework/core';
import { JwtAuthGuard, CurrentUser } from '@nl-framework/auth';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: { name?: string; email?: string }
  ) {
    return this.userService.update(user._id.toString(), dto);
  }

  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async assignRole(
    @Param('id') userId: string,
    @Body() dto: { role: string }
  ) {
    return this.userService.assignRole(userId, dto.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('id') userId: string) {
    return this.userService.delete(userId);
  }

  @Put(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async activateUser(@Param('id') userId: string) {
    return this.userService.activate(userId);
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deactivateUser(@Param('id') userId: string) {
    return this.userService.deactivate(userId);
  }
}

// user.service.ts
import { Injectable, NotFoundException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({}, {
      select: '-password'
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async assignRole(userId: string, role: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.roles.includes(role)) {
      user.roles.push(role);
      return this.userRepository.update(userId, { roles: user.roles });
    }

    return user;
  }

  async activate(userId: string): Promise<User> {
    return this.update(userId, { isActive: true });
  }

  async deactivate(userId: string): Promise<User> {
    return this.update(userId, { isActive: false });
  }

  async delete(userId: string): Promise<void> {
    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }
}`,
      tags: ['auth', 'rbac', 'roles', 'guards'],
      explanation: 'Role-based access control with custom guards and role decorators'
    },
    {
      title: 'OAuth Integration (Google & GitHub)',
      description: 'Integrate OAuth providers for social login',
      code: `// auth.module.ts
import { Module } from '@nl-framework/core';
import { AuthModule } from '@nl-framework/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: process.env.JWT_SECRET!,
      strategies: ['local', 'jwt', 'oauth'],
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
        }
      }
    })
  ]
})
export class AppModule {}

// oauth.controller.ts
import { 
  Controller, 
  Get, 
  UseGuards, 
  Req, 
  Res 
} from '@nl-framework/core';
import { 
  GoogleAuthGuard, 
  GithubAuthGuard,
  CurrentUser 
} from '@nl-framework/auth';
import { OAuthService } from './oauth.service';

@Controller('auth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  // Google OAuth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@CurrentUser() user: any, @Res() res: any) {
    const tokens = await this.oauthService.handleOAuthLogin(user);
    
    // Redirect to frontend with tokens
    res.redirect(\`http://localhost:3001/auth/callback?token=\${tokens.accessToken}\`);
  }

  // GitHub OAuth
  @Get('github')
  @UseGuards(GithubAuthGuard)
  async githubLogin() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(@CurrentUser() user: any, @Res() res: any) {
    const tokens = await this.oauthService.handleOAuthLogin(user);
    
    res.redirect(\`http://localhost:3001/auth/callback?token=\${tokens.accessToken}\`);
  }
}

// oauth.service.ts
import { Injectable } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { AuthService } from '@nl-framework/auth';
import { User } from './user.entity';

interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  provider: string;
  picture?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService
  ) {}

  async handleOAuthLogin(profile: OAuthProfile) {
    // Find or create user
    let user = await this.userRepository.findOne({ 
      email: profile.email 
    });

    if (!user) {
      // Create new user from OAuth profile
      user = await this.userRepository.create({
        email: profile.email,
        name: profile.name,
        password: '', // No password for OAuth users
        roles: ['user'],
        isActive: true,
        emailVerified: true, // OAuth emails are verified
        oauthProvider: profile.provider,
        oauthId: profile.id,
        avatar: profile.picture
      } as any);
    } else {
      // Update existing user
      await this.userRepository.update(user._id.toString(), {
        lastLoginAt: new Date(),
        oauthProvider: profile.provider,
        oauthId: profile.id
      } as any);
    }

    // Generate JWT tokens
    return this.authService.login(user);
  }

  async linkOAuthAccount(
    userId: string, 
    profile: OAuthProfile
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.update(userId, {
      oauthProvider: profile.provider,
      oauthId: profile.id
    } as any);
  }
}

// Frontend usage example
// const handleGoogleLogin = () => {
//   window.location.href = 'http://localhost:3000/auth/google';
// };
//
// const handleGithubLogin = () => {
//   window.location.href = 'http://localhost:3000/auth/github';
// };`,
      tags: ['auth', 'oauth', 'google', 'github', 'social'],
      explanation: 'OAuth integration with Google and GitHub for social login'
    },
    {
      title: 'Password Reset and Email Verification',
      description: 'Implement password reset and email verification flows',
      code: `// auth.service.ts
import { Injectable, BadRequestException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { User } from './user.entity';
import { EmailService } from './email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService
  ) {}

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.userRepository.update(userId, {
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt
    } as any);

    // Send email
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      verificationToken: token 
    } as any);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.userRepository.update(user._id.toString(), {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null
    } as any);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await this.userRepository.update(user._id.toString(), {
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: expiresAt
    } as any);

    // Send email
    await this.emailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      resetPasswordToken: token 
    } as any);

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (user.resetPasswordTokenExpiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(user._id.toString(), {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null
    } as any);
  }

  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(userId, {
      password: hashedPassword
    });
  }
}

// auth.controller.ts
import { Controller, Post, Body, Param } from '@nl-framework/core';
import { UseGuards, CurrentUser } from '@nl-framework/auth';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  async sendVerification(@CurrentUser() user: any) {
    await this.authService.sendVerificationEmail(user.id);
    return { message: 'Verification email sent' };
  }

  @Post('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: { email: string }) {
    await this.authService.sendPasswordResetEmail(dto.email);
    return { message: 'Password reset email sent if account exists' };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: { 
    token: string; 
    newPassword: string 
  }) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: { 
      currentPassword: string; 
      newPassword: string 
    }
  ) {
    await this.authService.changePassword(
      user.id, 
      dto.currentPassword, 
      dto.newPassword
    );
    return { message: 'Password changed successfully' };
  }
}

// email.service.ts
import { Injectable } from '@nl-framework/core';

@Injectable()
export class EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationLink = \`http://localhost:3000/auth/verify-email/\${token}\`;
    
    // Send email using your email service (SendGrid, AWS SES, etc.)
    console.log(\`Verification email sent to \${email}\`);
    console.log(\`Link: \${verificationLink}\`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = \`http://localhost:3001/reset-password?token=\${token}\`;
    
    console.log(\`Password reset email sent to \${email}\`);
    console.log(\`Link: \${resetLink}\`);
  }
}`,
      tags: ['auth', 'password', 'email', 'verification'],
      explanation: 'Password reset and email verification with secure token-based flows'
    },
    {
      title: 'Refresh Tokens and Token Management',
      description: 'Implement refresh tokens for long-lived sessions',
      code: `// token.entity.ts
import { Schema, Prop } from '@nl-framework/orm';
import { Types } from 'mongodb';

@Schema({ collection: 'refresh_tokens' })
export class RefreshToken {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isRevoked: boolean;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

// token.service.ts
import { Injectable, UnauthorizedException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { JwtService } from '@nl-framework/auth';
import { RefreshToken } from './token.entity';
import { User } from './user.entity';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private tokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async generateTokens(user: User, userAgent?: string, ipAddress?: string) {
    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles
    }, { expiresIn: '15m' });

    // Generate refresh token (long-lived)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Store refresh token
    await this.tokenRepository.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
      userAgent,
      ipAddress
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    // Find refresh token
    const token = await this.tokenRepository.findOne({ 
      token: refreshToken 
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user
    const user = await this.userRepository.findById(
      token.userId.toString()
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token
    const accessToken = this.jwtService.sign({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles
    }, { expiresIn: '15m' });

    return {
      accessToken,
      expiresIn: 900
    };
  }

  async revokeToken(refreshToken: string): Promise<void> {
    await this.tokenRepository.updateMany(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.updateMany(
      { userId: userId as any },
      { isRevoked: true }
    );
  }

  async getUserActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.tokenRepository.find({
      userId: userId as any,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.tokenRepository.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }
}

// auth.controller.ts
import { Controller, Post, Get, Body, UseGuards, Req } from '@nl-framework/core';
import { JwtAuthGuard, CurrentUser } from '@nl-framework/auth';
import { TokenService } from './token.service';

@Controller('auth')
export class AuthController {
  constructor(private tokenService: TokenService) {}

  @Post('refresh')
  async refreshToken(@Body() dto: { refreshToken: string }) {
    return this.tokenService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: { refreshToken: string }) {
    await this.tokenService.revokeToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: any) {
    await this.tokenService.revokeAllUserTokens(user.id);
    return { message: 'Logged out from all devices' };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: any) {
    return this.tokenService.getUserActiveSessions(user.id);
  }
}`,
      tags: ['auth', 'jwt', 'refresh-token', 'sessions'],
      explanation: 'Secure refresh token implementation with session management'
    }
  ],
  
  bestPractices: [
    {
      category: 'Security',
      do: [
        {
          title: 'Always hash passwords',
          description: 'Use bcrypt or argon2 for password hashing',
          code: `import * as bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);`
        },
        {
          title: 'Use environment variables for secrets',
          description: 'Never hardcode secrets in your code',
          code: `AuthModule.forRoot({
  secret: process.env.JWT_SECRET,
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
})`
        },
        {
          title: 'Implement rate limiting',
          description: 'Protect login endpoints from brute force attacks',
          code: `@Post('login')
@UseGuards(LocalAuthGuard, RateLimitGuard)
async login(@CurrentUser() user: User) {
  return this.authService.login(user);
}`
        },
        {
          title: 'Use short-lived access tokens',
          description: 'Keep access tokens short-lived (15-30 minutes)',
          code: `jwt: {
  expiresIn: '15m',
  refreshExpiresIn: '7d'
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t store passwords in plain text',
          description: 'Always hash passwords before storing',
          code: `// Don't do this
user.password = password;

// Do this
user.password = await bcrypt.hash(password, 10);`
        },
        {
          title: 'Don\'t return passwords in responses',
          description: 'Exclude sensitive fields from API responses',
          code: `// Don't do this
return user;

// Do this
const { password, ...result } = user;
return result;`
        },
        {
          title: 'Don\'t reveal if user exists',
          description: 'Use generic error messages',
          code: `// Don't do this
if (!user) throw new Error('User not found');

// Do this
if (!user || !validPassword) {
  throw new UnauthorizedException('Invalid credentials');
}`
        }
      ]
    },
    {
      category: 'Token Management',
      do: [
        {
          title: 'Implement token refresh',
          description: 'Use refresh tokens for better security',
          code: `@Post('refresh')
async refreshToken(@Body() dto: { refreshToken: string }) {
  return this.tokenService.refreshAccessToken(dto.refreshToken);
}`
        },
        {
          title: 'Store refresh tokens securely',
          description: 'Save refresh tokens in database for revocation',
          code: `await this.tokenRepository.create({
  userId: user.id,
  token: refreshToken,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});`
        },
        {
          title: 'Implement token revocation',
          description: 'Allow users to logout and revoke tokens',
          code: `async revokeToken(token: string) {
  await this.tokenRepository.updateMany(
    { token },
    { isRevoked: true }
  );
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t use long-lived access tokens',
          description: 'Keep access tokens short-lived',
          code: `// Don't do this
jwt: { expiresIn: '30d' }

// Do this
jwt: { 
  expiresIn: '15m',
  refreshExpiresIn: '30d'
}`
        },
        {
          title: 'Don\'t forget to clean up expired tokens',
          description: 'Periodically remove old tokens',
          code: `@Cron('0 0 * * *')  // Daily
async cleanupTokens() {
  await this.tokenRepository.deleteMany({
    expiresAt: { $lt: new Date() }
  });
}`
        }
      ]
    },
    {
      category: 'Authorization',
      do: [
        {
          title: 'Use guards for route protection',
          description: 'Apply guards consistently across routes',
          code: `@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}`
        },
        {
          title: 'Implement role-based access',
          description: 'Check user roles before allowing actions',
          code: `@Post('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async adminAction() {
  // Only admins can access
}`
        },
        {
          title: 'Validate user permissions',
          description: 'Check both authentication and authorization',
          code: `if (!user.isActive) {
  throw new UnauthorizedException('Account deactivated');
}
if (!user.roles.includes('admin')) {
  throw new ForbiddenException('Insufficient permissions');
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t rely only on frontend checks',
          description: 'Always validate on the backend',
          code: `// Always check on backend
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async deleteUser(@Param('id') id: string) {
  // Backend validation
}`
        },
        {
          title: 'Don\'t forget to check account status',
          description: 'Verify user is active before allowing access',
          code: `if (!user.isActive) {
  throw new UnauthorizedException('Account is deactivated');
}`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'JWT token verification fails',
      symptoms: [
        'Unauthorized errors',
        'Token invalid or expired',
        'Cannot verify signature'
      ],
      solution: 'Check JWT secret and token expiration',
      code: `// Ensure secret matches
AuthModule.forRoot({
  secret: process.env.JWT_SECRET  // Must be same everywhere
})

// Check token expiration
jwt: {
  expiresIn: '15m'  // Token expires after 15 minutes
}

// Verify token manually
const decoded = this.jwtService.verify(token, {
  secret: process.env.JWT_SECRET
});`
    },
    {
      issue: 'Cannot access user in request',
      symptoms: [
        '@CurrentUser() returns undefined',
        'request.user is null',
        'User not attached to request'
      ],
      solution: 'Ensure guards are applied and JWT strategy is configured',
      code: `// Apply guard to route
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Check JWT strategy configuration
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET
    });
  }

  async validate(payload: any) {
    return this.userService.findById(payload.sub);
  }
}`
    },
    {
      issue: 'OAuth callback not working',
      symptoms: [
        'Callback URL mismatch',
        'OAuth provider error',
        'Redirect not happening'
      ],
      solution: 'Check OAuth configuration and callback URLs',
      code: `// Ensure callback URL matches OAuth provider settings
AuthModule.forRoot({
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback'
      // Must match exactly in Google Console
    }
  }
})

// Register callback route
@Get('google/callback')
@UseGuards(GoogleAuthGuard)
async googleCallback(@CurrentUser() user: any, @Res() res: any) {
  const tokens = await this.authService.login(user);
  res.redirect(\`http://localhost:3001/callback?token=\${tokens.accessToken}\`);
}`
    },
    {
      issue: 'Password hashing slowing down requests',
      symptoms: [
        'Slow login/registration',
        'High CPU usage during auth',
        'Timeout on auth endpoints'
      ],
      solution: 'Optimize bcrypt rounds or use async operations',
      code: `// Reduce bcrypt rounds (10 is good balance)
const hashedPassword = await bcrypt.hash(password, 10);

// Use async/await properly
@Post('register')
async register(@Body() dto: RegisterDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);
  // Don't block event loop
  return this.userService.create({ ...dto, password: hashedPassword });
}`
    },
    {
      issue: 'Roles guard not working',
      symptoms: [
        'Users can access admin routes',
        'RolesGuard always allows access',
        'Roles not being checked'
      ],
      solution: 'Ensure RolesGuard is properly configured and roles are set',
      code: `// Apply both auth and roles guard
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)  // Order matters!
@Roles('admin')
async adminPanel() {
  return 'Admin only';
}

// Ensure user has roles in JWT payload
const payload = {
  sub: user.id,
  email: user.email,
  roles: user.roles  // Include roles!
};

// RolesGuard implementation
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/orm', 'better-auth'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with AuthModule and AuthService',
        'JWT authentication with access and refresh tokens',
        'Local authentication strategy (email/password)',
        'OAuth integration (Google, GitHub, Facebook)',
        'Role-based access control (RBAC)',
        'Authentication guards: @UseGuards, @CurrentUser, @Roles, @Public',
        'Password management: reset, change, validation',
        'Email verification',
        'Session management',
        'Token revocation and refresh'
      ]
    }
  ]
};
