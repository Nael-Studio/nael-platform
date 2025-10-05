import { PackageDocumentation } from '../../types.js';

export const loggerPackageDocs: PackageDocumentation = {
  name: '@nl-framework/logger',
  description: 'Comprehensive logging solution for NL Framework with multiple transports, log levels, formatting, and production-ready features',
  version: '1.0.0',
  installation: 'bun add @nl-framework/logger @nl-framework/core',
  
  features: [
    {
      title: 'Multiple Log Levels',
      description: 'Support for error, warn, info, debug, and verbose log levels',
      icon: '📊'
    },
    {
      title: 'Multiple Transports',
      description: 'Console, file, HTTP, and custom transport support',
      icon: '🚀'
    },
    {
      title: 'Structured Logging',
      description: 'JSON structured logs with metadata and context',
      icon: '📋'
    },
    {
      title: 'Log Formatting',
      description: 'Customizable formatters for different output styles',
      icon: '🎨'
    },
    {
      title: 'Request Logging',
      description: 'Built-in HTTP request/response logging middleware',
      icon: '🌐'
    },
    {
      title: 'Performance Tracking',
      description: 'Automatic timing and performance metrics',
      icon: '⚡'
    }
  ],
  
  quickStart: {
    description: 'Set up logging in your application',
    steps: [
      'Install dependencies: bun add @nl-framework/logger',
      'Register LoggerModule in your app module',
      'Inject Logger into your services',
      'Use log methods (error, warn, info, debug)',
      'Configure transports and formatting'
    ],
    code: `// app.module.ts
import { Module } from '@nl-framework/core';
import { LoggerModule } from '@nl-framework/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info',
      transports: ['console', 'file']
    })
  ]
})
export class AppModule {}

// user.service.ts
import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(data: any) {
    this.logger.log('Creating new user', { email: data.email });
    
    try {
      const user = await this.userRepository.create(data);
      this.logger.log('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack);
      throw error;
    }
  }
}`
  },
  
  api: {
    classes: [
      {
        name: 'LoggerModule',
        description: 'Module for configuring logging throughout the application',
        package: '@nl-framework/logger',
        constructor: {},
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options?: LoggerModuleOptions): DynamicModule',
            description: 'Register LoggerModule with global configuration',
            parameters: [
              {
                name: 'options',
                type: 'LoggerModuleOptions',
                description: 'Logger configuration including level, transports, format'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `LoggerModule.forRoot({
  level: 'info',
  transports: ['console', 'file']
})`,
          `LoggerModule.forRoot({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: 'json',
  transports: [
    { type: 'console', level: 'debug' },
    { type: 'file', filename: 'logs/app.log', level: 'info' },
    { type: 'file', filename: 'logs/error.log', level: 'error' }
  ]
})`
        ]
      },
      {
        name: 'Logger',
        description: 'Logger class for outputting logs with different levels and contexts',
        package: '@nl-framework/logger',
        constructor: {
          parameters: [
            {
              name: 'context',
              type: 'string',
              description: 'Context name (usually class or module name)'
            }
          ]
        },
        methods: [
          {
            name: 'log',
            signature: 'log(message: string, ...optionalParams: any[]): void',
            description: 'Log an info-level message',
            parameters: [
              {
                name: 'message',
                type: 'string',
                description: 'Log message'
              },
              {
                name: 'optionalParams',
                type: 'any[]',
                description: 'Additional data, metadata, or context'
              }
            ],
            returns: 'void'
          },
          {
            name: 'error',
            signature: 'error(message: string, trace?: string, ...optionalParams: any[]): void',
            description: 'Log an error-level message with stack trace',
            parameters: [
              {
                name: 'message',
                type: 'string',
                description: 'Error message'
              },
              {
                name: 'trace',
                type: 'string',
                description: 'Stack trace'
              },
              {
                name: 'optionalParams',
                type: 'any[]',
                description: 'Additional error context'
              }
            ],
            returns: 'void'
          },
          {
            name: 'warn',
            signature: 'warn(message: string, ...optionalParams: any[]): void',
            description: 'Log a warning-level message',
            parameters: [
              {
                name: 'message',
                type: 'string',
                description: 'Warning message'
              },
              {
                name: 'optionalParams',
                type: 'any[]',
                description: 'Additional context'
              }
            ],
            returns: 'void'
          },
          {
            name: 'debug',
            signature: 'debug(message: string, ...optionalParams: any[]): void',
            description: 'Log a debug-level message',
            parameters: [
              {
                name: 'message',
                type: 'string',
                description: 'Debug message'
              },
              {
                name: 'optionalParams',
                type: 'any[]',
                description: 'Additional debug info'
              }
            ],
            returns: 'void'
          },
          {
            name: 'verbose',
            signature: 'verbose(message: string, ...optionalParams: any[]): void',
            description: 'Log a verbose-level message (more detailed than debug)',
            parameters: [
              {
                name: 'message',
                type: 'string',
                description: 'Verbose message'
              },
              {
                name: 'optionalParams',
                type: 'any[]',
                description: 'Additional verbose details'
              }
            ],
            returns: 'void'
          },
          {
            name: 'setLogLevels',
            signature: 'setLogLevels(levels: LogLevel[]): void',
            description: 'Dynamically change log levels at runtime',
            parameters: [
              {
                name: 'levels',
                type: 'LogLevel[]',
                description: 'Array of log levels to enable'
              }
            ],
            returns: 'void'
          }
        ],
        examples: [
          `const logger = new Logger('UserService');
logger.log('User created', { userId: '123' });
logger.error('Failed to save', error.stack);
logger.warn('Deprecated method used');
logger.debug('Processing data', { items: 10 });`,
          `// With context
const logger = new Logger('PaymentService');
logger.log('Payment processing started', {
  amount: 100,
  currency: 'USD',
  userId: '123'
});`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'LoggerModuleOptions',
        description: 'Configuration options for LoggerModule',
        package: '@nl-framework/logger',
        properties: [
          {
            name: 'level',
            type: 'LogLevel',
            description: 'Minimum log level to output (error, warn, info, debug, verbose)',
            required: false
          },
          {
            name: 'format',
            type: '"json" | "text" | "pretty"',
            description: 'Output format for logs',
            required: false
          },
          {
            name: 'transports',
            type: 'Transport[]',
            description: 'Array of transport configurations for outputting logs',
            required: false
          },
          {
            name: 'silent',
            type: 'boolean',
            description: 'Disable all logging output',
            required: false
          },
          {
            name: 'exitOnError',
            type: 'boolean',
            description: 'Exit process on uncaught errors (default: false)',
            required: false
          },
          {
            name: 'timestamp',
            type: 'boolean',
            description: 'Include timestamp in logs (default: true)',
            required: false
          },
          {
            name: 'context',
            type: 'boolean',
            description: 'Include context in logs (default: true)',
            required: false
          }
        ],
        examples: [
          `{
  level: 'info',
  format: 'json',
  timestamp: true,
  transports: ['console', 'file']
}`,
          `{
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  transports: [
    { type: 'console' },
    { type: 'file', filename: 'logs/app.log' }
  ]
}`
        ]
      },
      {
        name: 'Transport',
        description: 'Configuration for log output destinations',
        package: '@nl-framework/logger',
        properties: [
          {
            name: 'type',
            type: '"console" | "file" | "http" | "custom"',
            description: 'Type of transport',
            required: true
          },
          {
            name: 'level',
            type: 'LogLevel',
            description: 'Minimum level for this transport',
            required: false
          },
          {
            name: 'filename',
            type: 'string',
            description: 'File path for file transport',
            required: false
          },
          {
            name: 'maxSize',
            type: 'string',
            description: 'Maximum file size before rotation (e.g., "10m", "100k")',
            required: false
          },
          {
            name: 'maxFiles',
            type: 'number',
            description: 'Maximum number of rotated files to keep',
            required: false
          },
          {
            name: 'url',
            type: 'string',
            description: 'HTTP endpoint for http transport',
            required: false
          }
        ],
        examples: [
          `{ type: 'console', level: 'debug' }`,
          `{
  type: 'file',
  filename: 'logs/app.log',
  maxSize: '10m',
  maxFiles: 5
}`,
          `{
  type: 'http',
  url: 'https://logs.example.com/api/logs',
  level: 'error'
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Basic Logging Setup',
      description: 'Set up logging with console and file transports',
      code: `// app.module.ts
import { Module } from '@nl-framework/core';
import { LoggerModule } from '@nl-framework/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      timestamp: true,
      transports: [
        { type: 'console', level: 'debug' },
        { 
          type: 'file', 
          filename: 'logs/app.log',
          level: 'info',
          maxSize: '10m',
          maxFiles: 5
        },
        {
          type: 'file',
          filename: 'logs/error.log',
          level: 'error'
        }
      ]
    })
  ],
  providers: [UserService]
})
export class AppModule {}

// user.service.ts
import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async findById(id: string) {
    this.logger.debug('Finding user by ID', { userId: id });
    
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      this.logger.warn('User not found', { userId: id });
      return null;
    }
    
    this.logger.log('User found', { userId: id, email: user.email });
    return user;
  }

  async create(data: any) {
    this.logger.log('Creating new user', { email: data.email });
    
    try {
      const user = await this.userRepository.create(data);
      this.logger.log('User created successfully', { 
        userId: user.id,
        email: user.email 
      });
      return user;
    } catch (error) {
      this.logger.error(
        'Failed to create user',
        error.stack,
        { email: data.email, error: error.message }
      );
      throw error;
    }
  }

  async delete(id: string) {
    this.logger.warn('Deleting user', { userId: id });
    
    try {
      await this.userRepository.delete(id);
      this.logger.log('User deleted', { userId: id });
    } catch (error) {
      this.logger.error('Failed to delete user', error.stack, { userId: id });
      throw error;
    }
  }
}`,
      tags: ['logger', 'setup', 'transports'],
      explanation: 'Basic logging configuration with multiple transports and log levels'
    },
    {
      title: 'HTTP Request Logging Middleware',
      description: 'Log all HTTP requests and responses with timing',
      code: `// logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    this.logger.log('Incoming request', {
      method,
      url,
      ip,
      userAgent: userAgent.substring(0, 100)
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          
          this.logger.log('Request completed', {
            method,
            url,
            statusCode,
            duration: \`\${duration}ms\`,
            responseSize: JSON.stringify(data).length
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          this.logger.error('Request failed', error.stack, {
            method,
            url,
            duration: \`\${duration}ms\`,
            error: error.message
          });
        }
      })
    );
  }
}

// app.module.ts
import { Module } from '@nl-framework/core';

@Module({
  imports: [LoggerModule.forRoot({ ... })],
  providers: [
    {
      provide: 'APP_INTERCEPTOR',
      useClass: LoggingInterceptor
    }
  ]
})
export class AppModule {}

// Or apply globally in main.ts
async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(3000);
}`,
      tags: ['logger', 'http', 'middleware', 'interceptor'],
      explanation: 'Automatically log all HTTP requests with timing and metadata'
    },
    {
      title: 'Structured Logging with Context',
      description: 'Use structured logging with rich context and metadata',
      code: `// order.service.ts
import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async processOrder(orderId: string, userId: string) {
    // Create logger with persistent context
    const orderLogger = this.logger.child({
      orderId,
      userId,
      operation: 'processOrder'
    });

    orderLogger.log('Starting order processing');

    try {
      // Step 1: Validate
      orderLogger.debug('Validating order');
      const order = await this.validateOrder(orderId);
      orderLogger.log('Order validated', { 
        total: order.total,
        items: order.items.length 
      });

      // Step 2: Process payment
      orderLogger.log('Processing payment', { 
        amount: order.total,
        method: order.paymentMethod 
      });
      const payment = await this.processPayment(order);
      orderLogger.log('Payment successful', { 
        transactionId: payment.id,
        amount: payment.amount 
      });

      // Step 3: Update inventory
      orderLogger.log('Updating inventory');
      await this.updateInventory(order);
      orderLogger.log('Inventory updated', { 
        items: order.items.length 
      });

      // Step 4: Send notification
      orderLogger.debug('Sending confirmation email');
      await this.sendOrderConfirmation(order, userId);

      orderLogger.log('Order processed successfully', {
        orderId,
        total: order.total,
        transactionId: payment.id
      });

      return { success: true, orderId, transactionId: payment.id };

    } catch (error) {
      orderLogger.error('Order processing failed', error.stack, {
        orderId,
        userId,
        error: error.message,
        step: this.getCurrentStep(error)
      });

      // Log to external error tracking
      await this.reportError(error, { orderId, userId });

      throw error;
    }
  }

  async processPayment(order: any) {
    const logger = this.logger.child({ 
      orderId: order.id,
      operation: 'payment' 
    });

    logger.log('Initiating payment', {
      provider: 'stripe',
      amount: order.total,
      currency: 'USD'
    });

    const startTime = Date.now();
    
    try {
      const result = await this.paymentGateway.charge({
        amount: order.total,
        currency: 'USD',
        source: order.paymentMethod
      });

      const duration = Date.now() - startTime;
      
      logger.log('Payment completed', {
        transactionId: result.id,
        amount: result.amount,
        duration: \`\${duration}ms\`,
        status: result.status
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Payment failed', error.stack, {
        amount: order.total,
        duration: \`\${duration}ms\`,
        errorCode: error.code,
        errorMessage: error.message
      });

      throw error;
    }
  }
}

// analytics.service.ts
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  trackEvent(event: string, properties: any) {
    this.logger.log('Analytics event', {
      event,
      properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    // Send to analytics service
    this.analyticsProvider.track(event, properties);
  }

  trackPerformance(operation: string, duration: number, metadata?: any) {
    this.logger.log('Performance metric', {
      operation,
      duration: \`\${duration}ms\`,
      ...metadata
    });

    // Check for slow operations
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operation,
        duration: \`\${duration}ms\`,
        threshold: '1000ms',
        ...metadata
      });
    }
  }
}`,
      tags: ['logger', 'structured', 'context', 'metadata'],
      explanation: 'Rich structured logging with context, timing, and detailed metadata'
    },
    {
      title: 'Log Rotation and File Management',
      description: 'Configure log rotation and file management for production',
      code: `// logger.config.ts
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  timestamp: true,
  transports: [
    // Console for development
    {
      type: 'console',
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      format: 'pretty'
    },
    
    // Combined logs (all levels)
    {
      type: 'file',
      filename: 'logs/combined.log',
      level: 'info',
      maxSize: '20m',      // 20 megabytes
      maxFiles: 10,         // Keep 10 files
      compress: true        // Gzip old files
    },
    
    // Error logs only
    {
      type: 'file',
      filename: 'logs/error.log',
      level: 'error',
      maxSize: '10m',
      maxFiles: 20,
      compress: true
    },
    
    // Debug logs (development only)
    ...(process.env.NODE_ENV !== 'production' ? [{
      type: 'file',
      filename: 'logs/debug.log',
      level: 'debug',
      maxSize: '50m',
      maxFiles: 3
    }] : []),
    
    // HTTP logs for API requests
    {
      type: 'file',
      filename: 'logs/http.log',
      level: 'info',
      maxSize: '30m',
      maxFiles: 7,
      filter: (log) => log.context === 'HTTP'
    },
    
    // Performance logs
    {
      type: 'file',
      filename: 'logs/performance.log',
      level: 'info',
      maxSize: '10m',
      maxFiles: 5,
      filter: (log) => log.message.includes('Performance')
    }
  ]
};

// app.module.ts
import { Module } from '@nl-framework/core';
import { LoggerModule } from '@nl-framework/logger';
import { loggerConfig } from './logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig)
  ]
})
export class AppModule {}

// Log rotation monitoring service
@Injectable()
export class LogMonitorService {
  private readonly logger = new Logger(LogMonitorService.name);

  @Cron('0 0 * * *')  // Daily at midnight
  async cleanOldLogs() {
    this.logger.log('Starting log cleanup');
    
    const logsDir = 'logs';
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();
    
    try {
      const files = await fs.readdir(logsDir);
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();
        
        if (age > maxAge) {
          await fs.unlink(filePath);
          this.logger.log('Deleted old log file', { 
            file, 
            age: \`\${Math.floor(age / (24 * 60 * 60 * 1000))} days\` 
          });
        }
      }
      
      this.logger.log('Log cleanup completed');
    } catch (error) {
      this.logger.error('Log cleanup failed', error.stack);
    }
  }

  async getLogStats() {
    const logsDir = 'logs';
    const files = await fs.readdir(logsDir);
    
    const stats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(logsDir, file);
        const stat = await fs.stat(filePath);
        return {
          file,
          size: \`\${(stat.size / 1024 / 1024).toFixed(2)} MB\`,
          modified: stat.mtime
        };
      })
    );
    
    this.logger.log('Log statistics', { files: stats.length, stats });
    return stats;
  }
}`,
      tags: ['logger', 'rotation', 'production', 'files'],
      explanation: 'Production-ready log rotation with file management and cleanup'
    },
    {
      title: 'Error Tracking and Alerting',
      description: 'Integrate error tracking and alerting with logging',
      code: `// error-tracker.service.ts
import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';

@Injectable()
export class ErrorTrackerService {
  private readonly logger = new Logger(ErrorTrackerService.name);
  private errorCounts = new Map<string, number>();
  private readonly errorThreshold = 10;
  private readonly timeWindow = 60000; // 1 minute

  async trackError(error: Error, context?: any) {
    const errorKey = \`\${error.name}:\${error.message}\`;
    
    // Log error with full context
    this.logger.error('Application error', error.stack, {
      name: error.name,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    // Track error frequency
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    // Alert on high error frequency
    if (count === this.errorThreshold) {
      await this.sendAlert({
        severity: 'high',
        message: \`Error threshold reached: \${errorKey}\`,
        count,
        error: error.message,
        context
      });
    }

    // Send to external error tracking (e.g., Sentry)
    if (process.env.SENTRY_DSN) {
      await this.sendToSentry(error, context);
    }

    // Clear old counts
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, this.timeWindow);
  }

  private async sendAlert(alert: any) {
    this.logger.warn('Error alert triggered', alert);
    
    // Send to Slack, email, PagerDuty, etc.
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: \`🚨 Error Alert: \${alert.message}\`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Error', value: alert.error, short: false },
              { title: 'Count', value: alert.count.toString(), short: true },
              { title: 'Environment', value: process.env.NODE_ENV, short: true }
            ]
          }]
        })
      });
    }
  }

  private async sendToSentry(error: Error, context?: any) {
    // Sentry integration
    this.logger.debug('Sending error to Sentry', {
      error: error.message,
      context
    });
    // Sentry.captureException(error, { extra: context });
  }
}

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private logger: Logger,
    private errorTracker: ErrorTrackerService
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message
    };

    // Log and track error
    this.logger.error(
      \`HTTP \${status} Error: \${exception.message}\`,
      exception.stack,
      {
        url: request.url,
        method: request.method,
        ip: request.ip,
        userId: request.user?.id
      }
    );

    this.errorTracker.trackError(exception, {
      url: request.url,
      method: request.method,
      userId: request.user?.id
    });

    response.status(status).json(errorResponse);
  }
}`,
      tags: ['logger', 'errors', 'tracking', 'alerting'],
      explanation: 'Comprehensive error tracking with alerting and external integration'
    }
  ],
  
  bestPractices: [
    {
      category: 'Log Levels',
      do: [
        {
          title: 'Use appropriate log levels',
          description: 'Choose the right level for each log message',
          code: `// ERROR - for errors and exceptions
this.logger.error('Database connection failed', error.stack);

// WARN - for warnings and deprecated features
this.logger.warn('API rate limit approaching', { usage: '90%' });

// INFO/LOG - for important business events
this.logger.log('User registered', { userId, email });

// DEBUG - for debugging information
this.logger.debug('Cache hit', { key, value });

// VERBOSE - for very detailed tracing
this.logger.verbose('Processing item', { index: 5, total: 100 });`
        },
        {
          title: 'Set production log levels appropriately',
          description: 'Use warn/error in production, debug in development',
          code: `LoggerModule.forRoot({
  level: process.env.NODE_ENV === 'production' 
    ? 'warn'    // Only warnings and errors in prod
    : 'debug'   // More verbose in dev
})`
        },
        {
          title: 'Include context with log messages',
          description: 'Always provide relevant context and metadata',
          code: `this.logger.log('Payment processed', {
  orderId: order.id,
  amount: order.total,
  currency: 'USD',
  transactionId: payment.id,
  duration: '245ms'
});`
        }
      ],
      dont: [
        {
          title: 'Don\'t use console.log directly',
          description: 'Always use the Logger service',
          code: `// Don't do this
console.log('User created');

// Do this
this.logger.log('User created', { userId });`
        },
        {
          title: 'Don\'t log sensitive information',
          description: 'Never log passwords, tokens, or PII',
          code: `// Don't do this
this.logger.log('User login', { 
  email, 
  password  // NEVER log passwords!
});

// Do this
this.logger.log('User login', { 
  email,
  // No password
});`
        },
        {
          title: 'Don\'t log in tight loops',
          description: 'Avoid excessive logging that impacts performance',
          code: `// Don't do this
items.forEach(item => {
  this.logger.debug('Processing item', item);  // Too much!
});

// Do this
this.logger.debug('Processing items', { count: items.length });
// Log summary after batch
this.logger.log('Batch processed', { processed: items.length });`
        }
      ]
    },
    {
      category: 'Logger Configuration',
      do: [
        {
          title: 'Use multiple transports',
          description: 'Configure different transports for different needs',
          code: `LoggerModule.forRoot({
  transports: [
    { type: 'console', level: 'debug' },
    { type: 'file', filename: 'logs/app.log', level: 'info' },
    { type: 'file', filename: 'logs/error.log', level: 'error' }
  ]
})`
        },
        {
          title: 'Enable log rotation',
          description: 'Prevent log files from growing indefinitely',
          code: `{
  type: 'file',
  filename: 'logs/app.log',
  maxSize: '10m',
  maxFiles: 5,
  compress: true
}`
        },
        {
          title: 'Use JSON format in production',
          description: 'JSON logs are easier to parse and analyze',
          code: `LoggerModule.forRoot({
  format: process.env.NODE_ENV === 'production' 
    ? 'json' 
    : 'pretty'
})`
        }
      ],
      dont: [
        {
          title: 'Don\'t disable logging in production',
          description: 'You need logs to debug production issues',
          code: `// Don't do this
LoggerModule.forRoot({ silent: true });

// Do this
LoggerModule.forRoot({ level: 'warn' });`
        },
        {
          title: 'Don\'t forget about disk space',
          description: 'Always configure log rotation',
          code: `// Don't do this - unbounded growth
{ type: 'file', filename: 'app.log' }

// Do this - with rotation
{ 
  type: 'file', 
  filename: 'app.log',
  maxSize: '10m',
  maxFiles: 5
}`
        }
      ]
    },
    {
      category: 'Performance',
      do: [
        {
          title: 'Log async operations timing',
          description: 'Track performance of async operations',
          code: `const start = Date.now();
try {
  const result = await this.expensiveOperation();
  const duration = Date.now() - start;
  this.logger.log('Operation completed', { duration: \`\${duration}ms\` });
} catch (error) {
  const duration = Date.now() - start;
  this.logger.error('Operation failed', error.stack, { duration: \`\${duration}ms\` });
}`
        },
        {
          title: 'Create child loggers with context',
          description: 'Avoid repeating context in every log',
          code: `const requestLogger = this.logger.child({ 
  requestId: req.id,
  userId: req.user.id 
});

requestLogger.log('Processing request');
requestLogger.debug('Validating input');
requestLogger.log('Request completed');`
        }
      ],
      dont: [
        {
          title: 'Don\'t log large objects',
          description: 'Avoid logging huge payloads',
          code: `// Don't do this
this.logger.log('Data received', { data });  // Might be huge!

// Do this
this.logger.log('Data received', { 
  size: data.length,
  type: typeof data 
});`
        },
        {
          title: 'Don\'t synchronously write large logs',
          description: 'Use async transports for large volume',
          code: `// Ensure transports are async
LoggerModule.forRoot({
  transports: [
    { type: 'file', filename: 'app.log', async: true }
  ]
})`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Logs not appearing in console',
      symptoms: [
        'No log output visible',
        'Logger seems silent',
        'Only some log levels visible'
      ],
      solution: 'Check log level configuration and ensure Logger is properly initialized',
      code: `// Check log level
LoggerModule.forRoot({
  level: 'debug'  // Make sure it's not too restrictive
})

// Verify logger is initialized
const logger = new Logger('MyService');
logger.log('Test log');  // Should appear

// Check if logging is disabled
LoggerModule.forRoot({
  silent: false  // Make sure this is false
})`
    },
    {
      issue: 'Log files not being created',
      symptoms: [
        'File transport not working',
        'No log files in logs directory',
        'Permission errors'
      ],
      solution: 'Ensure logs directory exists and has write permissions',
      code: `// Create logs directory if it doesn't exist
import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Use absolute path
LoggerModule.forRoot({
  transports: [{
    type: 'file',
    filename: path.join(logsDir, 'app.log')
  }]
})`
    },
    {
      issue: 'Too many log files / Disk space issues',
      symptoms: [
        'Disk space running out',
        'Hundreds of log files',
        'Old logs not being deleted'
      ],
      solution: 'Configure proper log rotation and cleanup',
      code: `// Configure rotation
{
  type: 'file',
  filename: 'logs/app.log',
  maxSize: '10m',    // Rotate at 10MB
  maxFiles: 5,       // Keep only 5 files
  compress: true     // Gzip old files
}

// Add cleanup script
@Cron('0 0 * * 0')  // Weekly
async cleanOldLogs() {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  // Delete files older than 30 days
}`
    },
    {
      issue: 'Performance degradation with logging',
      symptoms: [
        'App slower than expected',
        'High CPU usage',
        'Logging causing delays'
      ],
      solution: 'Reduce log verbosity and use async transports',
      code: `// Use higher log level in production
LoggerModule.forRoot({
  level: 'warn',  // Less verbose
  transports: [
    { type: 'file', filename: 'app.log', async: true }  // Async
  ]
})

// Avoid logging in tight loops
// Don't log every iteration
for (const item of items) {
  // this.logger.debug('Item', item);  // Too much!
}
// Log summary instead
this.logger.log('Processed items', { count: items.length });`
    },
    {
      issue: 'Cannot inject Logger / Undefined logger',
      symptoms: [
        'Logger is undefined in constructor',
        'Cannot inject Logger',
        'TypeError: Cannot read property log'
      ],
      solution: 'Ensure LoggerModule is imported and Logger is instantiated correctly',
      code: `// Make sure LoggerModule is imported
@Module({
  imports: [LoggerModule.forRoot({ ... })]
})
export class AppModule {}

// Don't inject Logger, create it
@Injectable()
export class MyService {
  // Don't do this
  // constructor(private logger: Logger) {}
  
  // Do this
  private readonly logger = new Logger(MyService.name);
  
  someMethod() {
    this.logger.log('Works!');
  }
}`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform', '@nl-framework/http'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with LoggerModule and Logger',
        'Multiple transport support (console, file, http)',
        'Log levels: error, warn, info, debug, verbose',
        'Structured logging with JSON format',
        'Log rotation and file management',
        'Context-aware logging'
      ]
    }
  ]
};
