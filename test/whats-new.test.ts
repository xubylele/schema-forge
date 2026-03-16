import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractChangelogSection,
  seedLastSeenVersion,
  shouldShowWhatsNew,
  showWhatsNewIfUpdated
} from '../src/utils/whatsNew';

describe('whats new notice', () => {
  let tempHome: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-home-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('shouldShowWhatsNew', () => {
    it('returns false for help and version flags', () => {
      expect(shouldShowWhatsNew([])).toBe(false);
      expect(shouldShowWhatsNew(['--help'])).toBe(false);
      expect(shouldShowWhatsNew(['-h'])).toBe(false);
      expect(shouldShowWhatsNew(['--version'])).toBe(false);
      expect(shouldShowWhatsNew(['-V'])).toBe(false);
    });

    it('returns true for command invocations', () => {
      expect(shouldShowWhatsNew(['generate'])).toBe(true);
      expect(shouldShowWhatsNew(['validate', '--json'])).toBe(true);
    });
  });

  it('seeds metadata only once', async () => {
    await seedLastSeenVersion('1.0.0');
    await seedLastSeenVersion('2.0.0');

    const metaPath = path.join(tempHome, '.schema-forge', 'cli-meta.json');
    const raw = await fs.readFile(metaPath, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ lastSeenVersion: '1.0.0' });
  });

  it('shows notice once when version changes', async () => {
    const metaDir = path.join(tempHome, '.schema-forge');
    await fs.mkdir(metaDir, { recursive: true });
    await fs.writeFile(
      path.join(metaDir, 'cli-meta.json'),
      JSON.stringify({ lastSeenVersion: '1.0.0' }),
      'utf-8'
    );

    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await showWhatsNewIfUpdated('1.1.0', ['generate']);
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("What's new"))).toBe(true);

    logSpy.mockClear();
    await showWhatsNewIfUpdated('1.1.0', ['generate']);
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe('extractChangelogSection', () => {
  it('returns the section for the given version', () => {
    const changelog = `# Changelog

## 1.11.0

### Minor Changes

- feat(generate): add option

## 1.10.1

### Patch Changes

- docs: update
`;
    const section = extractChangelogSection(changelog, '1.11.0');
    expect(section).toBe(`### Minor Changes

- feat(generate): add option`);
  });

  it('returns null when version heading is not present', () => {
    const changelog = `## 1.10.0\n- change`;
    expect(extractChangelogSection(changelog, '1.11.0')).toBeNull();
  });

  it('returns content until end of file when no next heading', () => {
    const changelog = `## 1.0.0

- initial
`;
    const section = extractChangelogSection(changelog, '1.0.0');
    expect(section).toBe('- initial');
  });

  it('returns null when section is empty after heading', () => {
    const changelog = `## 1.0.0

## 0.9.0`;
    const section = extractChangelogSection(changelog, '1.0.0');
    expect(section).toBeNull();
  });
});
