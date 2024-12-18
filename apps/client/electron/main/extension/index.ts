// 在 electron 中，require 会报错，所以需要单独加一个文件
import { createRequire } from 'module';
const require = createRequire(import.meta.url);


const { mouseEvents, keyboardEvents } = require('@gaia-x-key/key-mouse-listener');
const { getTextByClipboard, getTextByUIA, activeWindow } = require('@gaia-x-key/selected-text');

export { mouseEvents, keyboardEvents, getTextByClipboard, getTextByUIA, activeWindow};
