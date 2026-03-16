export function nowTimestamp(): string {
  const date = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');

  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

export function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  ) || 'migration';
}

export type MigrationFileNameFormat = 'hyphen' | 'underscore';

export function migrationFileName(
  timestamp: string,
  slug: string,
  format: MigrationFileNameFormat = 'hyphen'
): string {
  const sep = format === 'underscore' ? '_' : '-';
  return `${timestamp}${sep}${slug}.sql`;
}
