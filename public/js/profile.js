/**
 * PHDShed - Profile & User Settings Module
 */

function updateHeaderProfileUI() {
    const headerNickname = document.getElementById('header-nickname');
    const headerUsername = document.getElementById('header-username');
    const headerAvatar = document.getElementById('header-avatar');

    if (headerNickname) headerNickname.textContent = userProfile.nickname || _username;
    if (headerUsername) headerUsername.textContent = '@' + _username;

    const defaultAvatar = `https://ui-avatars.com/api/?name=${_username}&background=B7C9B5&color=fff`;
    if (headerAvatar) headerAvatar.src = userProfile.avatarBase64 || defaultAvatar;
}

function openProfileModal() {
    setModalState(true, 'profile-modal');
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('password-error').classList.add('hidden');
    document.getElementById('password-success').classList.add('hidden');
    document.getElementById('profile-msg').classList.add('hidden');

    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';

    document.getElementById('profile-nickname').value = userProfile.nickname || '';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${_username}&background=B7C9B5&color=fff`;
    document.getElementById('profile-avatar-preview').src = userProfile.avatarBase64 || defaultAvatar;
}

function closeProfileModal() {
    setModalState(false);
    document.getElementById('profile-modal').classList.add('hidden');
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // 缩小至 128x128 限制体积
            const MAX_SIZE = 128;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= Math.round(MAX_SIZE / width);
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= Math.round(MAX_SIZE / height);
                    height = MAX_SIZE;
                }
            }

            canvas.width = MAX_SIZE;
            canvas.height = MAX_SIZE;
            // 以 Cover 方式居中截取并缩放
            const scale = Math.max(MAX_SIZE / img.width, MAX_SIZE / img.height);
            const x = (MAX_SIZE / scale - img.width) / 2;
            const y = (MAX_SIZE / scale - img.height) / 2;
            ctx.drawImage(img, x, y, img.width, img.height, 0, 0, MAX_SIZE, MAX_SIZE);

            const base64 = canvas.toDataURL('image/webp', 0.8); // WebP 格式节省体积
            document.getElementById('profile-avatar-preview').src = base64;
            userProfile.avatarBase64 = base64;
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

async function saveProfile() {
    const nickname = document.getElementById('profile-nickname').value.trim();
    const msgEl = document.getElementById('profile-msg');

    userProfile.nickname = nickname;

    msgEl.textContent = '保存中...';
    msgEl.classList.remove('hidden', 'text-danger', 'text-success');
    msgEl.classList.add('block', 'text-text/60');

    try {
        await saveData(true);
        updateHeaderProfileUI();
        msgEl.textContent = '资料保存成功！';
        msgEl.classList.remove('text-text/60', 'text-danger');
        msgEl.classList.add('text-success');
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
    } catch (e) {
        msgEl.textContent = '保存失败，请稍后重试';
        msgEl.classList.remove('text-text/60', 'text-success');
        msgEl.classList.add('text-danger');
    }
}

async function handlePasswordChange() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errEl = document.getElementById('password-error');
    const successEl = document.getElementById('password-success');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!oldPassword || !newPassword || !confirmPassword) {
        errEl.textContent = '请填写所有字段';
        errEl.classList.remove('hidden');
        return;
    }
    if (newPassword !== confirmPassword) {
        errEl.textContent = '两次输入的新密码不一致';
        errEl.classList.remove('hidden');
        return;
    }
    if (newPassword.length < 8) {
        errEl.textContent = '新密码至少需要8位';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await apiCall('/user/change-password', 'POST', { oldPassword, newPassword });
        if (res && res.success) {
            successEl.classList.remove('hidden');
            setTimeout(() => {
                closeProfileModal();
                // 提示重新登录
                if (confirm('密码修改成功，为了安全请重新登录。')) {
                    sessionStorage.removeItem('auth_token');
                    window.location.reload();
                }
            }, 1000);
        } else if (res && res.error) {
            errEl.textContent = res.error;
            errEl.classList.remove('hidden');
        }
    } catch (err) {
        errEl.textContent = '提交失败，请稍后重试';
        errEl.classList.remove('hidden');
    }
}

window.generateWidgetToken = async function () {
    const btn = document.getElementById('generate-widget-token-btn');
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 生成中...';
    try {
        const res = await fetch('/api/user/widget-token', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` }
        });
        const data = await res.json();
        if (data.success) {
            btn.classList.add('hidden');
            document.getElementById('widget-token-container').classList.remove('hidden');
            document.getElementById('widget-token-input').value = data.token;
        } else {
            alert('获取失败: ' + data.error);
        }
    } catch (e) {
        alert('网络异常');
    } finally {
        btn.innerHTML = '<i class="fa fa-key"></i> 点击获取小组件密钥';
    }
}

window.copyWidgetToken = function () {
    const input = document.getElementById('widget-token-input');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        alert('长期密钥已复制！马上填入快捷指令或小组件脚本中吧。');
    });
}

function initProfile() {
    // 个人资料
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', openProfileModal);
    }

    const submitPasswordBtn = document.getElementById('submit-password-btn');
    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener('click', handlePasswordChange);
    }

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
}
