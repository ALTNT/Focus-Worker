/**
 * PHDShed - Task Management Module
 */

var currentTaskContext = { id: null, type: null, images: [] };

function initTaskManagement() {
    const addLtBtn = document.getElementById('add-longterm-btn');
    const addDBtn = document.getElementById('add-daily-btn');

    if (addLtBtn) {
        addLtBtn.addEventListener('click', () => {
            const name = document.getElementById('longterm-task-input').value.trim();
            const ddl = document.getElementById('longterm-task-ddl').value;
            if (!name) return;
            taskData.longterm.push({
                id: Date.now(),
                name,
                ddl,
                completed: false,
                createTime: Date.now(),
                logs: []
            });
            document.getElementById('longterm-task-input').value = '';
            renderTasks();
            saveData();
        });
    }

    if (addDBtn) {
        addDBtn.addEventListener('click', () => {
            const name = document.getElementById('daily-task-input').value.trim();
            if (!name) return;
            const today = getTodayString();
            if (!taskData.daily[today]) taskData.daily[today] = [];
            taskData.daily[today].push({
                id: Date.now(),
                name,
                completed: false,
                createTime: Date.now(),
                logs: []
            });
            document.getElementById('daily-task-input').value = '';
            renderTasks();
            saveData();
        });
    }

    if (document.getElementById('task-date-picker')) {
        document.getElementById('task-date-picker').value = getTodayString();
    }

    renderTasks();
}

function populateTaskHistorySelect() {
    const select = document.getElementById('task-history-select');
    if (!select) return;

    const today = getTodayString();
    const activeDate = viewingDate || today;

    const dates = Object.keys(taskData.daily || {})
        .filter(d => taskData.daily[d] && taskData.daily[d].length > 0)
        .sort((a, b) => new Date(b) - new Date(a));

    let html = `<option value="${today}">📋 今日任务</option>`;

    const pastDates = dates.filter(d => d !== today);
    if (pastDates.length > 0) {
        html += `<optgroup label="往期存档记录">`;
        pastDates.forEach(d => {
            const total = taskData.daily[d].length;
            const done = taskData.daily[d].filter(t => t.completed).length;
            const icon = (total === done && total > 0) ? '✅' : '📝';
            html += `<option value="${d}">${icon} ${d} (${done}/${total})</option>`;
        });
        html += `</optgroup>`;
    }

    const currentVal = select.value;
    select.innerHTML = html;

    if (Array.from(select.options).some(opt => opt.value === activeDate)) {
        select.value = activeDate;
    } else if (activeDate !== today) {
        select.insertAdjacentHTML('beforeend', `<option value="${activeDate}" selected>🫙 空记录 (${activeDate})</option>`);
        select.value = activeDate;
    } else {
        select.value = today;
    }
}

function renderTasks() {
    populateTaskHistorySelect();

    const today = getTodayString();
    const activeDate = viewingDate || today;
    const isHistory = activeDate !== today;
    const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';

    // 长期攻关任务
    const ltContainer = document.getElementById('longterm-tasks-container');
    if (ltContainer) {
        const sortedLT = [...taskData.longterm].sort((a, b) => (a.ddl || '9999') > (b.ddl || '9999') ? 1 : -1);
        ltContainer.innerHTML = sortedLT.length ? sortedLT.map(t => `
            <div class="task-item bg-white/50 border-secondary/20 shadow-sm">
                <div class="flex items-center gap-3 flex-1 overflow-hidden">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleLongterm(${t.id})" class="w-5 h-5 accent-primary cursor-pointer shrink-0">
                    <div class="flex-1 overflow-hidden">
                        <div class="text-[15px] font-bold truncate ${t.completed ? 'line-through text-text/30' : 'text-text/80'}">${escapeHTML(t.name)}</div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] text-text/40"><i class="fa fa-clock-o"></i> ${formatTime(t.createTime)}</span>
                            ${t.ddl ? `<span class="text-[10px] text-danger/70 font-black"><i class="fa fa-calendar-times-o"></i> DDL: ${t.ddl}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="openTaskLogModal(${t.id}, 'longterm')" class="task-btn" title="查看研习日志"><i class="fa fa-book"></i></button>
                    <button onclick="openTaskEditModal(${t.id}, 'longterm')" class="task-btn" title="修改任务"><i class="fa fa-pencil"></i></button>
                    <button onclick="removeLongterm(${t.id})" class="task-btn hover:text-red-400" title="删除"><i class="fa fa-trash"></i></button>
                </div>
            </div>
        `).join('') : '<p class="text-[12px] text-text/30 italic py-4 text-center">暂无长期攻关任务...</p>';
    }

    // 今日/存档任务
    const dContainer = document.getElementById('daily-tasks-container');
    if (dContainer) {
        const daily = taskData.daily[activeDate] || [];
        dContainer.innerHTML = daily.length ? daily.map((t, index) => `
            <div class="task-item ${isHistory ? 'bg-secondary/5 opacity-80' : 'bg-secondary/10 hover:border-warning/30'}">
                <div class="flex items-center gap-3 flex-1 overflow-hidden">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} 
                        ${isHistory ? 'disabled' : `onchange="toggleDaily(${t.id})"`} 
                        class="w-5 h-5 accent-warning ${isHistory ? 'cursor-not-allowed' : 'cursor-pointer'} shrink-0">
                    <div class="flex-1 overflow-hidden">
                        <div class="text-[15px] font-bold truncate ${t.completed ? 'line-through text-text/30' : 'text-text/80'}">${escapeHTML(t.name)}</div>
                        <div class="text-[10px] text-text/40 mt-0.5"><i class="fa fa-clock-o"></i> ${formatTime(t.createTime)} ${t.rolledFrom ? '· 续自昨日' : ''}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="openTaskLogModal(${t.id}, 'daily')" class="task-btn" title="查看研习日志"><i class="fa fa-book"></i></button>
                    ${!isHistory ? `
                        <button onclick="openTaskEditModal(${t.id}, 'daily')" class="task-btn" title="修改任务"><i class="fa fa-pencil"></i></button>
                        <button onclick="moveDailyTask(${index}, -1)" class="task-btn" title="上移"><i class="fa fa-chevron-up"></i></button>
                        <button onclick="moveDailyTask(${index}, 1)" class="task-btn" title="下移"><i class="fa fa-chevron-down"></i></button>
                        <button onclick="removeDaily(${t.id})" class="task-btn hover:text-red-400" title="删除"><i class="fa fa-trash"></i></button>
                    ` : ''}
                </div>
            </div>
        `).join('') : `<p class="text-[12px] text-text/30 italic py-4 text-center">${activeDate === today ? '今日尚未安排攻关任务...' : '该日无任务记录'}</p>`;
    }

    updateTaskProgress();
}

function updateTaskProgress() {
    const today = getTodayString();
    const activeDate = viewingDate || today;
    const daily = taskData.daily[activeDate] || [];
    const all = [...daily];

    if (all.length === 0) {
        if (document.getElementById('task-progress-percent')) document.getElementById('task-progress-percent').textContent = '0%';
        if (document.getElementById('task-progress-bar')) document.getElementById('task-progress-bar').style.width = '0%';
        return;
    }
    const done = all.filter(t => t.completed).length;
    const percent = Math.round((done / all.length) * 100);
    if (document.getElementById('task-progress-percent')) document.getElementById('task-progress-percent').textContent = `${percent}%`;
    if (document.getElementById('task-progress-bar')) document.getElementById('task-progress-bar').style.width = `${percent}%`;
}

function changeViewingDate(date) {
    if (!date) return;
    viewingDate = date;

    const today = getTodayString();
    const isToday = date === today;

    const picker = document.getElementById('task-date-picker');
    if (picker) picker.value = date;

    document.getElementById('task-list-title').textContent = isToday ? '今日任务清单' : `存档任务 (${date})`;
    document.getElementById('back-to-today-btn').classList.toggle('hidden', isToday);
    document.getElementById('history-notice').classList.toggle('hidden', isToday);

    document.getElementById('daily-task-input-area')?.classList.toggle('hidden', !isToday);

    renderTasks();
    updateTodayStatus(); 
    if (typeof initHeatmap === 'function') initHeatmap(); 
}

function resetToToday() {
    const today = getTodayString();
    const picker = document.getElementById('task-date-picker');
    if (picker) picker.value = today;
    changeViewingDate(today);
}

// --- Window Functions (Global Access) ---

window.toggleLongterm = (id) => {
    const t = taskData.longterm.find(x => x.id === id);
    if (t) t.completed = !t.completed;
    renderTasks(); saveData();
};

window.removeLongterm = (id) => {
    if (confirm('确定移除此长期攻关任务？')) {
        taskData.longterm = taskData.longterm.filter(x => x.id !== id);
        renderTasks(); saveData();
    }
};

window.toggleDaily = (id) => {
    const today = getTodayString();
    const t = taskData.daily[today].find(x => x.id === id);
    if (t) t.completed = !t.completed;
    renderTasks(); saveData();
};

window.removeDaily = (id) => {
    const today = getTodayString();
    taskData.daily[today] = taskData.daily[today].filter(x => x.id !== id);
    renderTasks(); saveData();
};

window.moveDailyTask = (index, direction) => {
    const today = getTodayString();
    const daily = taskData.daily[today];
    if (!daily) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= daily.length) return;
    [daily[index], daily[newIndex]] = [daily[newIndex], daily[index]];
    renderTasks();
    saveData();
};

window.openTaskLogModal = (id, type) => {
    setModalState(true, 'task-log-modal');
    currentTaskContext = { id, type, images: [] };
    const activeDate = viewingDate || getTodayString();
    const list = type === 'longterm' ? taskData.longterm : (taskData.daily[activeDate] || []);
    const task = list.find(t => t.id === id);
    if (!task) return;

    document.getElementById('log-modal-title').textContent = `研究日志: ${task.name}`;
    document.getElementById('task-log-modal').classList.remove('hidden');
    renderLogHistory(task.logs || []);

    document.getElementById('new-log-text').value = '';
    document.getElementById('log-image-previews').innerHTML = '';
};

window.closeTaskLogModal = () => {
    setModalState(false);
    document.getElementById('task-log-modal').classList.add('hidden');
};

function renderLogHistory(logs) {
    const container = document.getElementById('log-history-container');
    if (logs.length === 0) {
        container.innerHTML = '<div class="text-center text-text/30 italic py-10">尚无研究记录，开始你的第一次记录吧...</div>';
        return;
    }
    container.innerHTML = logs.sort((a, b) => b.time - a.time).map(log => `
        <div class="bg-secondary/5 rounded-2xl p-4 border border-secondary/20 relative">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg">
                    ${new Date(log.time).toLocaleString()}
                </span>
            </div>
            <div class="text-sm text-text/80 leading-relaxed whitespace-pre-wrap">${escapeHTML(log.text)}</div>
            ${log.images && log.images.length ? `
                <div class="flex flex-wrap gap-2 mt-3">
                    ${log.images.map(item => renderAttachmentHTML(item, { size: 'h-32' })).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

window.saveNewLog = async () => {
    const text = document.getElementById('new-log-text').value.trim();
    if (!text && currentTaskContext.images.length === 0) return;

    const saveBtn = document.getElementById('save-log-btn');
    const originalText = saveBtn.textContent;

    const activeDate = viewingDate || getTodayString();
    const list = currentTaskContext.type === 'longterm' ? taskData.longterm : (taskData.daily[activeDate] || []);
    const task = list.find(t => t.id === currentTaskContext.id);

    if (task) {
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        if (!task.logs) task.logs = [];
        task.logs.push({
            id: Date.now(),
            time: Date.now(),
            text,
            images: currentTaskContext.images
        });

        await saveData(true); 

        renderLogHistory(task.logs);
        document.getElementById('new-log-text').value = '';
        document.getElementById('log-image-previews').innerHTML = '';
        currentTaskContext.images = [];
        renderTasks();

        saveBtn.textContent = '已保存！';
        saveBtn.classList.remove('bg-primary');
        saveBtn.classList.add('bg-success');

        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('bg-success');
            saveBtn.classList.add('bg-primary');
        }, 2000);
    }
};

window.openTaskEditModal = (id, type) => {
    setModalState(true, 'task-edit-modal');
    currentTaskContext = { id, type };
    const activeDate = viewingDate || getTodayString();
    const list = type === 'longterm' ? taskData.longterm : (taskData.daily[activeDate] || []);
    const task = list.find(t => t.id === id);
    if (!task) return;

    document.getElementById('edit-task-name').value = task.name;
    const ddlContainer = document.getElementById('edit-task-ddl-container');
    if (type === 'longterm') {
        ddlContainer.classList.remove('hidden');
        document.getElementById('edit-task-ddl').value = task.ddl || '';
    } else {
        ddlContainer.classList.add('hidden');
    }
    document.getElementById('task-edit-modal').classList.remove('hidden');
};

window.closeTaskEditModal = () => {
    setModalState(false);
    document.getElementById('task-edit-modal').classList.add('hidden');
};

window.saveTaskEdit = () => {
    const name = document.getElementById('edit-task-name').value.trim();
    if (!name) return;

    const activeDate = viewingDate || getTodayString();
    const list = currentTaskContext.type === 'longterm' ? taskData.longterm : (taskData.daily[activeDate] || []);
    const task = list.find(t => t.id === currentTaskContext.id);

    if (task) {
        task.name = name;
        if (currentTaskContext.type === 'longterm') {
            task.ddl = document.getElementById('edit-task-ddl').value;
        }
        renderTasks();
        saveData();
        closeTaskEditModal();
    }
};
