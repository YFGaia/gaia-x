
export enum ToolbarChannel {
  /** 显示工具栏，main -> renderer */
  SHOW_TOOLBAR = 'show-toolbar',
  /** 隐藏工具栏，main -> renderer */
  HIDE_TOOLBAR = 'hide-toolbar',
  /** 工具栏动作，renderer -> main */
  TOOLBAR_ACTION = 'toolbar-action',
  /** 工具栏半透明，main -> renderer */
  TOOLBAR_ALPHA = 'toolbar-alpha',
  /** 获取工具栏半透明，renderer -> main */
  GET_TOOLBAR_ALPHA = 'get-toolbar-alpha',
  /** 设置工具栏半透明，renderer -> main */
  SET_TOOLBAR_ALPHA = 'set-toolbar-alpha',
  /** 调整工具栏大小，main -> renderer */
  RESIZE_TOOLBAR = 'resize-toolbar',
  /** 中断选择，main -> renderer */
  INTERRUPT_SELECTION = 'interrupt-selection',
  /** 选中文本，main -> renderer */
  TEXT_SELECTED = 'text-selected',
  /** 利用剪贴板获取选中文本 renderer -> main */
  TEXT_SELECTED_BY_CLIPBOARD = 'text-selected-by-clipboard'
}

export enum ChatChannel {
  /** 显示聊天窗口 */
  SHOW_CHAT_WINDOW = 'show-chat-window',
  /** 固定聊天窗口 */
  PIN_CHAT_WINDOW = 'pin-chat-window',
  /** 隐藏聊天窗口 */
  HIDE_CHAT_WINDOW = 'hide-chat-window',
  /** 新聊天 */
  NEW_CHAT = 'new-chat',
  /** 窗口关闭前 */
  WINDOW_CLOSING = 'window-closing',
  /** 设置聊天窗口高度 */
  SET_CHAT_WIN_HEIGHT = 'set-chat-win-height',
  /** 停止聊天 renderer -> main */
  STOP_CHAT = 'stop-chat',
  /** 聊天 renderer -> main */
  ON_CHAT = 'on-chat',
  /** 流式响应 main -> renderer */
  STREAM_RESPONSE = 'stream-response',
}

export enum SettingChannel {
  /** 显示设置窗口 */
  SHOW_SETTINGS_WINDOW = 'show-settings-window',
  /** 隐藏设置窗口 */
  HIDE_SETTINGS_WINDOW = 'hide-settings-window',
  /** 切换主题 renderer -> main */
  CHANGE_THEME = 'change-theme',
  /** 获取主题 renderer -> main */
  GET_THEME = 'get-theme',
  /** 更新主题 main -> renderer */
  UPDATE_THEME = 'update-theme',
  /** 获取预设 renderer -> main */
  GET_PRESETS = 'get-presets',
  /** 更新预设 main -> renderer (toolbar)*/
  UPDATE_PRESETS = 'update-presets',
  /** 设置预设 renderer -> main */
  SET_PRESETS = 'set-presets',
  /** 退出应用 */
  QUIT_APP = 'quit-app',
  /** 利用后台代理请求 renderer -> main */
  DO_REQUEST = 'do-request',
  /** 触发系统通知 renderer -> main */
  SHOW_NOTIFICATION = 'show-notification',
  /** 显示设置窗口 */
  SHOW_SETTINGS = 'show-settings',
  /** 设置划词工具栏是否启用 renderer -> main */
  TOOLBAR_ENABLED = 'toolbar-enabled',
}