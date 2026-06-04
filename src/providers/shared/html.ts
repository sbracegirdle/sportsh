export function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·");
}

export function extractNextData(html: string): unknown | undefined {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(?<json>.*?)<\/script>/s);
  if (!match?.groups?.json) {
    return undefined;
  }

  try {
    return JSON.parse(match.groups.json);
  } catch {
    return undefined;
  }
}

export function walkJson(value: unknown, visit: (object: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visit);
    }
    return;
  }

  const object = value as Record<string, unknown>;
  visit(object);

  for (const nested of Object.values(object)) {
    walkJson(nested, visit);
  }
}
