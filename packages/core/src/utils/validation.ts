import { plainToInstance, type ClassTransformOptions } from 'class-transformer';
import {
  validate,
  type ValidationError as ClassValidatorError,
  type ValidatorOptions,
} from 'class-validator';
import type { ClassType } from '../interfaces/provider';

export interface ValidationIssue {
  property: string;
  constraints: string[];
}

export class ValidationException extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

export interface TransformValidationOptions<T> {
  metatype: ClassType<T>;
  value: unknown;
  transformOptions?: ClassTransformOptions;
  validatorOptions?: ValidatorOptions;
  sanitize?: boolean;
  validate?: boolean;
}

const DEFAULT_TRANSFORM_OPTIONS: ClassTransformOptions = {
  exposeDefaultValues: true,
  enableImplicitConversion: true,
};

const DEFAULT_VALIDATOR_OPTIONS: ValidatorOptions = {
  whitelist: true,
  forbidUnknownValues: true,
};

const flattenValidationErrors = (
  errors: ClassValidatorError[],
  parentPath = '',
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (const error of errors) {
    const property = error.property ? (parentPath ? `${parentPath}.${error.property}` : error.property) : parentPath;
    const constraints = error.constraints ? (Object.values(error.constraints) as string[]) : [];

    if (constraints.length && property) {
      issues.push({ property, constraints });
    }

    if (error.children && error.children.length) {
      issues.push(...flattenValidationErrors(error.children, property));
    }
  }

  return issues;
};

export const transformAndValidate = async <T>(options: TransformValidationOptions<T>): Promise<T> => {
  const {
    metatype,
    value,
    transformOptions,
    validatorOptions,
    sanitize = true,
    validate: shouldValidate = true,
  } = options;

  const combinedTransformOptions: ClassTransformOptions = {
    ...DEFAULT_TRANSFORM_OPTIONS,
    ...transformOptions,
  };

  const instance = plainToInstance(metatype, value ?? {}, combinedTransformOptions);

  if (!shouldValidate) {
    return instance;
  }

  const combinedValidatorOptions: ValidatorOptions = {
    ...DEFAULT_VALIDATOR_OPTIONS,
    whitelist: sanitize,
    ...validatorOptions,
  };

  const errors = await validate(instance as object, combinedValidatorOptions);
  if (errors.length) {
    throw new ValidationException(flattenValidationErrors(errors));
  }

  return instance;
};
