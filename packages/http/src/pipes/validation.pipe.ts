import type { ClassType } from '@nl-framework/core';
import { transformAndValidate, ValidationException } from '@nl-framework/core';
import { HttpException } from '../exceptions/http-exception';
import type { PipeTransform, ArgumentMetadata } from './pipe-transform.interface';

export interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  groups?: string[];
  exceptionFactory?: (errors: any) => any;
}

export class ValidationPipe implements PipeTransform<any> {
  constructor(private readonly options: ValidationPipeOptions = {}) { }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    try {
      const transformed = await transformAndValidate({
        metatype,
        value,
        sanitize: this.options.whitelist !== false,
        validate: true,
        validatorOptions: {
          skipMissingProperties: this.options.skipMissingProperties,
          groups: this.options.groups,
          whitelist: this.options.whitelist !== false,
          forbidNonWhitelisted: this.options.forbidNonWhitelisted,
        },
      });

      return this.options.transform !== false ? transformed : value;
    } catch (error) {
      if (error instanceof ValidationException) {
        if (this.options.exceptionFactory) {
          throw this.options.exceptionFactory(error.issues);
        }

        throw HttpException.badRequest(
          'Validation failed',
          error
        );
      }
      throw error;
    }
  }

  private toValidate(metatype: any): metatype is ClassType {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
