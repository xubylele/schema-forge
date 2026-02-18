import * as path from 'path';

/**
 * Path utility functions for SchemaForge
 */

export class PathManager {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Resolve a path relative to the base directory
   */
  resolve(...paths: string[]): string {
    return path.resolve(this.baseDir, ...paths);
  }

  /**
   * Get the schema directory path
   */
  getSchemaDir(schemaDir: string = 'schemas'): string {
    return this.resolve(schemaDir);
  }

  /**
   * Get the output directory path
   */
  getOutputDir(outputDir: string = 'output'): string {
    return this.resolve(outputDir);
  }

  /**
   * Get the migration directory path
   */
  getMigrationDir(migrationDir: string = 'migrations'): string {
    return this.resolve(migrationDir);
  }

  /**
   * Get the config file path
   */
  getConfigPath(configFile: string = 'schemaforge.config.json'): string {
    return this.resolve(configFile);
  }

  /**
   * Normalize a path
   */
  normalize(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Get the relative path from base directory
   */
  relative(filePath: string): string {
    return path.relative(this.baseDir, filePath);
  }

  /**
   * Check if path is absolute
   */
  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Get directory name
   */
  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get base name
   */
  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  /**
   * Get file extension
   */
  extname(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Join paths
   */
  join(...paths: string[]): string {
    return path.join(...paths);
  }
}

export const defaultPathManager = new PathManager();
