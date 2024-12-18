import { registerChatHandlers } from './chat'
import { registerSettingsHandlers } from './settings'
import { registerSelectionHandlers } from './selection'
import { registerToolbarHandlers } from './toolBar';
import { registerNotificationHandlers } from './notification';

let isRegistered = false;
/** 注册所有事件 */
export const registerHandlers = () => {
  if (isRegistered) return;
  isRegistered = true;
  registerChatHandlers()
  registerSettingsHandlers()
  registerSelectionHandlers()
  registerToolbarHandlers()
  registerNotificationHandlers()
}
/**
 * UnhandledPromiseRejectionWarning: TypeError: Error processing argument at index 1, conversion failure from undefined
 * 
 * 如果出现这种错误，可能是因为重复注册了同一个消息事件
 * 
 */