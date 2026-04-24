/**
 * PHDShed - File Upload & Management Engine
 */

const uploadCounters = new Map();

window.coreHandleFileUpload = async ({ file, previewContainerId, saveBtnId, context }) => {
    const previewContainer = document.getElementById(previewContainerId);
    const saveBtn = document.getElementById(saveBtnId);
    if (!previewContainer || !saveBtn) return;

    // 30MB 限制
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        alert('文件太大啦！限制在 30MB 以内哦');
        return;
    }

    // 禁止可执行文件
    const blockedExts = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.com'];
    const isBlocked = blockedExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (isBlocked) {
        alert('出于安全考虑，暂时不支持上传可执行文件哦');
        return;
    }

    const count = (uploadCounters.get(saveBtnId) || 0) + 1;
    uploadCounters.set(saveBtnId, count);

    const id = Date.now() + Math.random();
    const previewItem = document.createElement('div');
    const isImage = file.type.startsWith('image/');

    // 根据类型设置预览项样式
    if (isImage) {
        previewItem.className = 'relative w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center overflow-hidden border border-secondary/30 group';
    } else {
        previewItem.className = 'relative flex items-center gap-2 p-2 px-3 bg-secondary/10 border border-secondary/20 rounded-lg group max-w-[140px]';
    }

    previewItem.id = `preview-${id}`;
    previewItem.innerHTML = `<i class="fa fa-spinner fa-spin text-primary"></i> <span class="text-[9px] text-text/40 truncate">${file.name}</span>`;
    previewContainer.appendChild(previewItem);

    if (count === 1) {
        saveBtn.dataset.originalText = saveBtn.textContent;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = `上传中(${uploadCounters.get(saveBtnId)})...`;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/user/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            const attachment = {
                url: data.url,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: Date.now()
            };
            context.images.push(attachment);

            if (isImage) {
                previewItem.innerHTML = `
                    <img src="${data.url}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${data.url}')">
                    <button class="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                        onclick="event.stopPropagation(); window.removeLogImage('${previewContainerId}', '${data.url}', '${previewItem.id}', ${saveBtnId === 'save-log-btn' ? 'true' : 'false'})">
                        <i class="fa fa-times text-[8px]"></i>
                    </button>
                `;
            } else {
                const iconClass = getFileIcon(file.type, file.name);
                previewItem.innerHTML = `
                    <i class="fa ${iconClass} text-xs shrink-0"></i>
                    <span class="text-[9px] font-bold text-text/70 truncate" title="${file.name}">${file.name}</span>
                    <button class="ml-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onclick="event.stopPropagation(); window.removeLogImage('${previewContainerId}', '${data.url}', '${previewItem.id}', ${saveBtnId === 'save-log-btn' ? 'true' : 'false'})">
                        <i class="fa fa-times text-[8px]"></i>
                    </button>
                `;
            }
            previewItem.title = file.name;
        } else {
            previewItem.classList.add('bg-red-50');
            previewItem.innerHTML = `<i class="fa fa-exclamation-triangle text-red-400"></i> <span class="text-[8px] text-red-400">失败</span>`;
            alert('上传失败: ' + (data.error || '未知错误'));
        }
    } catch (err) {
        console.error('Upload Error:', err);
        alert('网络上传失败，请检查连接');
    } finally {
        const newCount = uploadCounters.get(saveBtnId) - 1;
        uploadCounters.set(saveBtnId, newCount);

        if (newCount <= 0) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.dataset.originalText || (saveBtnId === 'save-log-btn' ? '发布日志' : '发布记录');
            uploadCounters.delete(saveBtnId);
        } else {
            saveBtn.textContent = `上传中(${newCount})...`;
        }
    }
};

window.removeLogImage = (containerId, url, itemId, isTask) => {
    const item = document.getElementById(itemId);
    if (item) item.remove();
    if (isTask) {
        currentTaskContext.images = currentTaskContext.images.filter(i => (typeof i === 'string' ? i : i.url) !== url);
    } else {
        currentLogImages = currentLogImages.filter(i => (typeof i === 'string' ? i : i.url) !== url);
    }
};

function initUploadEngine() {
    // 全局粘贴监听器 (截图直传)
    document.addEventListener('paste', async (e) => {
        const taskModal = document.getElementById('task-log-modal');
        const logsModal = document.getElementById('logs-modal');

        let config = null;
        if (taskModal && !taskModal.classList.contains('hidden')) {
            config = { context: currentTaskContext, previewId: 'log-image-previews', btnId: 'save-log-btn' };
        } else if (logsModal && !logsModal.classList.contains('hidden')) {
            config = { context: { images: typeof currentLogImages !== 'undefined' ? currentLogImages : [] }, previewId: 'logs-image-previews', btnId: 'add-log-entry-btn' };
        }

        if (!config) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) window.coreHandleFileUpload({ file, previewContainerId: config.previewId, saveBtnId: config.btnId, context: config.context });
            }
        }
    });

    // 处理任务日志图片上传 (原有的点击选择逻辑)
    document.getElementById('log-image-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            window.coreHandleFileUpload({
                file,
                previewContainerId: 'log-image-previews',
                saveBtnId: 'save-log-btn',
                context: currentTaskContext
            });
        }
    });

    // 投稿日志中的附件上传
    const logsImageInput = document.getElementById('logs-image-input');
    if (logsImageInput) {
        logsImageInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                window.coreHandleFileUpload({
                    file,
                    previewContainerId: 'logs-image-previews',
                    saveBtnId: 'add-log-entry-btn',
                    context: { images: currentLogImages }
                });
            }
        });
    }
}
