import path from 'path';
import { SchemaForgeConfig } from '../types/types';
import { ensureDir, fileExists, readJsonFile, writeJsonFile } from './fs';

/**
 * State manager for SchemaForge configuration and state
 */

export class StateManager {
  private config: SchemaForgeConfig | null = null;
  private root: string;

  constructor(root: string = process.cwd()) {
    this.root = root;
  }

  /**
   * Initialize a new SchemaForge project
   */
  async initializeProject(directory: string = '.', force: boolean = false): Promise<void> {
    const configPath = path.join(directory, 'schemaforge.config.json');

    // Check if config already exists
    if (await fileExists(configPath) && !force) {
      throw new Error('SchemaForge project already initialized. Use --force to overwrite.');
    }

    // Create default configuration
    const defaultConfig: SchemaForgeConfig = {
      version: '1.0.0',
      database: 'postgres',
      schemaDir: 'schemas',
      outputDir: 'output',
      migrationDir: 'migrations',
    };

    // Write config file
    await writeJsonFile(configPath, defaultConfig);

    // Create directories
    await ensureDir(path.join(directory, defaultConfig.schemaDir));
    await ensureDir(path.join(directory, defaultConfig.outputDir));
    await ensureDir(path.join(directory, defaultConfig.migrationDir));

    // Create example schema
    const exampleSchema = {
      version: '1.0.0',
      database: 'postgres',
      tables: [
        {
          name: 'users',
          fields: [
            { name: 'id', type: 'uuid', required: true, unique: true },
            { name: 'email', type: 'string', required: true, unique: true, length: 255 },
            { name: 'name', type: 'string', required: true, length: 255 },
            { name: 'created_at', type: 'datetime', required: true },
          ],
          indexes: [
            { name: 'idx_users_email', fields: ['email'], unique: true },
          ],
        },
      ],
    };

    const exampleSchemaPath = path.join(
      directory,
      defaultConfig.schemaDir,
      'example.schema.json'
    );
    await writeJsonFile(exampleSchemaPath, exampleSchema);

    this.config = defaultConfig;
  }

  /**
   * Load configuration from file
   */
  async loadConfig(directory: string = '.'): Promise<SchemaForgeConfig> {
    const configPath = path.join(directory, 'schemaforge.config.json');

    if (!(await fileExists(configPath))) {
      throw new Error('SchemaForge project not initialized. Run "schemaforge init" first.');
    }

    this.config = await readJsonFile<SchemaForgeConfig>(configPath, {} as SchemaForgeConfig);
    return this.config;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: SchemaForgeConfig, directory: string = '.'): Promise<void> {
    const configPath = path.join(directory, 'schemaforge.config.json');
    await writeJsonFile(configPath, config);
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): SchemaForgeConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SchemaForgeConfig>): void {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if project is initialized
   */
  async isInitialized(directory: string = '.'): Promise<boolean> {
    const configPath = path.join(directory, 'schemaforge.config.json');
    return await fileExists(configPath);
  }

  /**
   * Get schema directory path
   */
  getSchemaDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return path.join(this.root, this.config.schemaDir);
  }

  /**
   * Get output directory path
   */
  getOutputDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return path.join(this.root, this.config.outputDir);
  }

  /**
   * Get migration directory path
   */
  getMigrationDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return path.join(this.root, this.config.migrationDir);
  }
}

export const defaultStateManager = new StateManager();
