import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import pkg from './package.json';
import minimist from 'minimist';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  rmSync('dist-electron', { recursive: true, force: true });

  const isServe = command === 'serve';
  const isBuild = command === 'build';
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

  // 获取命令行参数
  const argv = minimist(process.argv.slice(2));

  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
        '~': path.join(__dirname, 'electron'),
      },
    },
    envDir: path.join(__dirname),
    plugins: [
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main/index.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App');
            } else {
              // 传递参数给 Electron
              args.startup();
            }
          },
          vite: {
            resolve: {
              alias: {
                '@': path.join(__dirname, 'src'),
                '~': path.join(__dirname, 'electron'),
              },
            },
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'electron/preload/index.ts',
          vite: {
            resolve: {
              alias: {
                '@': path.join(__dirname, 'src'),
                '~': path.join(__dirname, 'electron'),
              },
            },
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
    ],
    server: process.env.VSCODE_DEBUG
      ? (() => {
          const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
          return {
            host: url.hostname,
            port: +url.port,
          };
        })()
      : {
          host: '127.0.0.1',
          port: 7777,
        },
    clearScreen: true,
    cacheDir: '.vite-cache',
    build: {
      incremental: true,
      emptyOutDir: false,
      sourcemap: process.env.NODE_ENV !== 'production',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          toolbar: path.resolve(__dirname, 'toolbar.html'),
          login: path.resolve(__dirname, 'login.html'),
          update: path.resolve(__dirname, 'update.html'),
        },
        output: {
          manualChunks: {
            // 手动代码分割策略
            framework: ['react', 'react-dom'],
            ui: ['antd', '@ant-design/icons', '@ant-design/x'],
            data: ['axios', 'zustand'],
          },
        },
      },
    },
  };
});
