import { z, type ZodTypeAny } from 'zod';

import { FormSchema } from '@/constants';

function getHtmlInputType(schema: ZodTypeAny, fieldName: string): string {
  const baseSchema =
    schema instanceof z.ZodOptional ? schema._def.innerType : schema;

  if (baseSchema instanceof z.ZodString) {
    if (fieldName === 'country') {
      return 'select';
    }
    if (fieldName === 'about' || fieldName === 'interest_about_company') {
      return 'textarea';
    }
    if (baseSchema._def.checks.some((check) => check.kind === 'email')) {
      return 'email';
    }
    if (baseSchema._def.checks.some((check) => check.kind === 'url')) {
      return 'url';
    }
    return 'text';
  }
  if (baseSchema instanceof z.ZodNumber) return 'number';
  if (baseSchema instanceof z.ZodBoolean) return 'checkbox';
  if (baseSchema instanceof z.ZodObject) return 'object';
  if (baseSchema instanceof z.ZodArray) return 'array';
  if (baseSchema instanceof z.ZodEffects) {
    if (fieldName === 'last_working_day') return 'date';
  }
  return 'text';
}

export const FormValues = Object.entries(FormSchema.shape).map(
  ([key, schema]) => {
    return {
      value: key,
      type: getHtmlInputType(schema, key),
    };
  }
);
