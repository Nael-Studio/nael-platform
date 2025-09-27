export class ScalarToken {
  constructor(public readonly name: string) {}
}

export const ID = new ScalarToken('ID');
export const Int = new ScalarToken('Int');
export const Float = new ScalarToken('Float');
export const BooleanScalar = new ScalarToken('Boolean');
export const StringScalar = new ScalarToken('String');
export const DateTime = new ScalarToken('DateTime');

export type ScalarResolvable =
  | ScalarToken
  | BooleanConstructor
  | NumberConstructor
  | StringConstructor
  | DateConstructor;
