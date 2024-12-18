import { AppState } from "@/stores/AppStateStore";
import { ConfigReader } from "~/main/utils/ConfigReader";


const defaultConfig: AppState = {
  leftPanel: "open",
  rightPanel: "close",
  mode: "normal",
  canUpdate: false,
  windowWidth: 600,
  windowHeight: 960
};

export const appStateManager = new ConfigReader({
  fileName: "app-state.json",
  defaults: defaultConfig,
});
