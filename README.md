# 柠檬起始页

<div align="center">

一个开源、简洁、美观且方便使用的浏览器起始页扩展。

[![Version](https://img.shields.io/badge/version-2.5.4-blue.svg)](https://github.com/cf-jx/new-tab-page)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[功能特性](#功能特性) • [安装使用](#安装使用) • [开发指南](#开发指南) • [技术栈](#技术栈)

</div>

## 功能特性

✨ **简洁美观** - 精心设计的界面，提供优雅的用户体验

🔍 **快速搜索** - 页面上直接开始搜索，支持多个搜索引擎

- 内置百度、必应、谷歌等主流搜索引擎
- 支持自定义搜索引擎
- 智能搜索建议

🖼️ **精美壁纸** - 支持多种壁纸来源

- Bing 每日一图自动更新
- 支持上传本地图片/视频作为背景
- 浅色/深色模式独立壁纸设置

🔖 **书签管理** - 便捷的书签访问

- 展示浏览器最常访问网站
- 支持添加快速访问网站
- 可自定义网站图标和名称

🌍 **多语言支持** - 国际化界面

- 简体中文
- 繁体中文（香港、台湾）
- English

⚙️ **丰富设置** - 高度可定制化

- 自定义主题色
- 时钟显示设置
- 搜索框位置、样式调整
- 性能优化选项

☁️ **云同步** - 跨设备同步设置（可选）

🎨 **其他特性**

- 一言/诗词展示
- 深色模式支持
- 响应式设计，适配各种屏幕

## 预览

<div align="center">
  <img src="preview/1.webp" width="400" alt="预览图1">
  <img src="preview/2.webp" width="400" alt="预览图2">
  <img src="preview/3.webp" width="400" alt="预览图3">
  <img src="preview/4.webp" width="400" alt="预览图4">
</div>

## 安装使用

### 从商店安装

**Chrome / Edge**
- 即将上架 Chrome Web Store

**Firefox**
- 即将上架 Firefox Add-ons

### 手动安装

#### 1. 下载构建包

从 [Releases](https://github.com/cf-jx/new-tab-page/releases) 页面下载对应浏览器的zip包，或者自行构建。

#### 2. 解压并加载

**Chrome / Edge**
1. 打开浏览器扩展管理页面（`chrome://extensions` 或 `edge://extensions`）
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择解压后的文件夹

**Firefox**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择解压后的 `manifest.json` 文件

## 开发指南

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

启动开发服务器，支持热更新：

```bash
# Chrome（默认）
pnpm dev

# Firefox
pnpm dev:firefox

# Edge
pnpm dev:edge
```

开发模式会在 `.output/` 目录生成未打包的扩展，在浏览器中加载该目录即可。

### 构建生产版本

```bash
# Chrome
pnpm build

# Firefox
pnpm build:firefox

# Edge
pnpm build:edge
```

### 打包为zip

```bash
# Chrome
pnpm zip

# Firefox
pnpm zip:firefox

# Edge
pnpm zip:edge
```

### 代码质量检查

```bash
# 类型检查
pnpm type-check

# 代码检查（包含 ESLint、Oxlint、Stylelint）
pnpm lint

# 代码格式化
pnpm format
```

### 运行测试

```bash
npx playwright test
```

### 项目结构

```
new-tab-page/
├── entrypoints/           # 入口点
│   ├── newtab/           # 新标签页主应用
│   │   ├── components/   # Vue 组件
│   │   ├── styles/       # 样式文件
│   │   └── main.ts       # 应用入口
│   └── background/       # 后台服务 worker
├── shared/               # 共享模块
│   ├── settings/        # 设置管理（包含版本迁移）
│   ├── i18n.ts          # 国际化
│   ├── sync/            # 云同步
│   ├── bookmark/        # 书签管理
│   └── network/         # 网络请求工具
├── assets/              # 静态资源
├── locales/             # 国际化资源文件
├── public/              # 公共文件
│   └── _locales/        # 扩展清单国际化
├── types/               # TypeScript 类型定义
└── wxt.config.ts        # WXT 配置文件
```

## 技术栈

### 核心框架
- **[WXT](https://wxt.dev/)** - 现代化的浏览器扩展开发框架
- **[Vue 3](https://vuejs.org/)** - 渐进式 JavaScript 框架
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript 超集

### 状态管理 & 工具库
- **[Pinia](https://pinia.vuejs.org/)** - Vue 状态管理
- **[VueUse](https://vueuse.org/)** - Vue 组合式工具集
- **[localforage](https://localforage.github.io/localForage/)** - 异步存储库

### UI 组件库
- **[Element Plus](https://element-plus.org/)** - Vue 3 组件库
- **[@vicons](https://www.xicons.org/)** - 图标库集合

### 国际化
- **[i18next](https://www.i18next.com/)** - 国际化框架
- **[i18next-vue](https://github.com/i18next/i18next-vue)** - i18next 的 Vue 3 绑定

### 构建工具
- **[Vite](https://vitejs.dev/)** - 下一代前端构建工具（使用 Rolldown 变体）
- **[unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import)** - 自动导入 API
- **[unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)** - 自动导入组件

### 代码质量
- **[ESLint](https://eslint.org/)** - JavaScript 代码检查
- **[Oxlint](https://oxc.rs/)** - 快速 Rust 实现的代码检查器
- **[Stylelint](https://stylelint.io/)** - CSS/SCSS 代码检查
- **[Prettier](https://prettier.io/)** - 代码格式化工具

### 测试
- **[Playwright](https://playwright.dev/)** - 端到端测试框架

### 其他工具
- **[Day.js](https://day.js.org/)** - 轻量级时间处理库
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - XSS 过滤器
- **[vue-draggable-plus](https://alfred-skyblue.github.io/vue-draggable-plus/)** - 拖拽排序组件

## 设置系统说明

本项目采用版本化设置迁移机制：

- **当前版本**: 在 `shared/settings/current.ts` 中定义
- **默认配置**: 在 `shared/settings/default.ts` 中维护
- **类型定义**: 在 `shared/settings/types/v{版本号}.d.ts` 中定义
- **版本迁移**: 在 `shared/settings/migrate/` 目录下实现各版本间的迁移逻辑

添加新设置时：
1. 更新 `shared/settings/default.ts` 中的默认值
2. 更新相应的类型定义文件
3. 如果是破坏性更改，需要增加版本号并编写迁移函数

## 后台同步机制

扩展使用 Service Worker 实现跨设备同步：

- **消息传递**: 通过 `browser.runtime.sendMessage` 进行通信
- **队列聚合**: 保留最新的 `lastUpdate` 快照，丢弃旧项
- **双重计时**: 本地定时器 + 浏览器 Alarms API（防止 SW 挂起）
- **非同步字段**: 本地/在线壁纸会重置为 Bing 默认值（这些资源无法跨设备同步）

## 浏览器兼容性

| 浏览器 | 支持版本 | Manifest 版本 |
|--------|---------|--------------|
| Chrome | >= 88   | V3           |
| Edge   | >= 88   | V3           |
| Firefox| >= 109  | V3           |

不同浏览器的权限配置略有差异（见 `wxt.config.ts`）。

## 许可证

本项目采用 [MIT](./LICENSE) 许可证开源。

## 贡献

欢迎提交 Issue 和 Pull Request！

在提交 PR 前，请确保：
- 代码通过 `pnpm lint` 检查
- 代码通过 `pnpm type-check` 检查
- 测试通过 `npx playwright test`
- 遵循项目现有的代码风格

## 致谢

感谢所有为这个项目做出贡献的开发者！

---

<div align="center">
  如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！
</div>
