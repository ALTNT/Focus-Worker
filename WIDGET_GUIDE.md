# 🚀 极致简化：一键桌面打卡与动态状态看板配置指南

通过这一指南，你完全不需要打开网页，即可在**手机桌面、电脑桌面**上使用最原生的方式进行极速打点，并时刻在光宗耀祖的动态小组件上看到自己的专注时长！

---

## 🔒 核心前置：提取安全准入密钥 (长效 Token)

为了保证你的账号和历史数据不在网络中被外泄，系统为你专门开辟了一条加密级别的独立通道。

1. 用电脑登录并刷新进入你的打卡主页：`https://track.alyy.de`
2. 点击右上角头像，选择 **「设置/资料」**
3. 滚动到模态窗口最底部，点击 **获取小组件密钥**。
4. 复制生成的这一大串密码（这是你通过苹果快捷指令与桌面组件通信的**唯一口令**，绝对不要发给他人）。

---

## 🏎️ 进阶玩法一：配置一键“神同调”快捷指令 (iOS/Mac)

我们已经为你准备好了极致化繁为简的 `timer_toggle` （智能热切换）接口：**点一次开始计时，再点一次完美保存下班！**

### 步骤详解
1. 在 Apple 手机或自带的 Mac Finder 中打开自带的 **「快捷指令 (Shortcuts)」** 应用，新建一个快捷指令名称（例如：`打卡上下班`）。
2. 在搜索框搜索 **“获取 URL 内容”** (Get Contents of URL) 并添加这个动作。
3. **精准配置这个框框**：
   * **URL (网址)**：填写 👉 `https://track.alyy.de/api/action/shortcut`
   * **方法 (Method)**：下拉选择 👉 **POST**
   * **头部 (Headers)**：点击“添加新头部”
     * 键 (Key)：输入 `Authorization` *(注意大小写，不要多一个空格)*
     * 值 (Value)：输入 `Bearer 你刚才系统里复制的那一大串密钥`。**(注意 `Bearer` 和你的密码中间必须要用一个纯粹的空格隔开！)**
   * **请求正文 (Request Body)**：下拉选择 👉 **JSON**
     * 点击“添加新字段” ➡️ 选择**文本 (Text)**
     * 左侧键写：`action`
     * 右侧值写：`timer_toggle`
4. 测试：点击右下角/右上角的播放大按钮。如果下方弹出一串形如 `{"success":true,"today":"2026..."}` 的信息，说明大功告成！
5. **最后一步**：在快捷指令名称右侧点击图标，选择 **添加到主屏幕 (Add to Home Screen)**。

![alt text](WIDGET_GUIDE/image.png)
*🎉 从今往后，不管是在路上还是躺在床上，点一下就开始专注计时，再点一下就下班结算存入云端系统里！*

---

## 📊 进阶玩法二：iOS 桌面专注数据动态面板 (Scriptable)

快捷指令负责发包修改数据，那这套数据能不能无缝展示在桌面呢？用此脚本即可实现！

1. 在 iOS AppStore (或 Mac AppStore) 下载并且打开纯净开发者工具：**Scriptable**。
2. 点击应用首页右上角的 **`+`** 号。
3. **将下面的代码毫不犹豫地完全复制进去**。
4. **⚠️ 改动第一行**：把 `YOUR_TOKEN_HERE` 替换成你刚刚获取的密钥。
5. 保存退出，然后在手机主屏幕上长按空白处添加一个**小尺寸或中尺寸**的 Scriptable 小组件， 长按点击编辑小组件，然后script 选择刚刚创建的脚本，第二项选择运行脚本，从而选取你刚创建的脚本当面板。

### 桌面小组件定制代码

```javascript
// ==========================================
// 设定你的密钥配置
// ==========================================
// ⚠️ 极其重要：将这里替换为你系统网页里获取的10年长期密钥！
const API_TOKEN = "YOUR_TOKEN_HERE";
// ⚠️ 若你更换了域名，请将这里替换：
const BASE_URL = "https://track.alyy.de";

// ------------------------------------------
// 核心逻辑运行边界 (请尽量不要修改以下内容)
// ------------------------------------------

// 格式化时间函数
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "0h 0m 0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

// 核心拉取：利用长效 Token 安全抓取服务器你的今日数据档案
async function fetchTodayData() {
    const today = new Date().toISOString().split('T')[0];
    const req = new Request(`${BASE_URL}/api/data/checkin`);
    req.method = "GET";
    req.headers = { "Authorization": `Bearer ${API_TOKEN}` };
    
    try {
        const res = await req.loadJSON();
        if (res && res[today]) {
            return res[today];
        }
        return null;
    } catch (e) {
        return null;
    }
}

const data = await fetchTodayData();
const widget = new ListWidget();
widget.backgroundColor = new Color("#F2EFE9"); // 卡片典雅背景
widget.setPadding(15, 15, 15, 15);

// 顶部 Title
const titleStack = widget.addStack();
titleStack.layoutHorizontally();
titleStack.centerAlignContent();
const titleLabel = titleStack.addText("⏳ 今日专注看板");
titleLabel.font = Font.boldSystemFont(14);
titleLabel.textColor = new Color("#4A6FA5");
widget.addSpacer(12);

// 计算逻辑（甚至当你没有关掉遥控器时在此也能动态预测累加）
let totalSeconds = 0;
let isRunning = false;

if (data) {
    totalSeconds = data.duration || 0;
    if (data.timerRunningSince) {
        isRunning = true;
        // 把正在路上的专注时间也算进展示面板内
        const elapsed = Math.floor((Date.now() - data.timerRunningSince) / 1000);
        totalSeconds += elapsed;
    }
}

// 核心持续时间
const timeText = formatDuration(totalSeconds);
const timeLabel = widget.addText(timeText);
timeLabel.font = Font.heavySystemFont(22);
timeLabel.textColor = new Color("#8EAA90");
widget.addSpacer(10);

// 添加状态栏标签
const statusStack = widget.addStack();
statusStack.layoutHorizontally();
const statusText = isRunning ? "▶️ 正在研习爆发中" : "⏸️ 已暂停 / 休息中";
const statusLabel = statusStack.addText(statusText);
statusLabel.font = Font.mediumSystemFont(12);
statusLabel.textColor = isRunning ? new Color("#d97706") : new Color("#9ca3af");

Script.setWidget(widget);
Script.complete();
```
