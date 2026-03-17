import os from 'node:os';
import path from 'node:path';
import { fileExists, readJsonFile, writeJsonFile } from '../core/fs';
import { info } from './output';

interface CliMeta {
  lastSeenVersion?: string;
}

function getCliMetaPath(): string {
  return path.join(os.homedir(), '.schema-forge', 'cli-meta.json');
}

function getReleaseUrl(version: string): string {
  return `https://github.com/xubylele/schema-forge/releases/tag/v${version}`;
}

export function extractChangelogSection(changelogText: string, version: string): string | null {
  const heading = `## ${version}`;
  const idx = changelogText.indexOf(heading);
  if (idx === -1) {
    return null;
  }
  const start = idx + heading.length;
  const rest = changelogText.slice(start);
  const nextHeading = rest.indexOf('\n## ');
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return section.trim() || null;
}

async function fetchChangelogForVersion(version: string): Promise<string | null> {
  const urls = [
    `https://raw.githubusercontent.com/xubylele/schema-forge/v${version}/CHANGELOG.md`,
    'https://raw.githubusercontent.com/xubylele/schema-forge/main/CHANGELOG.md'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const text = await res.text();
      const section = extractChangelogSection(text, version);
      if (section) return section;
    } catch {
    }
  }
  return null;
}

export function shouldShowWhatsNew(argv: string[]): boolean {
  if (argv.length === 0) {
    return false;
  }

  if (argv.includes('--help') || argv.includes('-h') || argv.includes('--version') || argv.includes('-V')) {
    return false;
  }

  return true;
}

export async function showWhatsNewIfUpdated(currentVersion: string, argv: string[]): Promise<void> {
  if (!shouldShowWhatsNew(argv)) {
    return;
  }

  try {
    const metaPath = getCliMetaPath();
    const meta = await readJsonFile<CliMeta>(metaPath, {});

    if (meta.lastSeenVersion === currentVersion) {
      return;
    }

    const section = await fetchChangelogForVersion(currentVersion);
    if (section) {
      info(`What's new in schema-forge v${currentVersion}:`);
      info(section);
      info(`Release: ${getReleaseUrl(currentVersion)}`);
    } else {
      info(`What's new in schema-forge v${currentVersion}: ${getReleaseUrl(currentVersion)}`);
    }
    await writeJsonFile(metaPath, { lastSeenVersion: currentVersion });
  } catch {
  }
}

export async function seedLastSeenVersion(version: string): Promise<void> {
  const metaPath = getCliMetaPath();
  const exists = await fileExists(metaPath);

  if (!exists) {
    await writeJsonFile(metaPath, { lastSeenVersion: version });
  }
}
