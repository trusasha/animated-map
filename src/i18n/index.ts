import type { Lang } from '../domain/types';
import { en } from './en';
import { ru } from './ru';
import type { KeyOf, Leaf, Namespace, PluralForms, Shape } from './keys';

export type Params = Record<string, string | number>;
export type T<D> = (key: KeyOf<D>, params?: Params) => string;

const isPlural = (v: Leaf | Namespace | undefined): v is PluralForms => typeof v === 'object' && v !== null && typeof (v as PluralForms).other === 'string';

const interpolate = (s: string, params?: Params) =>
  params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;

/** `count` picks the plural form (ru: one/few/many/other, en: one/other); other params fill `{name}` */
export function createT<D extends Namespace>(lang: Lang, dict: D): T<D> {
  const rules = new Intl.PluralRules(lang);
  return (key, params) => {
    let node: Leaf | Namespace | undefined = dict;
    for (const part of (key as string).split('.')) node = typeof node === 'object' && !isPlural(node) ? node[part] : undefined;
    if (node === undefined || (typeof node === 'object' && !isPlural(node))) return key;
    if (typeof node === 'string') return interpolate(node, params);
    const n = typeof params?.count === 'number' ? params.count : 0;
    return interpolate(node[rules.select(n)] ?? node.other, params);
  };
}

export type Dict = typeof en;
export type TFn = T<Shape<Dict>>;
export type Key = KeyOf<Dict>;
export const dictionaries: Record<Lang, Shape<Dict>> = { ru, en };

export const translator = (lang: Lang): TFn => createT(lang, dictionaries[lang]);

export type { KeyOf, Leaf, Namespace, PluralForms, Shape } from './keys';
