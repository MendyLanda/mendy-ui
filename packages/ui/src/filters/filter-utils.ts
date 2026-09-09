export function parseFilterValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n\t]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}
