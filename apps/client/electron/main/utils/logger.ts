import { app, shell } from 'electron';
import log from 'electron-log/main';

// Initialize logger
log.initialize({
  preload: false,
});

log.transports.file.level = 'info';

/**
 * Creates a logger instance for a specific module
 * @param moduleName - Name of the module to create logger for
 * @returns Logger instance with module-specific scope
 */
export function createLogger(moduleName: string) {
  return log.scope(moduleName);
}

// Default logger for main process
export const logger = createLogger('main');

export function getLogFilePath() {
  return log.transports.file.getFile().path;
}

export async function revealLogFile() {
  const filePath = getLogFilePath();
  return await shell.openPath(filePath);
}

app.on('before-quit', () => {
  log.transports.console.level = false;
});