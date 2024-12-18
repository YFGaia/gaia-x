# 全局鼠标键盘事件监听器

Node.js 全局鼠标和键盘事件监听工具

## 安装方式

```cmd
cd lib/key-mouse-listener
npm install
```

## 开发调试


修改相关代码后，重新编译才能生效
```cmd
cd lib/key-mouse-listener
npm run rebuild

# 运行测试
npm run start
```
## 使用指南

导入模块并注册需要监听的鼠标事件即可使用。

### 可用的事件监听器

#### 鼠标按键事件
**`mouseup`** / **`mousedown`** — *分别在鼠标按键按下和释放时触发*

返回参数：
- **x:** 鼠标相对于主显示器左上角的 X 坐标
- **y:** 鼠标相对于主显示器左上角的 Y 坐标
- **button:** 触发的鼠标按键
  - 1: 左键
  - 2: 右键
  - 3: 中键
  - 4: 侧键1 ("XBUTTON1")
  - 5: 侧键2 ("XBUTTON2")

#### 鼠标移动事件
**`mousemove`** — *在鼠标光标移动时触发*

返回参数：
- **x:** 鼠标相对于主显示器左上角的 X 坐标
- **y:** 鼠标相对于主显示器左上角的 Y 坐标

#### 鼠标滚轮事件
**`mousewheel`** — *在滚动鼠标滚轮时触发*

> 注意：某些触控板可能需要在 Windows 设置中禁用"悬停时滚动非活动窗口"才能触发此事件

返回参数：
- **x:** 鼠标相对于主显示器左上角的 X 坐标
- **y:** 鼠标相对于主显示器左上角的 Y 坐标
- **delta:** 滚轮滚动的距离（正数表示向上，负数表示向下）
- **axis:** 滚动方向（0: 垂直方向，1: 水平方向）

### 使用示例

```js
const { mouseEvents } = require("@gaia-x-key/key-mouse-listener");

mouseEvents.on("mouseup", event => {
  console.log(event); // { x: 2962, y: 483, button: 1 }
});

mouseEvents.on("mousedown", event => {
  console.log(event); // { x: 2962, y: 483, button: 1 }
});

mouseEvents.on("mousemove", event => {
  console.log(event); // { x: 2962, y: 482 }
});

mouseEvents.on("mousewheel", event => {
  console.log(event); // { x: 2962, y: 483, delta: -1, axis: 0 }
});
```

### 可用的控制函数

- **`pauseMouseEvents()`** — 暂停所有鼠标事件监听
- **`resumeMouseEvents()`** — 恢复所有鼠标事件监听
- **`getPaused()`** — 获取当前监听器的暂停状态（返回布尔值）
