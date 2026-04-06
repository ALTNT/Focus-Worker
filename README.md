# 📖 研习间 · 专注纪 | PhD Tracker

一个为博士、硕士等专业研究者打造的、兼具美学与实用性的专注与科研进度管理系统。采用莫兰迪色系（Morandi Sage Green），提供沉浸式的学术物理环境。

## ✨ 核心特性

- **⏳ 沉浸式计时器**: 
  - 支持开始、暂停与重置。
  - **多端同步**: 采用 localStorage + Server Sync 架构，支持多标签页实时同步。
  - **用户隔离**: 每个用户的专注时长完全独立且自动备份。
- **💜 心情打卡**: 每日一记，追踪科研路上的情绪波动，并在统计页生成动态分布图。
- **📅 任务管理**: 区分“今日任务”与“长期规划”，支持手动排序与今日进度反馈。
- **📈 统计分析**:
  - 热力图展示研究密度。
  - 手机克制统计饼图。
  - 研习心情分布饼图。
- **📝 论文/投稿进度**: 追踪审稿意见、修改日志，记录研究成长。
- **🛡️ 安全体系**:
  - 完整的注册/登录流程。
  - 邀请码准入机制。
  - 支持应用内自助修改密码。
- **📱 响应式设计**: 完美适配桌面与平板工位。

---

## 🛠️ 技术栈

- **Frontend**: Vanilla JavaScript + Tailwind CSS (Inter/Google Fonts).
- **Backend**: [Hono](https://hono.dev/) (Cloudflare Workers Framework).
- **Database**: Cloudflare Workers KV.
- **Auth**: JWT (Json Web Token) with PBKDF2-like salted SHA-256 password hashing.

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
cd check_in
npm install
```

### 3. 配置 KV 数据库
在 Cloudflare ダッシュボード或使用命令行创建一个新的 KV 命名空间：
```bash
wrangler kv:namespace create DB
```
将生成的 `id` 填写到 `wrangler.toml` 中的 `[[kv_namespaces]]` 部分。

### 4. 环境变量配置
在根目录创建 `.dev.vars` (本地开发) 或在 Cloudflare 控制台设置环境变量：
- `JWT_SECRET`: 你的 JWT 签名私钥。
- `REG_CODE`: 允许注册的唯一邀请码。

### 5. 本地启动
```bash
npm start
```

### 6. 发布上线
```bash
npm run deploy
```

---

## 🎨 莫兰迪设计规范 (Morandi Palette)

- **Primary**: `#B7C9B5` (Sage Green)
- **Secondary**: `#D4E0D2` (Soft Mint)
- **Background**: `#E9E2D8` (Warm Sand)
- **Text**: `#4A5568`

---

## 📄 开源许可
MIT License.
