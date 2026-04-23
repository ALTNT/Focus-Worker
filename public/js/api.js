/**
 * PHDShed - API & Auth helpers
 */

// API 核心辅助函数
async function apiCall(path, method, body) {
    const opts = { method: method || 'GET', headers: {}, cache: 'no-store' };
    if (_authToken) opts.headers['Authorization'] = 'Bearer ' + _authToken;
    if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        const bodyStr = JSON.stringify(body);
        opts.body = bodyStr;
        // Fetch keepalive flag 强制限制 payload < 64KB，防止带有大 Base64 头像的请求被浏览器强杀
        if (method === 'POST' && bodyStr.length < 60000) {
            opts.keepalive = true;
        }
    } else if (method === 'POST') {
        opts.keepalive = true;
    }
    // 强制加盖时间戳，阻止一切浏览器/CDN缓存
    const url = '/api' + path + (opts.method === 'GET' ? `?t=${Date.now()}` : '');
    const res = await fetch(url, opts);
    if (res.status === 401) { 
        showLoginScreen(); 
        return null; 
    }
    return res.json();
}

// 显示登录界面并重置状态
function showLoginScreen() {
    _dataLoaded = false;
    _authToken = null;
    sessionStorage.removeItem('auth_token');
    document.getElementById('login-screen').classList.remove('hidden');
}

// 隐藏登录界面
function hideLoginScreen() {
    document.getElementById('login-screen').classList.add('hidden');
}

// 更新页面角色和标题 UI
function updatePageRoleUI(role, username) {
    _username = username;
    const display = username || '研习者';
    document.getElementById('page-title').textContent = `${display} | 今日学习了吗`;
    document.getElementById('main-title').textContent = `📖 研习间 · 专注纪`;
}

// 获取带用户前缀的 localStorage 键名 (核心存储逻辑)
function getUserKey(key) {
    return _username ? `focus_${_username}_${key}` : `focus_${key}`;
}

// 切换登录/注册视图
function toggleAuthView(view) {
    const loginView = document.getElementById('login-view');
    const regView = document.getElementById('register-view');
    const errEl = document.getElementById('auth-error');
    const regErrEl = document.getElementById('reg-error');

    if (errEl) errEl.classList.add('hidden');
    if (regErrEl) regErrEl.classList.add('hidden');

    if (view === 'register') {
        loginView.classList.add('hidden');
        regView.classList.remove('hidden');
    } else {
        loginView.classList.remove('hidden');
        regView.classList.add('hidden');
    }
}
