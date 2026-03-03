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

    info(`What's new in schema-forge v${currentVersion}: ${getReleaseUrl(currentVersion)}`);
    await writeJsonFile(metaPath, { lastSeenVersion: currentVersion });
  } catch {
    // Best effort only: never block CLI execution for UX metadata.
  }
}

export async function seedLastSeenVersion(version: string): Promise<void> {
  const metaPath = getCliMetaPath();
  const exists = await fileExists(metaPath);

  if (!exists) {
    await writeJsonFile(metaPath, { lastSeenVersion: version });
  }
}
