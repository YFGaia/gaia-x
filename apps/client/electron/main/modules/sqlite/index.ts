import { modules } from './modules';

export interface SQLModule {
  register?: () => void;
  generateTable?: () => void;
}

export const setupSqlite = () => {
  for (const module of modules) {
    if (typeof module === 'function') {
      module();
    }
  }
};
