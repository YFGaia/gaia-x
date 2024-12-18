import ToolbarWindow from '~/main/services/window/ToolbarWindow';
import { ToolbarChannel } from '@/types/ipc/xKey';
import { ipcMain, IpcMainInvokeEvent } from 'electron';

import { createLogger } from '~/main/utils/logger';
import { getTextByClipboard, getTextByUIA, activeWindow, mouseEvents } from '~/main/extension';
const logger = createLogger('Select');

export let waitingSelection: boolean = false; // 是否正在等待选中的文本，剪贴板复制有延迟，需要等待
let currentSelection: string | null = null;

/** 获取当前选中的文本，确保获取到文本才发送 */
export const getSelection = async () => {
  if (!waitingSelection) {
    return currentSelection;
  } else {
    while (waitingSelection) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return currentSelection;
  }
};

type Point = {
  x: number;
  y: number;
};
/** 划词坐标预处理，当前的逻辑是取左上角再往上一行文本的位置 */
const processCoords: (p1: Point, p2: Point) => Point = (p1, p2) => {
  const topLeft = {
    x: Math.min(p1.x, p2.x) - 20,
    y: Math.min(p1.y, p2.y) - 75,
  };
  return topLeft;
};

/** List of applications where UIA text selection will fail */
const uiaWillFailList = ['WPS Office'];

/**
 * Detects and processes selected text, showing toolbar at specified position
 * @param topLeft Position to show the toolbar
 */
const detectText = async (topLeft: Point) => {
  try {
    waitingSelection = true;
    let selectedText = '';

    // First try clipboard for apps where UIA fails
    for (const appName of uiaWillFailList) {
      if (windowTitle.includes(appName)) {
        selectedText = '-';
        break;
      }
    }

    // Fall back to UIA if clipboard method wasn't used
    if (selectedText === '') {
      const { text, process } = await getTextByUIA();
      logger.info('Selection from UIA:', {
        process,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        textLength: text.length,
      });
      selectedText = text;
    }

    // Show toolbar if selection is long enough
    if (selectedText.length > 3) {
      currentSelection = selectedText;
      ToolbarWindow.showToolbar(topLeft.x, topLeft.y);
    } else {
      // Show transparent toolbar for short selections, or if UIA failed
      ToolbarWindow.showToolbar(topLeft.x, topLeft.y, true);
    }
  } catch (error: any) {
    logger.error('Failed to get selection:', error.message);
    logger.error(`Pay attention to [${windowTitle}]`);
  } finally {
    waitingSelection = false;
  }
};

let mouseDownPos: { x: number; y: number } | null = null;
let windowTitle: string = '';
/** 判断是否在窗口边框上点击，边框标题栏高度假设为固定值40 */
const isClickingWindowFrame: (clickPos: Point) => Promise<boolean> = async (clickPos) => {
  const window = await activeWindow();
  /**window {
    title: '基于xxxx的xx研究 - WPS Office',
    bounds: { x: -1920, y: 79, width: 1920, height: 1032 }
  } */
  if (!window) return false;
  windowTitle = window.title;
  const { bounds } = window;
  const frameWidth = 8; // Typical window frame width
  const taskBarHeight = 40;
  // Check if click is in window frame area
  return (
    // Top frame
    (clickPos.y >= bounds.y && clickPos.y <= bounds.y + taskBarHeight) ||
    // Bottom frame
    (clickPos.y >= bounds.y + bounds.height - frameWidth &&
      clickPos.y <= bounds.y + bounds.height) ||
    // Left frame
    (clickPos.x >= bounds.x && clickPos.x <= bounds.x + frameWidth) ||
    // Right frame
    (clickPos.x >= bounds.x + bounds.width - frameWidth && clickPos.x <= bounds.x + bounds.width)
  );
};

/** 获取剪贴板文本并缓存 */
const getClipboardText = async (_: IpcMainInvokeEvent) => {
  try {
    waitingSelection = true;
    const { text } = await getTextByClipboard();
    logger.info('Selection:', {
      process: null,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      textLength: text.length,
    });
    if (text.length > 2) {  // 选择内容大于2个字符，才认为是划词并保存内容到 currentSelection
      currentSelection = text;
    }
  } catch (error: any) {
    logger.error('Failed to get selection:', error.message);
  } finally {
    waitingSelection = false;
  }
}

/** 中断划词 */
const interruptSelection = (_: IpcMainInvokeEvent) => {
  logger.info('Interrupt selection');
  waitingSelection = false;
  mouseDownPos = null;
}

export const registerSelectionHandlers = () => {
  // Track mouse down position
  mouseEvents.on('mousedown', async (event: MouseEvent) => {
    const isFrame = await isClickingWindowFrame({ x: event.x, y: event.y });
    if (isFrame) {
      logger.info('Ignore selection');
      return;
    }

    mouseDownPos = { x: event.x, y: event.y };
  });

  // 鼠标按下到抬起的距离超过阈值才算划词，防止把鼠标点击误判为划词，造成额外计算量
  mouseEvents.on('mouseup', async (event: MouseEvent) => {
    if (!mouseDownPos) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(event.x - mouseDownPos.x, 2) + Math.pow(event.y - mouseDownPos.y, 2)
    );

    if (distance > 30) {
      logger.debug('Mouse up', { x: event.x, y: event.y });
      // 计算一个合理的显示位置
      const topLeft = processCoords(mouseDownPos, { x: event.x, y: event.y });
      logger.info(`Distance ${distance.toFixed(2)}`);
      detectText(topLeft);
    } else if (distance > 10) {
      logger.info(`Distance ${distance.toFixed(2)} too small`);
    }
    mouseDownPos = null;
  });

  ipcMain.on(ToolbarChannel.TEXT_SELECTED_BY_CLIPBOARD, getClipboardText);
  ipcMain.on(ToolbarChannel.INTERRUPT_SELECTION, interruptSelection);
};
