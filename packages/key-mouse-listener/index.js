"use strict";
const { EventEmitter } = require("events");
const addon = require("bindings")("key-mouse-listener");
let paused = true;
let keyboardPaused = true;

class MouseEvents extends EventEmitter {
    constructor() {
        super();

        let createdListener = false; // 标记是否已经创建了鼠标钩子
        let registeredEvents = []; // 存储已注册的事件

        // 监听"newListener"事件，当有新的事件监听器被添加时触发
        this.on("newListener", event => {
            // 如果事件已经注册过，则直接返回
            if (registeredEvents.indexOf(event) !== -1)
                return;

            // 如果请求的事件是"mousemove"，则启用鼠标移动捕获
            if(event === "mousemove") {
                addon.enableMouseMove();
            }

            // 如果请求的事件是"mouseup"、"mousedown"、"mousemove"或"mousewheel"，并且尚未创建监听器
            if ((event === "mouseup" || event === "mousedown" || event === "mousemove" || event === "mousewheel") && !createdListener) {
                // 创建鼠标钩子，监听鼠标事件
                // 注意：每次调用都会"泄漏"一个线程，需要修复
                createdListener = addon.createMouseHook((event, x, y, button, delta) => {
                    const payload = { x, y }; // 事件负载，包含鼠标坐标
                    if (event === "mousewheel") {
                        payload.delta = FromInt32(delta) / 120; // 处理鼠标滚轮事件，计算滚轮增量
                        payload.axis = button; // 滚轮轴
                    } else if(event === "mousedown" || event === "mouseup") {
                        payload.button = button; // 鼠标按键
                        const mouseData = FromInt32(delta);
                        if(mouseData) payload.button = 3 + mouseData; // 处理额外的鼠标按键
                    }
                    this.emit(event, payload); // 触发相应的事件
                });
                if (createdListener) {
                    this.resumeMouseEvents(); // 如果成功创建监听器，则恢复鼠标事件
                }
            } else {
                return;
            }

            // 将事件添加到已注册事件列表中
            registeredEvents.push(event);
        });

        // 监听"removeListener"事件，当有事件监听器被移除时触发
        this.on("removeListener", event => {
            // 如果事件仍有监听器，则直接返回
            if (this.listenerCount(event) > 0)
                return;

            // 从已注册事件列表中移除该事件
            registeredEvents = registeredEvents.filter(x => x !== event);
            if (event === "mousemove") {
                addon.disableMouseMove(); // 如果移除的是"mousemove"事件，则禁用鼠标移动捕获
            }
        });
    }

    // 获取当前鼠标事件是否暂停
    getPaused() {
        return paused;
    }

    // 暂停鼠标事件
    pauseMouseEvents() {
        if(paused) return false; // 如果已经暂停，则返回false
        paused = true;
        return addon.pauseMouseEvents(); // 调用底层方法暂停鼠标事件
    }

    // 恢复鼠标事件
    resumeMouseEvents() {
        if(!paused) return false; // 如果已经恢复，则返回false
        paused = false;
        return addon.resumeMouseEvents(); // 调用底层方法恢复鼠标事件
    }
}

class KeyboardEvents extends EventEmitter {
    constructor() {
        super();

        let createdListener = false; // 标记是否已经创建了键盘钩子
        let registeredEvents = []; // 存储已注册的事件

        // 监听"newListener"事件，当有新的事件监听器被添加时触发
        this.on("newListener", event => {
            // 如果事件已经注册过，则直接返回
            if (registeredEvents.indexOf(event) !== -1)
                return;

            // 如果请求的事件是"keydown"或"keyup"，并且尚未创建监听器
            if ((event === "keydown" || event === "keyup") && !createdListener) {
                // console.log('Creating keyboard hook...');
                // 创建键盘钩子，监听键盘事件
                createdListener = addon.createKeyboardHook((event, keyCode, scanCode, extended) => {
                    // console.log('Keyboard event received:', event, keyCode, scanCode, extended);
                    const payload = {
                        keyCode,
                        scanCode,
                        extended
                    }; // 事件负载，包含按键信息
                    // console.log('Emitting keyboard event:', event, payload);
                    this.emit(event, payload); // 触发相应的事件
                });
                // console.log('Keyboard hook created:', createdListener);
                if (createdListener) {
                    // console.log('Resuming keyboard events...');
                    this.resumeKeyEvents(); // 如果成功创建监听器，则恢复键盘事件
                }
            }

            // 将事件添加到已注册事件列表中
            registeredEvents.push(event);
        });

        // 监听"removeListener"事件，当有事件监听器被移除时触发
        this.on("removeListener", event => {
            // 如果事件仍有监听器，则直接返回
            if (this.listenerCount(event) > 0)
                return;

            // 从已注册事件列表中移除该事件
            registeredEvents = registeredEvents.filter(x => x !== event);

            // 如果没有任何监听器了，则销毁键盘钩子
            if (registeredEvents.length === 0) {
                addon.destroyKeyboardHook();
                createdListener = false;
            }
        });
    }

    // 获取当前键盘事件是否暂停
    getPaused() {
        return keyboardPaused;
    }

    // 暂停键盘事件
    pauseKeyEvents() {
        if(keyboardPaused) return false; // 如果已经暂停，则返回false
        keyboardPaused = true;
        return addon.pauseKeyEvents(); // 调用底层方法暂停键盘事件
    }

    // 恢复键盘事件
    resumeKeyEvents() {
        if(!keyboardPaused) return false; // 如果已经恢复，则返回false
        keyboardPaused = false;
        return addon.resumeKeyEvents(); // 调用底层方法恢复键盘事件
    }
}

// 将32位整数转换为有符号整数
function FromInt32(x) {
    var uint32 = x - Math.floor(x / 4294967296) * 4294967296;
    if (uint32 >= 2147483648) {
        return (uint32 - 4294967296) / 65536
    } else {
        return uint32 / 65536;
    }
}

// 导出MouseEvents和KeyboardEvents类的实例
module.exports = {
    mouseEvents: new MouseEvents(),
    keyboardEvents: new KeyboardEvents()
}