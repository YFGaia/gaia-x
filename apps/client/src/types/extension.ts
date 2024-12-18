import { ExtensionContext } from "@/main/extensions/ExtensionContext";

export interface Extension {
  id: string;
  name: string;
  version: string;
  activate: (context: ExtensionContext) => Promise<any>;
  deactivate?: () => Promise<void>;
}

export interface Disposable {
  dispose(): void;
}

export interface ExtensionAPI {
  [key: string]: any;
}

export interface StorageService {
  get(key: string): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  clear(): void;
} 