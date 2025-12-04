import { HttpException } from '../exceptions/http-exception';
import type { PipeTransform, ArgumentMetadata } from './pipe-transform.interface';

export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw HttpException.badRequest(`Validation failed (numeric string expected for ${metadata.data || 'parameter'})`);
    }
    return val;
  }
}

export class ParseFloatPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseFloat(value);
    if (isNaN(val)) {
      throw HttpException.badRequest(`Validation failed (numeric string expected for ${metadata.data || 'parameter'})`);
    }
    return val;
  }
}

export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }
    throw HttpException.badRequest(`Validation failed (boolean string expected for ${metadata.data || 'parameter'})`);
  }
}

export class ParseArrayPipe implements PipeTransform<string | string[], string[]> {
  constructor(private readonly options?: { separator?: string; items?: PipeTransform }) { }

  async transform(value: string | string[], metadata: ArgumentMetadata): Promise<string[]> {
    if (Array.isArray(value)) {
      if (this.options?.items) {
        return Promise.all(
          value.map((item) => this.options!.items!.transform(item, { ...metadata, type: 'custom' }))
        );
      }
      return value;
    }

    const separator = this.options?.separator || ',';
    const items = value.split(separator).map((item) => item.trim());

    if (this.options?.items) {
      return Promise.all(
        items.map((item) => this.options!.items!.transform(item, { ...metadata, type: 'custom' }))
      );
    }

    return items;
  }
}

export class DefaultValuePipe<T = any> implements PipeTransform<T, T> {
  constructor(private readonly defaultValue: T) { }

  transform(value: T): T {
    if (value === undefined || value === null || value === '') {
      return this.defaultValue;
    }
    return value;
  }
}
