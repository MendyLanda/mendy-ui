// Routers that parse JSON globally must receive a string, even when the filter
// codec happens to serialize an array, object, number, or JSON-looking text.
const prefix = "~ui:";
export function encodeUrlValue(value: string): string {
  if (value.startsWith(prefix)) return prefix + value;
  try {
    JSON.parse(value);
    return prefix + value;
  } catch {
    return value;
  }
}
export function decodeUrlValue(value: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
