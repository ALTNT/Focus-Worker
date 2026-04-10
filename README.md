# 📖 研习间 · 专注纪 | PhD Tracker

一个为博士、硕士等专业研究者打造的、兼具美学与实用性的专注与科研进度管理系统。采用高级感**莫兰迪色系（Morandi Sage Green）**，提供沉浸式、不刺眼的学术物理环境。

## ✨ 核心特性

- **⏳ 沉浸式计时器**: 
  - 支持专注计时器的开始、暂停与重置，自动累加当日总时长。
  - **多端与多标签页同步**: 基于 localStorage 和 Server Sync 架构，跨端无缝接力。
  - **12小时防沉迷机制**: 保护身心健康。
- **📊 全景月度数据大盘 (Dashboard)**:
  - **日历热力图**: Github 风格的深浅日历，直观展示月度研习密度。
  - **多维追踪雷达图**: 自动生成“读书/单词/文献/运动”习惯养成雷达图。
  - **高度自由的月份选择器**: 纯手工定制的流体弹出式日历，秒速切换历史复盘。
- **🏆 专注同侪排行榜**:
  - **自动打榜**: 计时器自动更新服务器分数，展示同服所有学者的努力排名（🥇🥈🥉）。
  - **隐私模式**: 自由切换公开或隐身。非本人用户名均自动添加星号 `*` 脱敏保护。
- **📅 灵活的任务流体系**:
  - **三段式研习打卡**: 轻松记录“晨间专注”、“午后研习”、“晚间沉浸”。
  - **四阶每日必打卡**: 轻量级核对表（读书、单词、文献、运动）。
  - **长期课题规划**: DDL 驱动的研究路线图。
- **💜 心情与抗诱惑追踪**: 
  - **每日心情打卡**: 记录科研路上的情绪波动，生成多色饼图。
  - **戒断手机计数器**: 专注于剥离多巴胺干扰。
- **📝 顶级文献池管理**: 
  - 可视化科研生命周期（从“文献调研”到“准备提交”）。
  - 投稿记录沉淀，跟踪审稿状态，内置审稿心得日记本。
- **🛡️ 安全与专属体系**:
  - 邀请码内测准入机制。
  - 支持多用户隔离与 JWT 加密防伪造。
  - 带盐 (Salt) 及 SHA-256 算法护航密码体系。

---

## 🛠️ 技术栈

- **Frontend (Zero-build)**: Vanilla JavaScript + Tailwind CSS (Google Fonts: Inter)。
- **Backend (Serverless)**: [Hono](https://hono.dev/) (基于 Cloudflare Workers 架构)。
- **Database (Edge)**: Cloudflare Workers KV (高可用边缘存储)。
- **Charts (Visuals)**: Chart.js 深度定制莫兰迪配色版本。

---

## 🚀 部署指南

### 1. 准备环境
确保你已安装 Node.js 和 Wrangler CLI：
```bash
npm install -g wrangler
```

### 2. 克隆与安装
```bash
git clone <your-repo-url>
cd Focus-Worker
npm install
```

### 3. 配置 KV 数据库
在 Cloudflare 控制台或使用命令行创建一个新的 KV 命名空间：
```bash
wrangler kv:namespace create DB
```
然后在项目根目录打开 `wrangler.toml` 文件，将系统返回的 `id` 填写到 `[[kv_namespaces]]` 配置项下。

### 4. 环境变量配置
在根目录创建 `.dev.vars` (用于本地开发) 以模拟 Cloudflare 环境变量：
```text
JWT_SECRET="YOUR_RANDOM_LONG_SECRET_KEY"
REG_CODE="YOUR_INVITE_CODE_HERE"
```

### 5. 本地联调 (Dev)
```bash
npm start
```

### 6. 发布上线 (Prod)
```bash
npm run deploy
```

---

## 🎨 莫兰迪设计规范 (Morandi Custom Palette)

本项目为避免长期盯屏幕带来的视疲劳，精心定制了护眼抗眩光的低饱和度配色：

- **Primary (青灰)**: `#B7C9B5` (Sage Green)
- **Secondary (浅薄荷)**: `#D4E0D2` (Soft Mint)
- **Background (奶白陶色)**: `#F2EFE9` (Warm Sand) / 背景泛白处理提高文字对比度
- **Text (低灰度)**: `#4A5568`
- **Charts**: 搭配陶色、豆绿、淡青等同色系延伸组合。

---

## 📄 开源许可
MIT License.
