export function parseAutofillPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== 'object' || !('data' in value)) {
    return [];
  }

  const data = (value as { data: unknown }).data;
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
