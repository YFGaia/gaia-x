import { app, BrowserWindow } from "electron";
import path from "path";
import fs from "fs-extra";
import { download } from "electron-dl";
import extract from "extract-zip";
import { Plugin, PluginManifest } from "@/types/ipc/plugin";

interface PluginConfig {
  plugins: {
    [key: string]: {
      enabled: boolean;
      installTime: string;
    };
  };
}

export class PluginManager {
  private pluginsPath: string;

  constructor() {
    this.pluginsPath = path.join(app.getPath("userData"), "plugins");
    fs.ensureDirSync(this.pluginsPath);
  }

  async getInstalledPlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];
    const dirs = await fs.readdir(this.pluginsPath);

    for (const dir of dirs) {
      const manifestPath = path.join(this.pluginsPath, dir, "manifest.json");

      try {
        if (await fs.pathExists(manifestPath)) {
          const manifest: PluginManifest = await fs.readJson(manifestPath);
          plugins.push({
            id: manifest.id,
            name: manifest.name,
            description: manifest.description,
            version: manifest.version,
            author: manifest.author,
            autoUpdate: true,
            detail: manifest.detail,
            changelog: manifest.changelog,
            installed: true,
          });
        }
      } catch (error) {
        console.error(`Failed to read manifest file for plugin ${dir}:`, error);
      }
    }

    return plugins;
  }

  async installPlugin(
    pluginId: string,
    downloadUrl: string,
    window: BrowserWindow
  ): Promise<void> {
    try {
      // 下载插件
      const dl = await download(window, downloadUrl, {
        directory: this.pluginsPath,
        filename: `${pluginId}.zip`,
        onProgress: (progress) => {
          window.webContents.send("plugin-download-progress", {
            pluginId,
            progress: progress.percent * 100,
          });
        },
      });

      // 解压插件
      const extractPath = path.join(this.pluginsPath, pluginId);
      await extract(dl.getSavePath(), { dir: extractPath });

      // 清理下载文件
      await fs.remove(dl.getSavePath());

      // 验证插件
      await this.validatePlugin(extractPath);

      // 保存插件配置
      await this.savePluginConfig(pluginId);
    } catch (error) {
      console.error(`Failed to download plugin ${pluginId}:`, error);
      throw error;
    }
  }

  private async validatePlugin(extractPath: string): Promise<void> {
    const manifestPath = path.join(extractPath, "manifest.json");

    if (!(await fs.pathExists(manifestPath))) {
      throw new Error("Manifest file not found in the plugin package");
    }

    const manifest: PluginManifest = await fs.readJson(manifestPath);

    // 验证插件的必要字段
    const requiredFields = ["id", "name", "version"];
    for (const field of requiredFields) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(
          `Required field ${field} is missing in the manifest file`
        );
      }
    }
  }

  private async savePluginConfig(pluginId: string): Promise<void> {
    const configPath = path.join(this.pluginsPath, "plugins.json");

    let config: PluginConfig = { plugins: {} };

    try {
      if (await fs.pathExists(configPath)) {
        config = await fs.readJson(configPath);
      }

      config.plugins[pluginId] = {
        enabled: true,
        installTime: new Date().toISOString(),
      };

      await fs.writeJson(configPath, config);
    } catch (error) {
      console.error(`Failed to save plugin config for ${pluginId}:`, error);
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const pluginPath = path.join(this.pluginsPath, pluginId);
    try {
      await fs.remove(pluginPath);

      await this.removePluginConfig(pluginId);
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  private async removePluginConfig(pluginId: string): Promise<void> {
    const configPath = path.join(this.pluginsPath, "plugins.json");

    if (!(await fs.pathExists(configPath))) {
      return;
    }
    try {
      const config: PluginConfig = await fs.readJson(configPath);
      delete config.plugins[pluginId];
      await fs.writeJson(configPath, config);
    } catch (error) {
      console.error(`Failed to remove plugin config for ${pluginId}:`, error);
      throw error;
    }
  }
}
