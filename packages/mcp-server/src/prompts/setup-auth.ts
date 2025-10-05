import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const setupAuthPrompt: Prompt = {
  name: 'setup-auth',
  description: 'Guide the user through setting up authentication with Better Auth',
  arguments: [
    {
      name: 'providers',
      description: 'Comma-separated list of auth providers (e.g., "email", "google", "github")',
      required: false
    },
    {
      name: 'withRBAC',
      description: 'Whether to include role-based access control (true/false)',
      required: false
    },
    {
      name: 'database',
      description: 'Database type: mongodb, postgresql, mysql, sqlite',
      required: false
    }
  ]
};

export async function handleSetupAuth(args: {
  providers?: string;
  withRBAC?: string;
  database?: string;
}) {
  const { providers, withRBAC, database = 'mongodb' } = args;
  const includeRBAC = withRBAC === 'true';
  
  // Parse providers or use defaults
  const authProviders = providers 
    ? providers.split(',').map(p => p.trim().toLowerCase())
    : ['email'];

  const hasOAuth = authProviders.some(p => ['google', 'github', 'facebook', 'twitter'].includes(p));

  const prompt = `# Setting up Authentication with Better Auth

Let me guide you through setting up authentication with Nael Framework and Better Auth.

## Step 1: Install Dependencies

\`\`\`bash
bun add @nl-framework/auth @nl-framework/core @nl-framework/http @nl-framework/platform
${database === 'mongodb' ? 'bun add @nl-framework/orm mongodb' : ''}
${database === 'postgresql' ? 'bun add pg' : ''}
${database === 'mysql' ? 'bun add mysql2' : ''}
\`\`\`

## Step 2: Create User Entity

${database === 'mongodb' ? `Create \`src/entities/user.entity.ts\`:

\`\`\`typescript
import { Entity, Column, ObjectIdColumn } from '@nl-framework/orm';
import { ObjectId } from 'mongodb';

@Entity('users')
export class User {
  @ObjectIdColumn()
  id: ObjectId;

  @Column()
  email: string;

  @Column()
  name?: string;

  @Column()
  image?: string;

  @Column()
  emailVerified: boolean = false;

${includeRBAC ? `  @Column()
  roles: string[] = ['user'];

  @Column()
  permissions: string[] = [];
` : ''}
  @Column()
  createdAt: Date = new Date();

  @Column()
  updatedAt: Date = new Date();
}
\`\`\`
` : `Create \`src/entities/user.entity.ts\`:

\`\`\`typescript
// For SQL databases, define your user schema
// Better Auth will handle the table creation

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified: boolean;
${includeRBAC ? `  roles: string[];
  permissions: string[];
` : ''}  createdAt: Date;
  updatedAt: Date;
}
\`\`\`
`}

## Step 3: Configure Environment Variables

Create \`.env\`:

\`\`\`env
# Database
${database === 'mongodb' ? 'MONGODB_URI=mongodb://localhost:27017/myapp' : ''}
${database === 'postgresql' ? 'DATABASE_URL=postgresql://user:password@localhost:5432/myapp' : ''}
${database === 'mysql' ? 'DATABASE_URL=mysql://user:password@localhost:3306/myapp' : ''}
${database === 'sqlite' ? 'DATABASE_URL=sqlite:./database.db' : ''}

# Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

${hasOAuth ? '# OAuth Providers' : ''}
${authProviders.includes('google') ? `GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
` : ''}${authProviders.includes('github') ? `GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
` : ''}${authProviders.includes('facebook') ? `FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
` : ''}
# Email (for email/password auth)
${authProviders.includes('email') ? `SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com
` : ''}\`\`\`

## Step 4: Configure Auth Module

Create \`src/config/auth.config.ts\`:

\`\`\`typescript
import { AuthModuleOptions } from '@nl-framework/auth';

export const authConfig: AuthModuleOptions = {
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  
  database: {
    type: '${database}',
    ${database === 'mongodb' ? "url: process.env.MONGODB_URI!" : "url: process.env.DATABASE_URL!"}
  },

  providers: {
${authProviders.map(provider => {
  if (provider === 'email') {
    return `    emailPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendVerificationEmail: async (email, token) => {
        // Implement email sending logic
        console.log(\`Verification email for \${email}: \${token}\`);
      }
    }`;
  } else if (provider === 'google') {
    return `    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: \`\${process.env.BETTER_AUTH_URL}/auth/callback/google\`
    }`;
  } else if (provider === 'github') {
    return `    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectURI: \`\${process.env.BETTER_AUTH_URL}/auth/callback/github\`
    }`;
  } else if (provider === 'facebook') {
    return `    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      redirectURI: \`\${process.env.BETTER_AUTH_URL}/auth/callback/facebook\`
    }`;
  }
  return '';
}).filter(Boolean).join(',\n')}
  },

${includeRBAC ? `  // Role-based access control
  rbac: {
    enabled: true,
    defaultRole: 'user',
    roles: {
      admin: {
        permissions: ['*'] // All permissions
      },
      editor: {
        permissions: ['read', 'write', 'update']
      },
      user: {
        permissions: ['read']
      }
    }
  },
` : ''}
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  }
};
\`\`\`

## Step 5: Create Auth Controller (Optional)

Create \`src/controllers/auth.controller.ts\`:

\`\`\`typescript
import { Injectable } from '@nl-framework/core';
import { 
  Controller, 
  Post, 
  Get,
  Body, 
  HttpException, 
  HttpStatus,
  Request,
  Response
} from '@nl-framework/http';
import { AuthService${includeRBAC ? ', Authenticated, Authorized' : ', Authenticated'} } from '@nl-framework/auth';

interface SignUpDto {
  email: string;
  password: string;
  name?: string;
}

interface SignInDto {
  email: string;
  password: string;
}

@Injectable()
@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  async signUp(@Body() dto: SignUpDto) {
    try {
      const user = await this.authService.signUp({
        email: dto.email,
        password: dto.password,
        name: dto.name
      });

      return {
        message: 'Sign up successful. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Sign up failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('/signin')
  async signIn(@Body() dto: SignInDto, @Response() res: any) {
    try {
      const session = await this.authService.signIn({
        email: dto.email,
        password: dto.password
      });

      // Set session cookie
      res.cookie('session', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return {
        message: 'Sign in successful',
        user: session.user
      };
    } catch (error) {
      throw new HttpException(
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('/signout')
  @Authenticated()
  async signOut(@Request() req: any, @Response() res: any) {
    await this.authService.signOut(req.sessionId);
    res.clearCookie('session');
    return { message: 'Sign out successful' };
  }

  @Get('/me')
  @Authenticated()
  async getProfile(@Request() req: any) {
    return {
      user: req.user
    };
  }
${includeRBAC ? `
  @Get('/admin')
  @Authenticated()
  @Authorized(['admin'])
  async adminOnly(@Request() req: any) {
    return {
      message: 'Admin access granted',
      user: req.user
    };
  }
` : ''}
}
\`\`\`

## Step 6: Create Protected Route Example

Create \`src/controllers/profile.controller.ts\`:

\`\`\`typescript
import { Injectable } from '@nl-framework/core';
import { 
  Controller, 
  Get, 
  Put,
  Body,
  Request
} from '@nl-framework/http';
import { Authenticated${includeRBAC ? ', Authorized' : ''} } from '@nl-framework/auth';

@Injectable()
@Controller('/profile')
@Authenticated() // All routes require authentication
export class ProfileController {
  
  @Get()
  async getProfile(@Request() req: any) {
    return {
      user: req.user
    };
  }

  @Put()
  async updateProfile(@Request() req: any, @Body() dto: any) {
    // Update profile logic
    return {
      message: 'Profile updated',
      user: {
        ...req.user,
        ...dto
      }
    };
  }
${includeRBAC ? `
  @Get('/admin-data')
  @Authorized(['admin', 'editor'])
  async getAdminData(@Request() req: any) {
    // Only admins and editors can access
    return {
      data: 'Sensitive admin data',
      userRoles: req.user.roles
    };
  }
` : ''}
}
\`\`\`

## Step 7: Register in App Module

Update \`src/app.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { HttpModule } from '@nl-framework/http';
import { AuthModule } from '@nl-framework/auth';
${database === 'mongodb' ? "import { OrmModule } from '@nl-framework/orm';" : ''}
import { authConfig } from './config/auth.config';
import { AuthController } from './controllers/auth.controller';
import { ProfileController } from './controllers/profile.controller';

@Module({
  imports: [
    HttpModule.forRoot({
      port: 3000,
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      }
    }),
${database === 'mongodb' ? `    OrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGODB_URI!,
      database: 'myapp'
    }),
` : ''}    AuthModule.forRoot(authConfig)
  ],
  controllers: [AuthController, ProfileController]
})
export class AppModule {}
\`\`\`

## Step 8: Create Entry Point

Create \`src/main.ts\`:

\`\`\`typescript
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen();
  console.log(\`🚀 Server with auth is running on http://localhost:3000\`);
}

bootstrap();
\`\`\`

## Step 9: Test Authentication

Run the server:
\`\`\`bash
bun run src/main.ts
\`\`\`

### Sign Up
\`\`\`bash
curl -X POST http://localhost:3000/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
\`\`\`

### Sign In
\`\`\`bash
curl -X POST http://localhost:3000/auth/signin \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
\`\`\`

### Access Protected Route
\`\`\`bash
curl -X GET http://localhost:3000/auth/me \\
  -b cookies.txt
\`\`\`

### Sign Out
\`\`\`bash
curl -X POST http://localhost:3000/auth/signout \\
  -b cookies.txt
\`\`\`
${hasOAuth ? `
### OAuth Flow

For OAuth providers (${authProviders.filter(p => p !== 'email').join(', ')}):

1. Redirect user to: \`http://localhost:3000/auth/signin/${authProviders.find(p => p !== 'email')}\`
2. User authorizes with provider
3. User is redirected back to: \`http://localhost:3000/auth/callback/${authProviders.find(p => p !== 'email')}\`
4. Session is created automatically
` : ''}

## Frontend Integration

### React Example

\`\`\`typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('http://localhost:3000/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const res = await fetch('http://localhost:3000/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
      await checkAuth();
      return true;
    }
    return false;
  }

  async function signOut() {
    await fetch('http://localhost:3000/auth/signout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  }

  return { user, loading, signIn, signOut };
}
\`\`\`

## Security Best Practices

1. **Use HTTPS in production**
2. **Set secure cookie flags** (httpOnly, secure, sameSite)
3. **Implement rate limiting** on auth endpoints
4. **Use strong password requirements**
5. **Enable email verification**
6. **Implement 2FA** for sensitive accounts
7. **Log authentication events**
8. **Set session expiration** appropriately
9. **Use CSRF protection**
10. **Sanitize user inputs**

## Next Steps

1. **Add Email Verification**: Implement email verification flow
2. **Add Password Reset**: Implement forgot password functionality
3. **Add 2FA**: Implement two-factor authentication
4. **Add Social Login**: ${hasOAuth ? 'Configure OAuth providers' : 'Add OAuth providers'}
5. **Add Session Management**: View and revoke sessions
${includeRBAC ? `6. **Add Role Management**: Admin UI for managing roles and permissions
7. **Add Permission Guards**: Fine-grained permission checks` : '6. **Add RBAC**: Implement role-based access control'}
8. **Add Audit Logging**: Track authentication events
9. **Add Rate Limiting**: Prevent brute force attacks
10. **Add Tests**: Write authentication tests

Need help with any of these steps? Just ask!
`;

  return {
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
}
