/**
 * PHDShed - Leave Management Module
 */

function initLeaveManagement() {
    // 设置默认请假日期为今天
    const dateInput = document.getElementById('leave-date');
    if (dateInput) {
        dateInput.value = getTodayString();
    }

    // 添加请假按钮事件
    const addLeaveBtn = document.getElementById('add-leave');
    if (addLeaveBtn) {
        addLeaveBtn.addEventListener('click', function () {
            addLeave();
        });
    }

    // 更新请假记录列表
    updateLeaveRecordsList();
}

// 添加请假记录
function addLeave() {
    const date = document.getElementById('leave-date').value;
    const reason = document.getElementById('leave-reason').value.trim();

    if (!date) {
        alert('请选择请假日期');
        return;
    }

    if (!reason) {
        alert('请输入请假理由');
        return;
    }

    // 检查是否已有该日期的请假记录
    const existingLeaveIndex = leaveData.findIndex(leave => leave.date === date);

    if (existingLeaveIndex !== -1) {
        // 更新现有记录
        leaveData[existingLeaveIndex].reason = reason;
    } else {
        // 添加新记录
        leaveData.push({ date, reason });
    }

    // 更新打卡数据 (确保结构与 app-state.js 中定义的一致)
    if (!checkinData[date]) {
        checkinData[date] = {
            startWork: null,
            endWork: null,
            duration: 0,
            phases: [],
            mood: '',
            leave: false,
            leaveReason: ''
        };
    }

    checkinData[date].leave = true;
    checkinData[date].leaveReason = reason;

    // 保存数据
    saveData();

    // 清空输入框
    const reasonInput = document.getElementById('leave-reason');
    if (reasonInput) {
        reasonInput.value = '';
    }

    // 更新请假记录列表
    updateLeaveRecordsList();

    // 如果是今天的请假，更新状态
    if (date === getTodayString()) {
        if (typeof updateTodayStatus === 'function') updateTodayStatus();
    }
}

// 更新请假记录列表
function updateLeaveRecordsList() {
    const tableBody = document.getElementById('leave-records-table');
    if (!tableBody) return;

    if (leaveData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 px-4 text-center text-text/30 italic">暂无请假记录</td></tr>';
        return;
    }

    const sortedLeaveData = [...leaveData].sort((a, b) => new Date(b.date) - new Date(a.date));
    tableBody.innerHTML = '';

    sortedLeaveData.forEach(leave => {
        const row = document.createElement('tr');
        const date = new Date(leave.date);
        const formattedDate = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

        row.innerHTML = `
            <td class="py-2 px-4 border-b border-secondary/20 text-sm text-text/80">${formattedDate}</td>
            <td class="py-2 px-4 border-b border-secondary/20 text-sm text-text/60">${escapeHTML(leave.reason)}</td>
            <td class="py-2 px-4 border-b border-secondary/20 text-right">
                <button onclick="deleteLeave('${escapeHTML(leave.date)}')" 
                    class="px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[10px] font-bold transition-colors">
                    删除
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 删除请假记录
function deleteLeave(date) {
    if (confirm('确定要删除这条请假记录吗？')) {
        leaveData = leaveData.filter(leave => leave.date !== date);
        if (checkinData[date]) {
            checkinData[date].leave = false;
            checkinData[date].leaveReason = '';
        }
        saveData();
        updateLeaveRecordsList();
        if (date === getTodayString()) {
            if (typeof updateTodayStatus === 'function') updateTodayStatus();
        }
    }
}

// 挂载到 window 方便 HTML onclick 调用
window.deleteLeave = deleteLeave;
window.addLeave = addLeave;
window.updateLeaveRecordsList = updateLeaveRecordsList;
window.initLeaveManagement = initLeaveManagement;
