import { FileSystemManager, defaultFsManager } from './fs';
import { PathManager, defaultPathManager } from './paths';
import { SchemaForgeConfig } from './types';

/**
 * State manager for SchemaForge configuration and state
 */

export class StateManager {
  private fsManager: FileSystemManager;
  private pathManager: PathManager;
  private config: SchemaForgeConfig | null = null;

  constructor(
    fsManager: FileSystemManager = defaultFsManager,
    pathManager: PathManager = defaultPathManager
  ) {
    this.fsManager = fsManager;
    this.pathManager = pathManager;
  }

  /**
   * Initialize a new SchemaForge project
   */
  async initializeProject(directory: string = '.', force: boolean = false): Promise<void> {
    const configPath = this.pathManager.resolve(directory, 'schemaforge.config.json');

    // Check if config already exists
    if (await this.fsManager.exists(configPath) && !force) {
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
    await this.fsManager.writeJsonFile(configPath, defaultConfig);

    // Create directories
    await this.fsManager.ensureDirectory(this.pathManager.resolve(directory, defaultConfig.schemaDir));
    await this.fsManager.ensureDirectory(this.pathManager.resolve(directory, defaultConfig.outputDir));
    await this.fsManager.ensureDirectory(this.pathManager.resolve(directory, defaultConfig.migrationDir));

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

    const exampleSchemaPath = this.pathManager.resolve(
      directory,
      defaultConfig.schemaDir,
      'example.schema.json'
    );
    await this.fsManager.writeJsonFile(exampleSchemaPath, exampleSchema);

    this.config = defaultConfig;
  }

  /**
   * Load configuration from file
   */
  async loadConfig(directory: string = '.'): Promise<SchemaForgeConfig> {
    const configPath = this.pathManager.resolve(directory, 'schemaforge.config.json');

    if (!(await this.fsManager.exists(configPath))) {
      throw new Error('SchemaForge project not initialized. Run "schemaforge init" first.');
    }

    this.config = await this.fsManager.readJsonFile<SchemaForgeConfig>(configPath);
    return this.config;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: SchemaForgeConfig, directory: string = '.'): Promise<void> {
    const configPath = this.pathManager.resolve(directory, 'schemaforge.config.json');
    await this.fsManager.writeJsonFile(configPath, config);
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
    const configPath = this.pathManager.resolve(directory, 'schemaforge.config.json');
    return await this.fsManager.exists(configPath);
  }

  /**
   * Get schema directory path
   */
  getSchemaDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return this.pathManager.resolve(this.config.schemaDir);
  }

  /**
   * Get output directory path
   */
  getOutputDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return this.pathManager.resolve(this.config.outputDir);
  }

  /**
   * Get migration directory path
   */
  getMigrationDir(): string {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    return this.pathManager.resolve(this.config.migrationDir);
  }
}

export const defaultStateManager = new StateManager();
