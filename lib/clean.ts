export function deepClean<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleanedArr = value
      .map(deepClean)
      .filter((v) => v !== undefined) as unknown as T;
    return cleanedArr;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, any>;
    const out: Record<string, any> = {};

    for (const [k, v] of Object.entries(obj)) {
      const cleaned = deepClean(v);

      if (cleaned === undefined || cleaned === null) continue;

      if (typeof cleaned === "string" && cleaned.trim() === "") continue;

      if (
        typeof cleaned === "object" &&
        !Array.isArray(cleaned) &&
        Object.keys(cleaned).length === 0
      ) {
        continue;
      }

      if (Array.isArray(cleaned) && cleaned.length === 0) continue;

      out[k] = cleaned;
    }

    return out as T;
  }

  return value;
}
