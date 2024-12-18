# gaia-x-key 划词工具

[![Windows](https://img.shields.io/badge/Platform-Windows%2010+-blue)](https://www.microsoft.com/windows)
[![VS2019+](https://img.shields.io/badge/Visual%20Studio-2019+-purple)](https://visualstudio.microsoft.com/)
[![CMake](https://img.shields.io/badge/CMake-3.10+-green)](https://cmake.org/)

一个高效的Windows | MacOS文本获取工具，支持UI Automation和智能剪贴板管理。

## 功能特点

### 双重文本获取机制

1. **无障碍功能**
   - 使用 Windows UI Automation API | Apple Accessibility API 直接获取UI元素中的选中文本
   - 无需修改剪贴板内容，对用户影响最小
   - (响应速度较慢，暂时停用)

2. **智能剪贴板**
   - 在无障碍功能无法获取文本时自动启用
   - 通过`模拟快捷键复制操作`获取选中文本
   - 智能剪贴板历史管理，模拟快捷键复制，获取文本后：
     * 如果用户启用了剪贴板记录，则自动`清理最新的临时剪贴板记录`，维持剪贴板整洁性
     * 如果用户未启用剪贴板历史，则`复原之前的剪贴板内容`，保护用户现有剪贴板历史


## 编译指南 - 

**系统要求 - Windows**

- Windows 10 1809+ 或 Windows 11
- Visual Studio 2019 或 Visual Studio Installer
- Visual Studio Installer 安装 `适用于最新 v143 生成工具的 C++ ATL (x86 和 x64)`(支持 COM 开发，通过无障碍功能获取文本)
- CMake 3.10+
- Windows SDK

**系统要求 - MacOS**

- MacOS 10.15+
- Xcode 12+
- CMake 3.10+
- Objective-C++ 支持，链接必要的系统框架

**编译步骤**

`npm install` 或者 `npm run rebuild`

> 编译警告 "warning C4819: 该文件包含不能在当前代码页(936)中表示的字符" 是正常现象，不影响使用

## 使用指南

查看 example 中的使用案例，进入 example 路径并执行 `npm run start`

## 技术原理

### Windows 平台
1. **无障碍功能实现**
   - 使用 Windows UI Automation API
   - 通过 COM 接口访问 UI 元素
   - 支持 MSAA (Microsoft Active Accessibility)

2. **剪贴板管理**
   - 使用 Windows Clipboard API
   - 支持 WinRT 现代剪贴板功能
   - 通过 SendInput 模拟 Ctrl+C

### macOS 平台
1. **无障碍功能实现**
   - 使用 Apple Accessibility API
   - 通过 AXUIElement 访问界面元素
   - 支持系统级辅助功能权限

2. **剪贴板管理**
   - 使用 NSPasteboard 进行剪贴板操作
   - 通过 Carbon API 模拟 Command+C
   - 支持 UTF-8/UTF-16 文本转换

### 编译系统设计

项目使用 node-gyp 构建系统，具有以下特点：

1. **平台特定实现**
   - 分离 clipboard_impl 和 uia_impl 以避免命名空间冲突，每个平台代码引入 selection.hpp 后实现 clipboard_impl 和 uia_impl 中的方法即可

2. **依赖关系**
   - Windows 依赖:
     * oleacc.lib (辅助功能)
     * user32.lib (用户界面)
     * WindowsApp.lib (WinRT 功能)

   - macOS 依赖:
     * AppKit.framework (NSPasteboard)
     * Carbon.framework (键盘事件)
     * ApplicationServices.framework (辅助功能)
     * CoreFoundation.framework (基础类型)

3. **构建配置**
   - Windows: 强制 64 位编译，启用 Unicode
   - macOS: 自动架构选择，启用 Objective-C++ 支持

## 关于平台选择

- 项目会根据当前操作系统自动选择正确的实现
- 具体配置在 binding.gyp 中
- 不支持跨平台编译。Windows 特定代码只能在 Windows 上编译，macOS 特定代码只能在 macOS 上编译
- 包可以发布到私有的 npm 仓库中，后续直接通过 npm install 获取编译好的包，便于缺乏构建环境的同事使用

## Project Structure
```
src/
├── selection.hpp       # 核心接口定义，需改造为本项目相关的 N-API 接口
├── selection.cpp       # 核心接口实现，需改造为本项目相关的 N-API 实现
├── logger.h            # 日志接口
├── logger.cpp          # 日志实现
└── platform_win/
│   ├── clipboard.h        # Windows 剪贴板接口
│   ├── clipboard.cpp      # Windows 剪贴板实现，使用 namespace clipboard_impl 实现其中的两个方法
│   └── uiautomation.cpp   # Windows UI自动化实现
└── platform_mac/
    ├── clipboard.h      # macOS 剪贴板接口
    ├── clipboard.cpp    # macOS 剪贴板实现, 使用 namespace clipboard_impl 实现其中的两个方法
    └── uiautomation.cpp # macOS UI自动化实现
```