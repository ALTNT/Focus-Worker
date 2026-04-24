/**
 * PHDShed - Authentication Module
 */

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

function initAuth() {
    // 登录逻辑
    const loginBtn = document.getElementById('auth-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            console.log('Login button clicked');
            const u = document.getElementById('auth-username').value.trim();
            const p = document.getElementById('auth-password').value;
            console.log('Attempting login for:', u);
            const errEl = document.getElementById('auth-error');
            if (!u || !p) return;

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            console.log('Login response:', data);
            if (data.success && data.token) {
                _authToken = data.token;
                sessionStorage.setItem('auth_token', data.token);
                updatePageRoleUI(data.role, u);
                hideLoginScreen();
                console.log('Starting initData...');
                await initData();
                console.log('initData finished');
            } else {
                console.error('Login failed:', data.error);
                errEl.textContent = data.error || '登录失败';
                errEl.classList.remove('hidden');
            }
        });
    }

    // 注册逻辑
    const registerBtn = document.getElementById('auth-register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const u = document.getElementById('reg-username').value.trim();
            const p = document.getElementById('reg-password').value;
            const code = document.getElementById('reg-code').value.trim();
            const role = document.querySelector('input[name="auth-role"]:checked').value;
            const errEl = document.getElementById('reg-error');

            if (!u || !p || !code) {
                errEl.textContent = '请填写完整信息';
                errEl.classList.remove('hidden');
                return;
            }

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p, role, regCode: code })
            });
            const data = await res.json();
            if (data.success && data.token) {
                _authToken = data.token;
                sessionStorage.setItem('auth_token', data.token);
                updatePageRoleUI(data.role, u);
                hideLoginScreen();
                await initData();
            } else {
                errEl.textContent = data.error || '注册失败';
                errEl.classList.remove('hidden');
            }
        });
    }

    // 自动登录
    const savedToken = sessionStorage.getItem('auth_token');
    if (savedToken) {
        _authToken = savedToken;
        fetch('/api/verify', { method: 'POST', headers: { 'Authorization': 'Bearer ' + savedToken } })
            .then(r => r.json())
            .then(data => {
                if (data.authenticated) {
                    updatePageRoleUI(data.role, data.username);
                    hideLoginScreen();
                    initData();
                } else { showLoginScreen(); }
            });
    }

    // 退出登录
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('确定要退出系统吗？')) {
                sessionStorage.removeItem('auth_token');
                window.location.reload();
            }
        });
    }
}
