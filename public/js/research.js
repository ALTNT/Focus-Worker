/**
 * PHDShed - Research & Submission Logs Module
 */

// --- Constants ---
const paperPhases = [
    { name: '文献调研', percent: 15 },
    { name: '方法设计', percent: 30 },
    { name: '实验阶段', percent: 50 },
    { name: '写作阶段', percent: 75 },
    { name: '打磨润色', percent: 90 },
    { name: '准备提交', percent: 100 }
];

const statusColors = {
    'Submitted': 'bg-gray-100 text-gray-700',
    'Under Review': 'bg-yellow-100 text-yellow-800',
    'Major Revision': 'bg-orange-100 text-orange-700',
    'Minor Revision': 'bg-blue-100 text-blue-700',
    'Accepted': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-700',
};

const subStatuses = [
    'Submitted', 'Under Review', 'Major Revision', 'Minor Revision', 'Accepted', 'Rejected'
];

// --- State ---
let currentLogType = null; // 'paper' or 'submission'
let currentLogId = null;
let editingLogDate = null; 
let currentLogImages = []; // 用于论文/投稿日志的临时图片存储

// --- Papers Management ---
function initPapersManagement() {
    const addBtn = document.getElementById('add-paper-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const title = document.getElementById('paper-title').value.trim();
        if (!title) return;
        const notes = document.getElementById('paper-notes').value.trim();
        papersData.push({
            id: Date.now(),
            title,
            venue: document.getElementById('paper-venue').value,
            phase: document.getElementById('paper-phase').value,
            deadline: document.getElementById('paper-deadline').value,
            logs: notes ? [{ date: new Date().toISOString(), content: notes }] : []
        });
        document.getElementById('paper-title').value = '';
        document.getElementById('paper-notes').value = '';
        saveData();
        renderPapersTable();
    });
    renderPapersTable();
}

function renderPapersTable() {
    const tb = document.getElementById('papers-table');
    if (!tb) return;
    if (!papersData.length) { 
        tb.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">暂无记录</td></tr>'; 
        return; 
    }
    tb.innerHTML = papersData.map(p => {
        const phaseObj = paperPhases.find(ph => ph.name === p.phase) || { percent: 0 };
        return `<tr>
        <td class="py-3 px-4 border-b font-medium text-gray-800">${escapeHTML(p.title)}</td>
        <td class="py-3 px-4 border-b text-gray-600 font-mono text-xs">${escapeHTML(p.venue) || '-'}</td>
        <td class="py-3 px-4 border-b">
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-medium whitespace-nowrap">${escapeHTML(p.phase)}</span>
            </div>
        </td>
        <td class="py-3 px-4 border-b min-w-[120px]">
            <div class="flex items-center gap-2">
                <div class="w-full bg-gray-100 rounded-full h-1.5 flex-1">
                    <div class="bg-primary h-1.5 rounded-full" style="width: ${phaseObj.percent}%"></div>
                </div>
                <span class="text-[10px] text-gray-500 font-medium">${phaseObj.percent}%</span>
            </div>
        </td>
        <td class="py-3 px-4 border-b text-sm text-gray-500 max-w-[150px]">
            <button onclick="openLogsModal('paper', ${p.id})" class="text-primary hover:text-secondary flex items-center gap-1 font-medium transition-colors">
                <i class="fa fa-file-text-o"></i>
                <span>${p.logs && p.logs.length > 0 ? `查看日志(${p.logs.length})` : '写第一条心得'}</span>
            </button>
        </td>
        <td class="py-3 px-4 border-b text-right">
            <div class="flex justify-end gap-2 text-xs">
                <select onchange="updatePaperPhase(${p.id}, this.value)" class="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 focus:outline-none">
                    ${paperPhases.map(ph => `<option value="${ph.name}" ${p.phase === ph.name ? 'selected' : ''}>${ph.name}</option>`).join('')}
                </select>
                <button onclick="deletePaper(${p.id})" class="text-red-400 hover:text-red-600 transition-colors">删除</button>
            </div>
        </td>
    </tr>`}).join('');
}

window.updatePaperPhase = function (id, newPhase) {
    const paper = papersData.find(p => p.id === id);
    if (paper) {
        paper.phase = newPhase;
        saveData();
        renderPapersTable();
    }
};

window.deletePaper = function (id) {
    if (confirm('确定要删除这篇论文吗？')) {
        papersData = papersData.filter(p => p.id !== id);
        saveData(); 
        renderPapersTable();
    }
};

// --- Submissions Management ---
function initSubmissionsManagement() {
    const addBtn = document.getElementById('add-submission-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const title = document.getElementById('sub-title').value.trim();
        if (!title) return;
        const notes = document.getElementById('sub-notes').value.trim();
        const status = document.getElementById('sub-status').value;
        submissionsData.push({
            id: Date.now(),
            title,
            venue: document.getElementById('sub-venue').value,
            status: status,
            date: document.getElementById('sub-date').value,
            logs: notes ? [{ date: new Date().toISOString(), reviewerComments: notes, myResponse: '', status: status }] : []
        });
        document.getElementById('sub-title').value = '';
        document.getElementById('sub-notes').value = '';
        saveData();
        renderSubmissionsTable();
    });
    renderSubmissionsTable();
}

function renderSubmissionsTable() {
    const tb = document.getElementById('submissions-table');
    if (!tb) return;
    if (!submissionsData.length) { 
        tb.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">暂无记录</td></tr>'; 
        return; 
    }
    tb.innerHTML = submissionsData.map(s => `<tr>
        <td class="py-3 px-4 border-b font-medium text-gray-800">${escapeHTML(s.title)}</td>
        <td class="py-3 px-4 border-b text-gray-600 font-mono text-xs">${escapeHTML(s.venue) || '-'}</td>
        <td class="py-3 px-4 border-b">
            <span class="px-2 py-1 rounded text-xs font-semibold ${statusColors[s.status] || 'bg-gray-100'}">${escapeHTML(s.status)}</span>
        </td>
        <td class="py-3 px-4 border-b text-sm text-gray-500">${escapeHTML(s.date) || '-'}</td>
        <td class="py-3 px-4 border-b text-sm text-gray-500 max-w-[150px]">
            <button onclick="openLogsModal('submission', ${s.id})" class="text-secondary hover:text-primary flex items-center gap-1 font-medium transition-colors">
                <i class="fa fa-comments-o"></i>
                <span>${s.logs && s.logs.length > 0 ? `查看详情(${s.logs.length})` : '记录评审'}</span>
            </button>
        </td>
        <td class="py-3 px-4 border-b text-right">
            <div class="flex justify-end gap-2 text-xs">
                <select onchange="updateSubmissionStatus(${s.id}, this.value)" class="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 focus:outline-none">
                    ${subStatuses.map(st => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                </select>
                <button onclick="deleteSubmission(${s.id})" class="text-red-400 hover:text-red-600 transition-colors">删除</button>
            </div>
        </td>
    </tr>`).join('');
}

window.updateSubmissionStatus = function (id, newStatus) {
    const sub = submissionsData.find(s => s.id === id);
    if (sub) {
        sub.status = newStatus;
        saveData();
        renderSubmissionsTable();
    }
};

window.deleteSubmission = function (id) {
    if (confirm('确定要删除这条投稿记录吗？')) {
        submissionsData = submissionsData.filter(s => s.id !== id);
        saveData(); 
        renderSubmissionsTable();
    }
};

// --- Logs Modal Logic ---
window.openLogsModal = function (type, id) {
    setModalState(true, 'logs-modal');
    currentLogType = type;
    currentLogId = id;
    currentLogImages = [];
    const modal = document.getElementById('logs-modal');
    const paperInputs = document.getElementById('paper-log-inputs');
    const subInputs = document.getElementById('sub-log-inputs');
    const title = document.getElementById('logs-modal-title');
    const inputTitle = document.getElementById('logs-input-title');

    // 清理预览区
    const previewContainer = document.getElementById('logs-image-previews');
    if (previewContainer) previewContainer.innerHTML = '';

    modal.classList.remove('hidden');
    cancelEdit();
    if (type === 'paper') {
        const paper = papersData.find(p => p.id === id);
        title.textContent = `研究心得/日志: ${paper.title}`;
        paperInputs.classList.remove('hidden');
        subInputs.classList.add('hidden');
        inputTitle.innerHTML = '<i class="fa fa-plus-circle"></i> 新增研究心得';
    } else {
        const sub = submissionsData.find(s => s.id === id);
        title.textContent = `审稿与修改记录: ${sub.title}`;
        paperInputs.classList.add('hidden');
        subInputs.classList.remove('hidden');
        inputTitle.innerHTML = '<i class="fa fa-plus-circle"></i> 记录新一轮评审意见';
    }
    renderTimeline();
}

window.closeLogsModal = function () {
    setModalState(false);
    document.getElementById('logs-modal').classList.add('hidden');
    currentLogImages = [];
}

window.renderTimeline = function () {
    const container = document.getElementById('logs-timeline');
    if (!container) return;
    let logs = [];
    if (currentLogType === 'paper') {
        const paper = papersData.find(p => p.id === currentLogId);
        logs = paper ? (paper.logs || []) : [];
    } else {
        const sub = submissionsData.find(s => s.id === currentLogId);
        logs = sub ? (sub.logs || []) : [];
    }

    if (logs.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">暂无记录，开启你的第一条日志吧</div>';
        return;
    }

    // 按时间降序排列
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedLogs.map(log => {
        const dateStr = new Date(log.date).toLocaleDateString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });

        const attachmentsHTML = log.images && log.images.length ? `
            <div class="flex flex-wrap gap-2 mt-3">
                ${log.images.map(item => renderAttachmentHTML(item, { size: 'h-24' })).join('')}
            </div>
        ` : '';

        if (currentLogType === 'paper') {
            return `
            <div class="relative last:mb-0 group">
                <div class="absolute -left-[31px] w-3 h-3 bg-primary rounded-full ring-4 ring-white"></div>
                <div class="flex items-center justify-between mb-1">
                    <div class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">${dateStr}</div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editLogEntry('${log.date}')" class="text-primary hover:text-secondary p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                        <button onclick="deleteLogEntry('${log.date}')" class="text-red-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash-o"></i></button>
                    </div>
                </div>
                <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed">
                    ${escapeHTML(log.content).replace(/\n/g, '<br>')}
                    ${attachmentsHTML}
                </div>
            </div>`;
        } else {
            return `
            <div class="relative last:mb-0 group">
                <div class="absolute -left-[31px] w-3 h-3 bg-secondary rounded-full ring-4 ring-white"></div>
                <div class="flex items-center justify-between mb-1">
                    <div class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">${dateStr}</div>
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                            <button onclick="editLogEntry('${log.date}')" class="text-secondary hover:text-primary p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                            <button onclick="deleteLogEntry('${log.date}')" class="text-red-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash-o"></i></button>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-bold border border-gray-200">阶段: ${escapeHTML(log.status) || 'Unknown'}</span>
                    </div>
                </div>
                <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
                    <div>
                        <div class="text-[10px] text-red-500 font-black mb-1 uppercase flex items-center gap-1">
                            <i class="fa fa-comment-o"></i> 审稿人意见
                        </div>
                        <div class="text-xs text-gray-600 italic bg-red-50/50 p-2 rounded-lg border border-red-50">${log.reviewerComments ? escapeHTML(log.reviewerComments).replace(/\n/g, '<br>') : '无备注'}</div>
                    </div>
                    <div class="pt-2">
                        <div class="text-[10px] text-green-600 font-black mb-1 uppercase flex items-center justify-end gap-1">
                            我的回复与修改 <i class="fa fa-reply"></i>
                        </div>
                        <div class="text-xs text-gray-800 bg-green-50/50 p-2 rounded-lg border border-green-50 text-right">${log.myResponse ? escapeHTML(log.myResponse).replace(/\n/g, '<br>') : '尚未记录回复'}</div>
                    </div>
                    ${attachmentsHTML}
                </div>
            </div>`;
        }
    }).join('');
}

window.editLogEntry = function (date) {
    editingLogDate = date;
    const containerData = currentLogType === 'paper' ? papersData : submissionsData;
    const parent = containerData.find(x => x.id === currentLogId);
    if (!parent) return;
    const log = parent.logs.find(l => l.date === date);
    if (!log) return;

    currentLogImages = log.images ? [...log.images] : [];
    const previewContainer = document.getElementById('logs-image-previews');
    if (previewContainer) {
        previewContainer.innerHTML = currentLogImages.map((item, idx) => {
            const isLegacy = typeof item === 'string';
            const url = isLegacy ? item : item.url;
            const name = isLegacy ? '图片附件' : item.name;
            const type = isLegacy ? 'image/jpeg' : (item.type || '');
            const isImage = type.startsWith('image/');
            const id = `edit-log-att-${idx}`;

            if (isImage) {
                return `
                    <div id="${id}" class="relative w-12 h-12 rounded-lg bg-secondary/20 overflow-hidden border border-secondary/30 group">
                        <img src="${url}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${url}')">
                        <button class="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                            onclick="event.stopPropagation(); window.removeLogImage('logs-image-previews', '${url}', '${id}', false)">
                            <i class="fa fa-times text-[8px]"></i>
                        </button>
                    </div>
                `;
            } else {
                const iconClass = getFileIcon(type, name);
                return `
                    <div id="${id}" class="relative flex items-center gap-2 p-2 px-3 bg-secondary/10 border border-secondary/20 rounded-lg group max-w-[140px]">
                        <i class="fa ${iconClass} text-xs shrink-0"></i>
                        <span class="text-[9px] font-bold text-text/70 truncate" title="${name}">${name}</span>
                        <button class="ml-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onclick="event.stopPropagation(); window.removeLogImage('logs-image-previews', '${url}', '${id}', false)">
                            <i class="fa fa-times text-[8px]"></i>
                        </button>
                    </div>
                `;
            }
        }).join('');
    }

    if (currentLogType === 'paper') {
        document.getElementById('log-content-paper').value = log.content;
    } else {
        document.getElementById('log-reviewer-comments').value = log.reviewerComments || '';
        document.getElementById('log-my-response').value = log.myResponse || '';
    }

    document.getElementById('add-log-entry-btn').textContent = '保存修改';
    document.getElementById('cancel-log-edit-btn').classList.remove('hidden');
    document.getElementById('logs-timeline-container').nextElementSibling.scrollIntoView({ behavior: 'smooth' });
}

window.cancelEdit = function () {
    editingLogDate = null;
    currentLogImages = [];
    const paperLogInput = document.getElementById('log-content-paper');
    const reviewerInput = document.getElementById('log-reviewer-comments');
    const myResponseInput = document.getElementById('log-my-response');
    if (paperLogInput) paperLogInput.value = '';
    if (reviewerInput) reviewerInput.value = '';
    if (myResponseInput) myResponseInput.value = '';

    const previewContainer = document.getElementById('logs-image-previews');
    if (previewContainer) previewContainer.innerHTML = '';
    
    const addBtn = document.getElementById('add-log-entry-btn');
    if (addBtn) addBtn.textContent = '发布记录';
    
    const cancelBtn = document.getElementById('cancel-log-edit-btn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

window.deleteLogEntry = function (date) {
    if (!confirm('确定要删除这条日志吗？')) return;
    const containerData = currentLogType === 'paper' ? papersData : submissionsData;
    const parent = containerData.find(x => x.id === currentLogId);
    if (parent) {
        parent.logs = parent.logs.filter(l => l.date !== date);
        saveData();
        renderTimeline();
        if (currentLogType === 'paper') renderPapersTable(); else renderSubmissionsTable();
    }
}

function initLogsManagement() {
    const btn = document.getElementById('add-log-entry-btn');
    const cancelBtn = document.getElementById('cancel-log-edit-btn');
    if (!btn) return;

    if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);

    btn.addEventListener('click', () => {
        const images = [...currentLogImages];
        if (currentLogType === 'paper') {
            const content = document.getElementById('log-content-paper').value.trim();
            if (!content && images.length === 0) { alert('请输入心得内容或添加图片'); return; }
            const paper = papersData.find(p => p.id === currentLogId);
            if (!paper) return;
            if (!paper.logs) paper.logs = [];

            if (editingLogDate) {
                const idx = paper.logs.findIndex(l => l.date === editingLogDate);
                if (idx !== -1) {
                    paper.logs[idx].content = content;
                    paper.logs[idx].images = images;
                }
            } else {
                paper.logs.push({ date: new Date().toISOString(), content, images });
            }
            cancelEdit();
            renderPapersTable();
        } else {
            const comments = document.getElementById('log-reviewer-comments').value.trim();
            const response = document.getElementById('log-my-response').value.trim();
            if (!comments && !response && images.length === 0) { alert('请填写审稿意见、回复或添加图片'); return; }
            const sub = submissionsData.find(s => s.id === currentLogId);
            if (!sub) return;
            if (!sub.logs) sub.logs = [];

            if (editingLogDate) {
                const idx = sub.logs.findIndex(l => l.date === editingLogDate);
                if (idx !== -1) {
                    sub.logs[idx].reviewerComments = comments;
                    sub.logs[idx].myResponse = response;
                    sub.logs[idx].images = images;
                }
            } else {
                sub.logs.push({
                    date: new Date().toISOString(),
                    reviewerComments: comments,
                    myResponse: response,
                    images: images,
                    status: sub.status
                });
            }
            cancelEdit();
            renderSubmissionsTable();
        }
        saveData();
        renderTimeline();
    });
}
