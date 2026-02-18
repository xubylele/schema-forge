import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File system utility functions for SchemaForge
 */

export class FileSystemManager {
  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a directory
   */
  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a file
   */
  async isFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return await fs.readFile(filePath, encoding);
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    await fs.writeFile(filePath, content, encoding);
  }

  /**
   * Append to file
   */
  async appendFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    await fs.appendFile(filePath, content, encoding);
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  /**
   * Create directory (recursive by default)
   */
  async createDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    await fs.mkdir(dirPath, { recursive });
  }

  /**
   * Read directory contents
   */
  async readDirectory(dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath);
  }

  /**
   * Read directory with file types
   */
  async readDirectoryWithTypes(dirPath: string): Promise<fsSync.Dirent[]> {
    return await fs.readdir(dirPath, { withFileTypes: true });
  }

  /**
   * Copy file
   */
  async copyFile(source: string, destination: string): Promise<void> {
    await fs.copyFile(source, destination);
  }

  /**
   * Move/rename file
   */
  async moveFile(oldPath: string, newPath: string): Promise<void> {
    await fs.rename(oldPath, newPath);
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<fsSync.Stats> {
    return await fs.stat(filePath);
  }

  /**
   * Read JSON file
   */
  async readJsonFile<T = any>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }

  /**
   * Write JSON file
   */
  async writeJsonFile(filePath: string, data: any, pretty: boolean = true): Promise<void> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await this.writeFile(filePath, content);
  }

  /**
   * Find files matching pattern recursively
   */
  async findFiles(dirPath: string, pattern: RegExp): Promise<string[]> {
    const results: string[] = [];

    const items = await this.readDirectoryWithTypes(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const subResults = await this.findFiles(fullPath, pattern);
        results.push(...subResults);
      } else if (item.isFile() && pattern.test(item.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Ensure directory exists, create if not
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    if (!(await this.exists(dirPath))) {
      await this.createDirectory(dirPath);
    }
  }
}

export const defaultFsManager = new FileSystemManager();
