<div align="center">

# 🍋 柠檬起始页 (Lemon Tab Page)

> **极简、纯净、高效的浏览器新标签页扩展**

[![Version](https://img.shields.io/github/v/release/cf-jx/new-tab-page?label=version&color=blue)](https://github.com/cf-jx/new-tab-page/releases)
[![License](https://img.shields.io/github/license/cf-jx/new-tab-page)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cf-jx/new-tab-page/pulls)

[特性](#-特性) • [预览](#-预览) • [安装](#-安装) • [开发](#-开发) • [致谢](#-致谢)

</div>

---

## 📖 简介

本项目基于 [Redlnn/lemon-new-tab-page](https://github.com/Redlnn/lemon-new-tab-page) 进行深度重构与优化。

我们在原版基础上遵循 **"Less is More"** 的设计哲学，剔除了番茄钟、便签等非核心功能，将设置选项深度整合，致力于打造一款**即开即用、零干扰、纯粹**的浏览器起始页。

如果你喜欢**极致简洁**且**高度可定制**的浏览体验，那么这个版本就是为你准备的。

## ✨ 特性

- 🎨 **极致简约**：移除冗余组件（番茄钟、便签、壁纸切换插件），回归浏览本质。
- 🔍 **智能搜索**：
  - 内置 Google、百度、Bing 等主流引擎。
  - **深度集成**：搜索引擎管理直接整合至设置页，支持自定义添加/删除引擎。
  - 支持智能搜索建议。
- 🖼 **精美壁纸**：
  - 支持 Bing 每日壁纸自动同步。
  - 支持本地图片/视频上传。
  - 深色/浅色模式独立壁纸配置。
- ⚙️ **统一设置**：
  - "关于"信息、帮助文档等已全部整合至设置侧边栏，告别杂乱的弹窗。
  - 重新设计的设置按钮交互，一步直达。
- 🔖 **高效书签**：
  - 支持瀑布流与树形视图。
  - 支持拖拽排序与右键快捷管理。
- ⚡ **性能优化**：
  - 基于 WXT + Vue 3 构建，启动速度快。
  - 完全本地运行，无数据追踪。

## 📸 预览

<div align="center">
  <img src="preview/1.webp" width="700" alt="预览图1" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px;">
  <br>
  <img src="preview/2.webp" width="340" alt="预览图2" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: inline-block; margin-right: 10px;">
  <img src="preview/3.webp" width="340" alt="预览图3" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: inline-block;">
</div>

## 📦 安装

### 手动安装 (推荐)

1.  前往 [Releases](https://github.com/cf-jx/new-tab-page/releases) 页面下载最新的 `.zip` 压缩包。
2.  解压下载的文件。

#### Chrome / Edge

1.  在地址栏输入 `chrome://extensions` (Chrome) 或 `edge://extensions` (Edge)。
2.  开启右上角的 **"开发者模式"**。
3.  点击左上角的 **"加载已解压的扩展程序"**。
4.  选择解压后的文件夹即可。

#### Firefox

1.  输入 `about:debugging#/runtime/this-firefox`。
2.  点击 **"临时载入附加组件"**。
3.  选择解压后的 `manifest.json` 文件。

## 🛠 开发

### 环境准备

- Node.js >= 18
- pnpm >= 8

### 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器 (支持热更新)
pnpm dev        # Chrome (默认)
pnpm dev:edge   # Edge
pnpm dev:firefox # Firefox
```

### 构建与打包

```bash
# 构建生产版本
pnpm build

# 打包为 zip (生成至 .output 目录)
pnpm zip
```

## 🤝 致谢

感谢以下开源项目带来的灵感与基础：

- [Redlnn/lemon-new-tab-page](https://github.com/Redlnn/lemon-new-tab-page) (原版项目)
- [WXT](https://wxt.dev/)
- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)

## 📄 许可证

[MIT](./LICENSE) License © 2025 cf-jx
