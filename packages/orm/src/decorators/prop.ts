import type { PropMetadata, PropTransform } from '../interfaces/document';
import { getDocumentMetadata } from './document';
import type { DocumentClass } from '../interfaces/document';

export interface PropOptions {
  /** Whether the field is required. Defaults to `true`; set `false` for optional fields. */
  required?: boolean;
  /** A literal default, or a zero-arg factory invoked per write when the field is missing. */
  default?: unknown;
  /** Enum object the value is drawn from (passed through to hydration/metadata). */
  enum?: object;
  /** Shorthand for a unique single-field index on this property. */
  unique?: boolean;
  /** Shorthand for a single-field index (`true`/`1` ascending, `-1` descending). */
  index?: boolean | 1 | -1;
  /** Value transforms applied on write (`to`) and read (`from`). */
  transform?: PropTransform;
  /** Explicit design type, when `emitDecoratorMetadata` cannot infer it. */
  type?: unknown;
}

const reflectDesignType = (target: object, propertyKey: string): unknown => {
  const reflector = (globalThis as { Reflect?: { getMetadata?: (k: string, t: object, p: string) => unknown } })
    .Reflect;
  if (reflector && typeof reflector.getMetadata === 'function') {
    return reflector.getMetadata('design:type', target, propertyKey);
  }
  return undefined;
};

/**
 * Declare a persisted field. Captures reflected type + options into the owning
 * document's `DocumentMetadata.props`, which drives hydration (6a), validation
 * (6b), and derived indexes.
 */
export const Prop =
  (options: PropOptions = {}): PropertyDecorator =>
  (target, propertyKey) => {
    if (typeof propertyKey !== 'string') {
      return;
    }

    const documentClass = (target as { constructor: DocumentClass }).constructor;
    const metadata = getDocumentMetadata(documentClass);
    metadata.props ??= [];

    const prop: PropMetadata = {
      propertyKey,
      designType: options.type ?? reflectDesignType(target, propertyKey),
      required: options.required ?? true,
      default: options.default,
      enum: options.enum,
      unique: options.unique,
      index: options.index,
      transform: options.transform,
    };

    // Last decorator wins if a property is somehow decorated twice.
    const existingIndex = metadata.props.findIndex((p) => p.propertyKey === propertyKey);
    if (existingIndex >= 0) {
      metadata.props[existingIndex] = prop;
    } else {
      metadata.props.push(prop);
    }
  };
