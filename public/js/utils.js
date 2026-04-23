/**
 * PHDShed - Utility functions
 */

// HTML 转义，防止 XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 获取今日日期字符串 (YYYY-MM-DD)
function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期对象为本地 YYYY-MM-DD
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取当前时间字符串 (HH:MM)
function getCurrentTimeString() {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
}

// 获取当前时间对象 { hour, minute }
function getCurrentTime() {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
}

// 将秒数格式化为 Hh Mm Ss
function formatTimerSeconds(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
}

// 根据文件类型/名称获取 FontAwesome 图标类
function getFileIcon(type, name) {
    if (type.startsWith('image/')) return 'fa-file-image-o';
    if (type.includes('pdf')) return 'fa-file-pdf-o text-red-500';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'fa-file-word-o text-blue-500';
    if (type.includes('excel') || type.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'fa-file-excel-o text-green-500';
    if (type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'fa-file-powerpoint-o text-orange-500';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive') || name.endsWith('.7z')) return 'fa-file-archive-o text-purple-500';
    if (type.includes('text') || name.endsWith('.txt')) return 'fa-file-text-o text-gray-400';
    return 'fa-file-o text-gray-400';
}

// 弹窗状态管理 (控制 body 滚动)
function setModalState(isOpen, modalId) {
    if (isOpen) {
        document.documentElement.classList.add('modal-open');
        if (modalId) {
            const el = document.getElementById(modalId);
            if (el) {
                el.setAttribute('tabindex', '-1');
                el.focus();
            }
        }
    } else {
        document.documentElement.classList.remove('modal-open');
    }
}
