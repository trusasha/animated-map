export type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Leaf = string | PluralForms;
export type Namespace = { [k: string]: Leaf | Namespace };

/** shape a translation must have, derived from the English source: every key present, plurals may use more forms */
export type Shape<T> = T extends string ? string : T extends { other: string } ? PluralForms : { [K in keyof T]: Shape<T[K]> };

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | { other: string } ? Join<P, K> : Paths<T[K], Join<P, K>>;
}[keyof T & string];

export type KeyOf<D> = Paths<D>;
