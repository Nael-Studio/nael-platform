import { Metadata } from "next";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const authGuard = `import { CanActivate, HttpGuardExecutionContext } from '@nl-framework/http';

export class AuthGuard implements CanActivate {
  async canActivate(context: HttpGuardExecutionContext): Promise<boolean> {
    const request = context.getRequest();
    const token = request.headers.authorization;
    
    if (!token) {
      return false;
    }
    
    try {
      const user = await this.validateToken(token);
      request.user = user;
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private async validateToken(token: string) {
    return { id: 1, username: 'john' };
  }
}`;

const useGuardsMethod = `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { AuthGuard } from './auth.guard';

@Controller('/api/users')
export class UserController {
  @Get('/')
  @UseGuards(AuthGuard)
  async getUsers() {
    return { users: [] };
  }
  
  @Get('/public')
  async getPublicData() {
    return { data: 'public' };
  }
}`;

const controllerLevelGuard = `@Controller('/api/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  @Get('/users')
  async getUsers() {
    return { users: [] };
  }
  
  @Delete('/users/:id')
  async deleteUser(id: string) {
    return { deleted: true };
  }
}`;

const functionalGuards = `import { GuardFunction } from '@nl-framework/http';

const isAuthenticated: GuardFunction = async (context) => {
  const request = context.getRequest();
  return !!request.headers.authorization;
};

function hasRole(role: string): GuardFunction {
  return async (context) => {
    const request = context.getRequest();
    return request.user?.role === role;
  };
}

@Controller('/api/admin')
export class AdminController {
  @Get('/dashboard')
  @UseGuards(isAuthenticated, hasRole('admin'))
  async getDashboard() {
    return { dashboard: {} };
  }
}`;

const globalGuards = `import { createHttpApp, registerHttpGuard } from '@nl-framework/http';
import { AuthGuard } from './guards/auth.guard';

async function bootstrap() {
  const app = await createHttpApp({ port: 3000 });
  
  registerHttpGuard(AuthGuard);
  
  await app.start();
}`;

const rbacPattern = `import { SetMetadata } from '@nl-framework/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: HttpGuardExecutionContext): Promise<boolean> {
    const requiredRoles = context.getRoute().metadata?.roles as string[];
    
    if (!requiredRoles) return true;
    
    const user = context.getRequest().user;
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get('/users')
  @Roles('admin', 'superadmin')
  async getUsers() {
    return { users: [] };
  }
}`;

export const metadata: Metadata = {
  title: "Guards - NL Framework",
  description: "Learn how to use guards for authorization and access control in NL Framework",
};

export default function GuardsPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-primary/10 text-primary">Overview</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Guards</h1>
        <p className="text-lg text-muted-foreground">
          Guards are a powerful mechanism for implementing authorization logic in your application. 
          They determine whether a request should be handled by the route handler or not, making them 
          perfect for authentication, authorization, and access control scenarios.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Key Concept:</strong> Guards execute <strong>after all middleware</strong> but{" "}
            <strong>before pipes and route handlers</strong>. They have access to the full execution context 
            and can make complex authorization decisions.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" id="guard-interface">
        <h2 className="text-2xl font-semibold">Guard Interface</h2>
        <p className="text-muted-foreground">
          Guards implement the <code>CanActivate</code> interface, which defines a single method:
        </p>
        <CodeBlock code={authGuard} title="Basic AuthGuard implementation" />
      </section>

      <section className="space-y-4" id="using-guards">
        <h2 className="text-2xl font-semibold">Using Guards</h2>
        <p className="text-muted-foreground">
          Guards can be applied to controllers or individual route handlers using the <code>@UseGuards()</code> decorator:
        </p>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-3">Method-Level Guards</h3>
            <CodeBlock code={useGuardsMethod} title="Apply guards to specific routes" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Controller-Level Guards</h3>
            <CodeBlock code={controllerLevelGuard} title="Protect all routes in a controller" />
          </div>
        </div>
      </section>

      <section className="space-y-4" id="functional-guards">
        <h2 className="text-2xl font-semibold">Functional Guards</h2>
        <p className="text-muted-foreground">
          For simple authorization logic, you can use functional guards instead of classes:
        </p>
        <CodeBlock code={functionalGuards} title="Functional guard examples" />
      </section>

      <section className="space-y-4" id="global-guards">
        <h2 className="text-2xl font-semibold">Global Guards</h2>
        <p className="text-muted-foreground">
          Register guards globally to apply them to all routes:
        </p>
        <CodeBlock code={globalGuards} title="Register global guards" />
      </section>

      <section className="space-y-4" id="advanced-patterns">
        <h2 className="text-2xl font-semibold">Advanced Patterns</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-3">Role-Based Access Control (RBAC)</h3>
            <CodeBlock code={rbacPattern} title="RBAC with custom decorators" />
          </div>
        </div>
      </section>

      <section className="space-y-4" id="best-practices">
        <h2 className="text-2xl font-semibold">Best Practices</h2>
        <div className="space-y-3">
          <Card className="border-border/70">
            <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
              <p><strong>Keep Guards Focused:</strong> Each guard should have a single responsibility.</p>
              <p><strong>Use Dependency Injection:</strong> Leverage DI to inject services and repositories.</p>
              <p><strong>Attach User to Request:</strong> After authentication, attach the user object to the request.</p>
              <p><strong>Order Matters:</strong> Apply guards in logical order: authentication → authorization → resource checks.</p>
              <p><strong>Provide Clear Error Messages:</strong> Help clients understand why access was denied.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="pt-6">
          <p className="text-sm text-green-900 dark:text-green-100">
            <strong>✅ Summary:</strong> Guards provide a clean, declarative way to implement authorization logic. 
            They execute after middleware but before pipes and handlers, support both class-based and functional 
            implementations, and can be applied globally, per-controller, or per-route.
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
