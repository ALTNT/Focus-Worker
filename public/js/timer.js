/**
 * PHDShed - Focus Timer and Session Timeline Module
 */

// --- 今日专注时间轴 ---
function renderSessionTimeline() {
    const wrap = document.getElementById('session-timeline-wrap');
    const bar = document.getElementById('session-timeline-bar');
    const labels = document.getElementById('session-timeline-labels');
    if (!wrap || !bar || !labels) return;

    const today = getTodayString();
    const todaySessions = checkinData[today]?.sessions || [];

    // 如果没有任何 session，隐藏时间轴
    if (todaySessions.length === 0) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';

    // 时间轴范围：06:00 ~ 24:00 = 18小时 = 64800秒
    const timelineStartHour = 6;
    const timelineEndHour = 24;
    const totalMinutes = (timelineEndHour - timelineStartHour) * 60;

    const tsToMinutesFromStart = (ts) => {
        const d = new Date(ts);
        const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
        return minutesSinceMidnight - timelineStartHour * 60;
    };

    // 自动清理多端同步或断网造成的脏数据（截断未闭合的历史 session）
    const sanitizedSessions = [...todaySessions]
        .sort((a, b) => a.start - b.start) // 确保按时间顺序排列
        .map((session, idx, arr) => {
            let effectiveEnd = session.end;
            // 如果当前 session 标记为进行中，但这已经不是最后一次开启的 session，将其强制闭合到下一次 start
            if (!effectiveEnd && idx < arr.length - 1) {
                effectiveEnd = Math.max(session.start, arr[idx + 1].start);
            }
            // 如果是最后一次，但本地明确没在跑，将其闭合 (不显示进行中)
            if (!effectiveEnd && idx === arr.length - 1 && !isTimerRunning) {
                effectiveEnd = session.start;
            }
            return { ...session, end: effectiveEnd };
        }).filter(s => {
            // 剔除无效的 0 秒幽灵记录
            if (s.end && (s.end - s.start < 1000)) return false;
            return true;
        });

    // 渲染时间段块
    bar.innerHTML = '';
    sanitizedSessions.forEach((session) => {
        const startMin = Math.max(0, tsToMinutesFromStart(session.start));
        const endMin = session.end
            ? Math.min(totalMinutes, tsToMinutesFromStart(session.end))
            : Math.min(totalMinutes, tsToMinutesFromStart(Date.now())); // 正在进行中：延伸到现在

        if (endMin <= startMin) return;

        const leftPct = (startMin / totalMinutes) * 100;
        const widthPct = ((endMin - startMin) / totalMinutes) * 100;

        const block = document.createElement('div');
        block.style.cssText = `position:absolute; left:${leftPct}%; width:${widthPct}%; height:100%; background: var(--color-primary, #8EAA90); opacity: ${session.end ? '0.75' : '1'}; border-radius: 4px;`;
        if (!session.end) {
            block.style.animation = 'pulse 2s ease-in-out infinite';
        }
        bar.appendChild(block);
    });

    // 渲染时间段标签
    labels.innerHTML = '';
    sanitizedSessions.forEach((session) => {
        const startMin = Math.max(0, tsToMinutesFromStart(session.start));
        const endMin = session.end
            ? Math.min(totalMinutes, tsToMinutesFromStart(session.end))
            : Math.min(totalMinutes, tsToMinutesFromStart(Date.now()));

        if (endMin <= startMin) return;

        const fmt = (ts) => {
            const d = new Date(ts);
            return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        };
        const startLabel = fmt(session.start);
        const endLabel = session.end ? fmt(session.end) : '进行中';
        const pill = document.createElement('span');
        pill.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${session.end ? 'bg-secondary/40 text-text/50' : 'bg-primary/10 text-primary border border-primary/20'}`;
        pill.textContent = `${startLabel} – ${endLabel}`;
        labels.appendChild(pill);
    });
}

// --- 专注于研习：计时器系统 ---
function initFocusTimer() {
    const display = document.getElementById('timer-display');
    const startBtn = document.getElementById('timer-start-btn');
    const pauseBtn = document.getElementById('timer-pause-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    if (!display || !startBtn) return;

    // 监听其他标签页的存储变化
    window.addEventListener('storage', (e) => {
        const activeStartKey = getUserKey('active_start');
        const accBaseKey = getUserKey('accumulated_base');

        if (e.key === activeStartKey || e.key === accBaseKey) {
            refreshTimerState();
        }

        // 全局数据静默同步：任何一个标签页更新了数据，其他标签页自动刷新 UI
        if (e.key === getUserKey('last_date')) {
            // 如果日期变了，所有标签页联动
            window.location.reload();
        }
    });

    // 核心保存逻辑相关的内部同步函数
    window.syncRemoteStop = function(day, remoteDuration, remoteSessions) {
        isTimerRunning = false;
        if (timerInterval) clearInterval(timerInterval);
        localStorage.removeItem(getUserKey('active_start'));

        // 绝对信任并使用服务器算好的准确时长
        accumulatedSeconds = remoteDuration || 0;
        localStorage.setItem(getUserKey('accumulated_base'), accumulatedSeconds.toString());

        if (!checkinData[day]) checkinData[day] = { duration: 0 };
        checkinData[day].timerRunningSince = null;
        checkinData[day].duration = accumulatedSeconds;
        if (remoteSessions) checkinData[day].sessions = remoteSessions;

        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
        updateTimerUI(accumulatedSeconds);
        renderSessionTimeline();
    };

    window.syncRemoteStart = function(day, remoteRunningSince, remoteDuration, remoteSessions) {
        if (remoteRunningSince == null) return; // 安全守卫

        // 接管云端算好的底座时间
        accumulatedSeconds = remoteDuration || 0;
        localStorage.setItem(getUserKey('accumulated_base'), accumulatedSeconds.toString());

        // 接管云端正在跑的时间点
        localStorage.setItem(getUserKey('active_start'), remoteRunningSince.toString());
        localStorage.setItem(getUserKey('last_date'), day);

        if (!checkinData[day]) checkinData[day] = { duration: 0 };
        checkinData[day].timerRunningSince = remoteRunningSince;
        checkinData[day].duration = accumulatedSeconds;
        if (remoteSessions) checkinData[day].sessions = remoteSessions;

        refreshTimerState(); // 重建本地时间神级循环
        renderSessionTimeline();
    };

    window.refreshTimerState = function() {
        const activeStart = localStorage.getItem(getUserKey('active_start'));
        const base = parseInt(localStorage.getItem(getUserKey('accumulated_base')) || '0');

        accumulatedSeconds = base;
        clearInterval(timerInterval);

        if (activeStart) {
            isTimerRunning = true;
            timerStartTime = parseInt(activeStart);
            if (startBtn) startBtn.classList.add('hidden');
            if (pauseBtn) pauseBtn.classList.remove('hidden');

            timerInterval = setInterval(() => {
                const now = Date.now();
                const activeElapsed = Math.floor((now - timerStartTime) / 1000);
                const total = accumulatedSeconds + activeElapsed;

                // 1. 12小时安全上限检查
                if (activeElapsed > 12 * 3600) {
                    if (pauseBtn) pauseBtn.click();
                    alert('专注时长已达 12 小时上限，系统已自动停止计时。请注意休息！');
                    return;
                }

                // 2. 跨天自动重置检查
                const currentDay = getTodayString();
                if (currentDay !== localStorage.getItem(getUserKey('last_date'))) {
                    if (pauseBtn) pauseBtn.click();
                    alert('检测到日期变更，已为您保存昨日数据并开启新的一天。');
                    window.location.reload();
                    return;
                }

                syncCounter++;
                // 3. 探活与备份逻辑解耦互斥
                if (syncCounter >= 180) {
                    syncCounter = 0;
                    // 每 3 分钟，全量保存前务必先进行一次安全安检，防止瞎覆盖
                    apiCall('/data/checkin').then(res => {
                        let safelyStopped = false;
                        if (res && res[currentDay]) {
                            if (res[currentDay].timerRunningSince === null && isTimerRunning) {
                                console.log('Safe-Save check: Detected external shortcut stop.');
                                syncRemoteStop(currentDay, res[currentDay].duration, res[currentDay].sessions);
                                safelyStopped = true;
                            }
                        }
                        // 如果发现没被手机关停，才敢安心地把电脑的数据上传同步过去
                        if (!safelyStopped) {
                            saveData();
                        }
                    });
                }
                updateTimerUI(total);
            }, 1000);
        } else {
            isTimerRunning = false;
            timerStartTime = null;
            if (startBtn) startBtn.classList.remove('hidden');
            if (pauseBtn) pauseBtn.classList.add('hidden');
            updateTimerUI(accumulatedSeconds);
        }
    };

    function updateTimerUI(totalSecs) {
        const formatted = formatTimerSeconds(totalSecs);
        if (display) display.textContent = formatted;

        const sidebarFocus = document.getElementById('today-focus-duration');
        if (sidebarFocus) sidebarFocus.textContent = formatted;

        const topFocus = document.getElementById('top-today-focus');
        if (topFocus) topFocus.textContent = formatted;
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            lastLocalActionTime = Date.now(); // 开启15秒免死金牌冷却期
            const nowTs = Date.now();
            localStorage.setItem(getUserKey('last_date'), getTodayString());
            localStorage.setItem(getUserKey('active_start'), nowTs.toString());
            localStorage.setItem(getUserKey('accumulated_base'), accumulatedSeconds.toString());

            const today = getTodayString();
            if (!checkinData[today]) checkinData[today] = { duration: 0 };
            checkinData[today].timerRunningSince = nowTs;

            // 记录本次专注 session 的开始时间
            if (!checkinData[today].sessions) checkinData[today].sessions = [];
            checkinData[today].sessions.push({ start: nowTs, end: null });

            refreshTimerState();
            renderSessionTimeline();
            saveData(true); // <--- 重要：告诉服务器计时开始，使用 true 确保立刻写入不可丢失
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            lastLocalActionTime = Date.now(); // 开启15秒免死金牌冷却期
            const now = Date.now();
            if (timerStartTime) {
                let sessionSeconds = Math.floor((now - timerStartTime) / 1000);

                // 物理上限过滤：单次任务严禁超过 12 小时写入
                if (sessionSeconds > 12 * 3600) {
                    sessionSeconds = 12 * 3600;
                }

                accumulatedSeconds += sessionSeconds;
            }

            localStorage.removeItem(getUserKey('active_start'));
            localStorage.setItem(getUserKey('accumulated_base'), accumulatedSeconds.toString());

            const today = getTodayString();
            if (checkinData[today]) {
                checkinData[today].timerRunningSince = null;
                // 填写最后一个 session 的结束时间
                if (checkinData[today].sessions && checkinData[today].sessions.length > 0) {
                    const lastSession = checkinData[today].sessions[checkinData[today].sessions.length - 1];
                    if (lastSession.end === null) lastSession.end = now;
                }
            }

            refreshTimerState();
            renderSessionTimeline();
            saveData(true); // 暂停即持久化到服务器，使用 true 确保立刻写入不可丢失
        });
    }

    // 监听文档可见性，实现刚用完快捷指令切回电脑时立马同步接管（双向侦测）
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (Date.now() - lastLocalActionTime < 15000) return; // 冷却安检：如果你刚刚才在本地点了按钮，忽略这波神仙同步
            const today = getTodayString();
            apiCall('/data/checkin').then(res => {
                if (res && res[today]) {
                    const remoteRunningSince = res[today].timerRunningSince;
                    const remoteDuration = res[today].duration || 0;

                    if (remoteRunningSince == null && isTimerRunning) {
                        console.log('Visibility check: Detected external shortcut stop.');
                        syncRemoteStop(today, remoteDuration, res[today].sessions);
                    } else if (remoteRunningSince != null && !isTimerRunning) {
                        console.log('Visibility check: Detected external shortcut start.');
                        syncRemoteStart(today, remoteRunningSince, remoteDuration, res[today].sessions);
                    }
                }
            });
        }
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置今日专注时长吗？此操作不可撤销。')) {
                lastLocalActionTime = Date.now(); // 防止重置后被远程探活意外恢复
                accumulatedSeconds = 0;
                localStorage.removeItem(getUserKey('active_start'));
                localStorage.setItem(getUserKey('accumulated_base'), '0');

                const today = getTodayString();
                if (checkinData[today]) {
                    checkinData[today].timerRunningSince = null;
                    checkinData[today].duration = 0;
                }

                refreshTimerState();
                saveData();
            }
        });
    }

    // 初始化三段式打卡
    ['morning', 'afternoon', 'evening'].forEach(id => {
        const btn = document.getElementById(`phase-${id}-btn`);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const today = getTodayString();
            if (!checkinData[today].phases) checkinData[today].phases = [];
            if (checkinData[today].phases.includes(id)) {
                checkinData[today].phases = checkinData[today].phases.filter(p => p !== id);
            } else {
                checkinData[today].phases.push(id);
            }
            updatePhaseUI();
            saveData();
        });
    });
    updatePhaseUI();

    // 初始化全局静默感应（对称接管生死状态）
    if (window.globalSyncInterval) clearInterval(window.globalSyncInterval);
    window.globalSyncInterval = setInterval(() => {
        if (Date.now() - lastLocalActionTime < 15000) return; // 冷却安检：如果你刚刚才在本地点了按钮，15秒内全盘屏蔽 CDN 旧缓存骚扰
        const today = getTodayString();
        apiCall('/data/checkin').then(res => {
            if (res && res[today]) {
                const remoteRunningSince = res[today].timerRunningSince;
                const remoteDuration = res[today].duration || 0;

                if (remoteRunningSince == null && isTimerRunning) {
                    console.log('Global Sync: Detected external shortcut stop.');
                    syncRemoteStop(today, remoteDuration, res[today].sessions);
                } else if (remoteRunningSince != null && !isTimerRunning) {
                    console.log('Global Sync: Detected external shortcut start.');
                    syncRemoteStart(today, remoteRunningSince, remoteDuration, res[today].sessions);
                }
            }
        });
    }, 10000); // 10秒级高频心跳探测跨端信号

    // 初始化界面
    refreshTimerState();
}

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = formatTimerSeconds(accumulatedSeconds);
}

function updatePhaseUI() {
    const today = getTodayString();
    const phases = checkinData[today]?.phases || [];
    ['morning', 'afternoon', 'evening'].forEach(id => {
        const btn = document.getElementById(`phase-${id}-btn`);
        if (!btn) return;
        if (phases.includes(id)) {
            btn.className = 'text-xs bg-success/20 text-success border border-success/30 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all';
            btn.innerHTML = '<i class="fa fa-check"></i> 已完成';
        } else {
            btn.className = 'text-xs bg-secondary/30 text-text/50 font-bold px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer border border-transparent';
            btn.innerHTML = '<i class="fa fa-thumb-tack"></i> 打卡';
        }
    });
}
