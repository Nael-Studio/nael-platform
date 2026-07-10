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
    const fallbackProperty = error.target?.constructor?.name ?? '<root>';
    const property = error.property
      ? (parentPath ? `${parentPath}.${error.property}` : error.property)
      : (parentPath || fallbackProperty);
    const constraints = error.constraints ? (Object.values(error.constraints) as string[]) : [];

    if (constraints.length) {
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
    let issues = flattenValidationErrors(errors);
    if (!issues.length) {
      issues = [
        {
          property: metatype.name,
          constraints: [
            `${metatype.name} was rejected as an unknown value: it carries no class-validator metadata. ` +
              'Add at least one validation decorator (e.g. @IsOptional(), @IsString()) to the class, ' +
              'or pass validatorOptions: { forbidUnknownValues: false }.',
          ],
        },
      ];
    }
    throw new ValidationException(issues);
  }

  return instance;
};
