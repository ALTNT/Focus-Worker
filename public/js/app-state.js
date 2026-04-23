/**
 * PHDShed - Global State & Initialization
 */

// --- 全局状态变量 ---
var checkinData = {};       // 记录每日专注时长: { 'YYYY-MM-DD': { duration: 0, phases: [], mood: '' } }
var phoneResistData = { totalCount: 0, records: {} };
var taskData = { longterm: [], daily: {} }; // 任务结构
var leaveData = [];
var achievements = [];
var papersData = [];
var submissionsData = [];
var userProfile = { nickname: '', avatarBase64: '' };
var _authToken = null;
var _username = null;       // 当前登录用户名
var _dataLoaded = false;

// 专注计时器状态
var timerInterval = null;
var timerStartTime = null;  // 当前会话开始的时间戳 (ms)
var accumulatedSeconds = 0; // 今日已累计完成的秒数 (base)
var isTimerRunning = false;
var syncCounter = 0; // 自动同步计数器
var lastLocalActionTime = 0; // 最近一次本地操作时间

// 统计分析全局状态
var currentStatsMonth = new Date();
var viewingDate = null; // 当前正在查看的任务日期，默认为 null (即今天)

var _lastSavedValues = {};
var _saveTimeout = null;

// --- 核心状态函数 ---

// 获取当前真实的专注总时长 (包含正在运行的部分)
function getLiveDuration() {
    if (isTimerRunning && timerStartTime) {
        const now = Date.now();
        let activeElapsed = Math.floor((now - timerStartTime) / 1000);

        // 单次 Session 物理上限 12 小时检查，防止挂机导致的脏数据
        if (activeElapsed > 12 * 3600) {
            activeElapsed = 12 * 3600;
        }

        return accumulatedSeconds + activeElapsed;
    }
    return accumulatedSeconds;
}

// 更新最后保存的值，用于脏检查
function updateLastSavedValues() {
    _lastSavedValues = {
        checkin: JSON.stringify(checkinData),
        phoneResist: JSON.stringify(phoneResistData),
        task: JSON.stringify(taskData),
        leave: JSON.stringify(leaveData),
        papers: JSON.stringify(papersData),
        submissions: JSON.stringify(submissionsData),
        profile: JSON.stringify(userProfile),
        achievements: JSON.stringify(achievements)
    };
}

// 脏检查：对比数据是否有变动
function checkChanged(key, data) {
    const str = JSON.stringify(data || null);
    if (_lastSavedValues[key] !== str) {
        _lastSavedValues[key] = str;
        return true;
    }
    return false;
}

// 核心数据初始化逻辑
async function initData() {
    if (_dataLoaded || !_authToken) return;
    _dataLoaded = true;

    const results = await Promise.allSettled([
        apiCall('/data/checkin'), apiCall('/data/phoneResist'),
        apiCall('/data/task'), apiCall('/data/leave'),
        apiCall('/data/papers'), apiCall('/data/submissions'),
        apiCall('/data/profile')
    ]);

    const [cd, pr, td, ld, papers, subs, prof] = results.map(r => r.status === 'fulfilled' ? r.value : null);

    checkinData = cd || {};
    phoneResistData = pr || { totalCount: 0, records: {} };
    // 处理新旧任务系统兼容性
    const rawTd = td || {};
    taskData = {
        longterm: Array.isArray(rawTd.longterm) ? rawTd.longterm : [],
        daily: rawTd.daily || {}
    };
    leaveData = ld || [];
    papersData = papers || [];
    submissionsData = subs || [];
    userProfile = prof || { nickname: '', avatarBase64: '' };

    updateLastSavedValues();
    updateHeaderProfileUI();

    const today = getTodayString();
    if (!checkinData[today]) {
        checkinData[today] = { duration: 0, phases: [], mood: '' };
    }
    if (!checkinData[today].mood) checkinData[today].mood = '';
    initNavigation();

    // 恢复计时器状态 (统一从 localStorage/服务器同步)
    const lastDate = localStorage.getItem(getUserKey('last_date'));
    if (lastDate && lastDate !== today) {
        // 任务滚动逻辑：将昨天的未完成任务移动到今天
        if (taskData.daily[lastDate]) {
            if (!taskData.daily[today]) taskData.daily[today] = [];
            taskData.daily[lastDate].forEach(t => {
                if (!t.completed) {
                    const exists = taskData.daily[today].some(curr => curr.name === t.name);
                    if (!exists) {
                        taskData.daily[today].unshift({
                            ...t,
                            id: Date.now() + Math.random(),
                            createTime: t.createTime || (Date.parse(lastDate) || Date.now()),
                            rolledFrom: lastDate
                        });
                    }
                }
            });
        }
        // 跨天重置本地计时器状态
        localStorage.removeItem(getUserKey('active_start'));
        localStorage.setItem(getUserKey('accumulated_base'), '0');
    }
    localStorage.setItem(getUserKey('last_date'), today);

    const localAcc = parseInt(localStorage.getItem(getUserKey('accumulated_base')) || '0');
    const serverAcc = checkinData[today]?.duration || 0;
    const serverRunningSince = checkinData[today]?.timerRunningSince;
    let activeStart = localStorage.getItem(getUserKey('active_start'));

    // 快捷指令与网页的同步核心：如果服务器有正在运行的标记，强制覆盖本地
    if (serverRunningSince) {
        if (!activeStart || serverRunningSince > parseInt(activeStart)) {
            activeStart = serverRunningSince.toString();
            localStorage.setItem(getUserKey('active_start'), activeStart);
            localStorage.setItem(getUserKey('last_date'), today);
        }
    } else if (serverRunningSince === null && activeStart) {
        localStorage.removeItem(getUserKey('active_start'));
        activeStart = null;
    }

    // 计时器安全审计
    if (activeStart) {
        const startTs = parseInt(activeStart);
        const isOverLimit = (Date.now() - startTs) > 12 * 3600 * 1000;
        const isOldDate = formatDateLocal(new Date(startTs)) !== today;
        if (isOverLimit || isOldDate) {
            localStorage.removeItem(getUserKey('active_start'));
            activeStart = null;
        }
    }

    let localTotal = localAcc;
    if (activeStart) {
        localTotal += Math.floor((Date.now() - parseInt(activeStart)) / 1000);
    }

    if (serverAcc > localTotal) {
        accumulatedSeconds = serverAcc;
        if (activeStart) {
            localStorage.setItem(getUserKey('active_start'), Date.now().toString());
        }
    } else {
        accumulatedSeconds = localAcc;
    }

    localStorage.setItem(getUserKey('accumulated_base'), accumulatedSeconds.toString());

    // 触发各模块初始化
    initFocusTimer();
    renderSessionTimeline();
    initHabitCheckin();
    initPhoneResist();
    initTaskManagement();
    initHeatmap();
    initStatistics();
    initLeaveManagement();
    initPapersManagement();
    initSubmissionsManagement();
    initLogsManagement();
    initMoodCheckin();
    updateTodayStatus();
}

// 核心保存逻辑
async function doSaveData() {
    const today = getTodayString();
    const liveDur = getLiveDuration();
    if (checkinData[today]) {
        checkinData[today].duration = liveDur;
    }

    const isOptOut = localStorage.getItem(getUserKey('opt_out')) === 'true';

    const payloadList = [
        { key: 'checkin', path: '/data/checkin', data: checkinData },
        { key: 'phoneResist', path: '/data/phoneResist', data: phoneResistData },
        { key: 'task', path: '/data/task', data: taskData },
        { key: 'leave', path: '/data/leave', data: leaveData },
        { key: 'achievements', path: '/data/achievements', data: achievements },
        { key: 'papers', path: '/data/papers', data: papersData },
        { key: 'submissions', path: '/data/submissions', data: submissionsData },
        { key: 'profile', path: '/data/profile', data: userProfile },
        {
            key: 'leaderboard', path: '/leaderboard/update', data: {
                date: today,
                duration: liveDur,
                optOut: isOptOut,
                nickname: userProfile?.nickname,
                avatar: userProfile?.avatarBase64
            }
        }
    ];

    const promises = [];
    for (const item of payloadList) {
        if (checkChanged(item.key, item.data)) {
            promises.push(apiCall(item.path, 'POST', item.data).catch(err => {
                console.error('Save failed for', item.key, err);
                delete _lastSavedValues[item.key];
                throw err;
            }));
        }
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}

// 带防抖的保存接口
async function saveData(immediate = false) {
    if (immediate) {
        if (_saveTimeout) { clearTimeout(_saveTimeout); _saveTimeout = null; }
        return await doSaveData();
    }
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(async () => {
        _saveTimeout = null;
        await doSaveData();
    }, 2000);
}
