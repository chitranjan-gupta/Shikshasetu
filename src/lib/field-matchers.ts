import defaultRules from '../field-matchers.json';

import type { FormSchemaType } from '@/types';

function sanitize(value: string) {
  return value.trim().toLowerCase();
}

export type FillField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

type Fill = (input: FillField, data: FormSchemaType) => boolean;
type MatchBy = 'name' | 'type' | 'id' | 'autocomplete';

export type FieldRule = {
  by: MatchBy;
  keys: string[];
  path?: string;
  gender?: string;
};

const matchOrder: MatchBy[] = ['name', 'type', 'id', 'autocomplete'];
const blockedPath = new Set(['__proto__', 'constructor', 'prototype']);

function isMatchBy(value: unknown): value is MatchBy {
  return matchOrder.includes(value as MatchBy);
}

export function rulesFromJson(value: unknown): FieldRule[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const rules = value.filter((rule): rule is FieldRule => {
    if (!rule || typeof rule !== 'object') {
      return false;
    }
    const candidate = rule as FieldRule;
    const hasTarget =
      typeof candidate.path === 'string' || typeof candidate.gender === 'string';
    return (
      isMatchBy(candidate.by) &&
      Array.isArray(candidate.keys) &&
      candidate.keys.length > 0 &&
      candidate.keys.every((key) => typeof key === 'string') &&
      hasTarget
    );
  });
  return rules.length > 0 ? rules : null;
}

function readPath(data: FormSchemaType, path: string) {
  let current: unknown = data;
  for (const part of path.split('.')) {
    if (!/^[A-Za-z0-9_]+$/.test(part) || blockedPath.has(part)) {
      return undefined;
    }
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (
    typeof current === 'string' ||
    typeof current === 'number' ||
    typeof current === 'boolean'
  ) {
    return String(current);
  }
  return undefined;
}

function text(path: string): Fill {
  return (input, data) => {
    input.value = readPath(data, path) ?? '';
    return true;
  };
}

function gender(expected: string): Fill {
  return (input, data) => {
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }
    input.checked = (data.gender?.toLowerCase() ?? '') === expected;
    return true;
  };
}

function indexRules(rules: FieldRule[]) {
  const tables: Record<MatchBy, Map<string, Fill>> = {
    name: new Map(),
    type: new Map(),
    id: new Map(),
    autocomplete: new Map(),
  };
  rules.forEach((rule) => {
    const fill = rule.gender ? gender(rule.gender) : text(rule.path || '');
    rule.keys.forEach((key) => {
      tables[rule.by].set(sanitize(key), fill);
    });
  });
  return tables;
}

const bundledRules = rulesFromJson(defaultRules) ?? [];
let activeFields = indexRules(bundledRules);

export function setFieldMatchers(value: unknown) {
  const rules = rulesFromJson(value);
  if (!rules) {
    return false;
  }
  activeFields = indexRules(rules);
  return true;
}

export function resetFieldMatchers() {
  activeFields = indexRules(bundledRules);
}

export async function fetchFieldMatcherRules(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return rulesFromJson(await response.json());
}

function attribute(input: FillField, by: MatchBy) {
  if (by === 'name') return input.name;
  if (by === 'type') return input.type;
  if (by === 'id') return input.id;
  return input.autocomplete;
}

type CustomField = {
  search_type?: string;
  selector?: string;
  value?: string;
};

type CustomHit = { value: string; order: number };
type CustomIndex = Record<'name' | 'id' | 'class' | 'autocomplete', Map<string, CustomHit>>;

function emptyCustomIndex(): CustomIndex {
  return {
    name: new Map(),
    id: new Map(),
    class: new Map(),
    autocomplete: new Map(),
  };
}

let customSource: FormSchemaType | null = null;
let customIndex = emptyCustomIndex();

function customFieldsFor(data: FormSchemaType) {
  if (data === customSource) {
    return customIndex;
  }
  const index = emptyCustomIndex();
  ((data.custom_fields || []) as unknown as CustomField[]).forEach((field, order) => {
    const bucket = index[field.search_type as keyof CustomIndex];
    if (!bucket) {
      return;
    }
    bucket.set(sanitize(field.selector || ''), {
      value: field.value ?? '',
      order,
    });
  });
  customSource = data;
  customIndex = index;
  return index;
}

function customValue(input: FillField, index: CustomIndex) {
  const hits = [
    index.name.get(sanitize(input.name || '')),
    index.id.get(sanitize(input.id || '')),
    index.class.get(sanitize(input.className || '')),
    index.autocomplete.get(sanitize(input.autocomplete || '')),
  ].filter((hit): hit is CustomHit => Boolean(hit));
  if (hits.length === 0) {
    return undefined;
  }
  return hits.reduce((best, hit) => (hit.order >= best.order ? hit : best)).value;
}

export function fillProfileField(input: FillField, data: FormSchemaType) {
  for (const by of matchOrder) {
    const fill = activeFields[by].get(sanitize(attribute(input, by) || ''));
    if (fill && fill(input, data)) {
      return;
    }
  }

  const custom = customValue(input, customFieldsFor(data));
  if (typeof custom !== 'undefined') {
    input.value = custom;
  }
}
