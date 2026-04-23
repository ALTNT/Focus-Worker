/**
 * PHDShed - Statistics and Visualization Module
 */

function initHeatmap() {
    const container = document.getElementById('research-heatmap');
    const titleEl = document.getElementById('heatmap-month-title');
    const displayMonth = document.getElementById('custom-month-display');
    if (!container) return;

    const year = currentStatsMonth.getFullYear();
    const month = currentStatsMonth.getMonth(); // 0-11

    // 更新 UI 标识
    if (titleEl) titleEl.textContent = `${year}年${month + 1}月`;
    if (displayMonth) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        displayMonth.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1).getDay(); // 当月第一天是星期几 (0是周日)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 计算需要的空白前缀 (将周一作为一周的第一天)
    const emptyDays = firstDay === 0 ? 6 : firstDay - 1;

    let html = '';
    // 添加星期栏
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    weekdays.forEach(day => {
        html += `<div class="text-center text-[10px] font-bold text-text/70 mb-2 uppercase tracking-widest">${day}</div>`;
    });

    // 空白占位格 (来自上个月)
    for (let i = 0; i < emptyDays; i++) {
        html += `<div class="aspect-square rounded-2xl bg-transparent"></div>`;
    }

    let monthTotalSeconds = 0;
    let monthStudyDays = 0;

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayData = checkinData[dateStr] || { duration: 0 };
        const hours = (dayData.duration || 0) / 3600;

        if (hours > 0) {
            monthTotalSeconds += dayData.duration;
            monthStudyDays++;
        }

        const isActive = dateStr === (viewingDate || getTodayString());

        // 采用行内样式以绕过 Tailwind CDN 的类名扫描限制，确保颜色 100% 显示
        const colors = [
            { bg: '#F2EFE9', text: 'rgba(46, 58, 63, 0.6)', border: '1px solid rgba(233, 226, 216, 0.5)' }, // 0h
            { bg: '#DCE7D3', text: 'rgba(46, 58, 63, 0.8)', border: 'none' }, // >0h
            { bg: '#B7C9B5', text: 'rgba(46, 58, 63, 0.8)', border: 'none' }, // >2h
            { bg: '#9ABF9A', text: '#ffffff', border: 'none' }, // >5h
            { bg: '#6B8E6B', text: '#ffffff', border: 'none' }  // >8h
        ];
        let level = 0;
        if (hours > 0) level = 1;
        if (hours > 2) level = 2;
        if (hours > 5) level = 3;
        if (hours > 8) level = 4;

        const style = colors[level];
        const activeClass = isActive ? 'ring-2 ring-primary ring-offset-2 scale-105 z-10' : '';

        html += `<div onclick="changeViewingDate('${dateStr}')" 
            style="background-color: ${style.bg}; color: ${style.text}; border: ${style.border};"
            class="aspect-square flex flex-col items-center justify-center rounded-2xl ${activeClass} cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all">
            <span class="font-bold text-sm">${i}</span>
            <span class="text-[9px] font-medium opacity-80">${hours.toFixed(1)}h</span>
        </div>`;
    }
    container.innerHTML = html;

    // 更新卡片底部的统计信息
    const footerEl = document.getElementById('heatmap-footer');
    if (footerEl) {
        const totalHours = (monthTotalSeconds / 3600).toFixed(1);
        const avgHours = monthStudyDays > 0 ? (totalHours / monthStudyDays).toFixed(1) : '0.0';
        footerEl.textContent = `本月总专注: ${totalHours}h · 日均 ${avgHours}h`;
    }
}

function calculateStreak() {
    const targetYearMonth = `${currentStatsMonth.getFullYear()}-${String(currentStatsMonth.getMonth() + 1).padStart(2, '0')}`;
    const dates = Object.keys(checkinData)
        .filter(d => d.startsWith(targetYearMonth) && checkinData[d].duration > 0)
        .sort();

    if (dates.length === 0) return 0;
    let max = 0, curr = 1;
    for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i - 1]);
        const d2 = new Date(dates[i]);
        if ((d2 - d1) / (1000 * 3600 * 24) === 1) curr++;
        else { max = Math.max(max, curr); curr = 1; }
    }
    return Math.max(max, curr);
}

function updateMonthlyMoodStats() {
    const container = document.getElementById('monthly-mood-stats');
    if (!container) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentPrefix = `${year}-${month}`;

    const moodsCount = {};
    let total = 0;

    Object.entries(checkinData).forEach(([date, data]) => {
        if (date.startsWith(currentPrefix) && data.mood) {
            moodsCount[data.mood] = (moodsCount[data.mood] || 0) + 1;
            total++;
        }
    });

    if (total === 0) {
        container.innerHTML = '<div class="text-center text-text/30 text-xs py-4">本月暂无心情记录...</div>';
        return;
    }

    const moods = [
        { text: '糟糕的一天', color: '#F2D1D1', border: '#C07F6E' },
        { text: '忙碌的一天', color: '#FEEAD1', border: '#D5A46C' },
        { text: '开心的一天', color: '#FFF9D1', border: '#C5B75E' },
        { text: '平静的一天', color: '#D1E9F2', border: '#6E9DB1' },
        { text: '努力的一天', color: '#D1F2D1', border: '#6E9B6E' },
        { text: '摸鱼的一天', color: '#E5E7EB', border: '#6B7280' },
        { text: '幸运的一天', color: '#E9D1F2', border: '#9B6EAB' }
    ];

    container.innerHTML = moods.map(m => {
        const count = moodsCount[m.text] || 0;
        const percent = Math.round((count / total) * 100);
        if (count === 0) return '';
        return `
            <div class="flex items-center gap-4">
                <span class="text-xs font-bold text-text/60 w-24 shrink-0">${m.text}</span>
                <div class="flex-1 h-8 bg-white/50 rounded-full overflow-hidden border border-secondary/20 relative">
                    <div class="h-full transition-all duration-500 rounded-full" 
                         style="width: ${percent}%; background-color: ${m.color}; border: 1px solid ${m.border}"></div>
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-text/40">${percent}%</span>
                </div>
            </div>
        `;
    }).join('') || '<div class="text-center text-text/30 text-xs py-4">暂无数据</div>';
}

function initStatistics() {
    const trigger = document.getElementById('custom-month-trigger');
    const popover = document.getElementById('custom-month-popover');
    const popoverYear = document.getElementById('popover-year-display');
    const monthsGrid = document.getElementById('popover-months-grid');

    let popoverCurrentYear = currentStatsMonth.getFullYear();

    const renderPopoverMonths = () => {
        if (!popoverYear || !monthsGrid) return;
        popoverYear.textContent = popoverCurrentYear;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthsGrid.innerHTML = monthNames.map((m, idx) => {
            const isSelected = popoverCurrentYear === currentStatsMonth.getFullYear() && idx === currentStatsMonth.getMonth();
            const activeClass = isSelected ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary/30 text-text/80';
            return `<button class="p-2 rounded-xl text-xs font-bold transition-colors ${activeClass}" data-month="${idx}">${m}</button>`;
        }).join('');

        monthsGrid.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const m = parseInt(e.target.getAttribute('data-month'));
                currentStatsMonth = new Date(popoverCurrentYear, m, 1);
                popover.classList.add('hidden');
                refreshDashboard();
            });
        });
    };

    if (trigger && popover) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            popoverCurrentYear = currentStatsMonth.getFullYear();
            renderPopoverMonths();
            popover.classList.toggle('hidden');
        });

        document.getElementById('popover-prev-year')?.addEventListener('click', (e) => {
            e.stopPropagation();
            popoverCurrentYear--;
            renderPopoverMonths();
        });

        document.getElementById('popover-next-year')?.addEventListener('click', (e) => {
            e.stopPropagation();
            popoverCurrentYear++;
            renderPopoverMonths();
        });

        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !popover.contains(e.target)) {
                popover.classList.add('hidden');
            }
        });
    }

    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentStatsMonth = new Date(currentStatsMonth.getFullYear(), currentStatsMonth.getMonth() - 1, 1);
            refreshDashboard();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentStatsMonth = new Date(currentStatsMonth.getFullYear(), currentStatsMonth.getMonth() + 1, 1);
            refreshDashboard();
        });
    }

    refreshDashboard();
}

function refreshDashboard() {
    initHeatmap();
    updateSummaryStatistics();
    updateStatisticsCharts();
}

function updateStatisticsCharts() {
    const { startDate, endDate, labels } = getDateRange();
    const studyTrendData = prepareStudyDurationData(startDate, endDate, labels);
    const scheduleData = prepareScheduleConsistencyData();
    const phoneData = preparePhoneResistChartData(startDate, endDate, labels);
    const moodData = prepareMoodChartData(startDate, endDate);
    const habitData = prepareHabitChartData(startDate, endDate);

    updateStudyTrendChart(labels, studyTrendData);
    updateScheduleConsistencyChart(scheduleData);
    updatePhoneResistChart(labels, phoneData);
    updateMoodChart(moodData);
    updateHabitChart(habitData);
}

function getDateRange() {
    const year = currentStatsMonth.getFullYear();
    const month = currentStatsMonth.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const daysInMonth = endDate.getDate();

    let labels = [];
    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(`${month + 1}/${i}`);
    }
    return { startDate, endDate, labels };
}

function prepareStudyDurationData(startDate, endDate, labels) {
    const data = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const ds = formatDateLocal(curr);
        data.push(((checkinData[ds]?.duration || 0) / 3600).toFixed(1));
        curr.setDate(curr.getDate() + 1);
    }
    return data.slice(-labels.length);
}

function prepareScheduleConsistencyData() {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const days = [0, 0, 0, 0, 0, 0, 0];
    const targetYearMonth = `${currentStatsMonth.getFullYear()}-${String(currentStatsMonth.getMonth() + 1).padStart(2, '0')}`;

    Object.keys(checkinData).forEach(dateStr => {
        if (!dateStr.startsWith(targetYearMonth)) return;

        const day = new Date(dateStr).getDay();
        const index = day === 0 ? 6 : day - 1;

        const phases = checkinData[dateStr].phases || [];
        counts[index] += phases.length;
        days[index]++;
    });

    return counts.map((count, i) => days[i] > 0 ? (count / days[i]).toFixed(1) : 0);
}

function updateStudyTrendChart(labels, data) {
    const ctx = document.getElementById('checkin-rate-chart');
    if (!ctx) return;
    if (window.studyTrendChart) window.studyTrendChart.destroy();
    window.studyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '专注时长 (h)',
                data: data,
                borderColor: '#B7C9B5',
                backgroundColor: 'rgba(183, 201, 181, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#B7C9B5',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#F2EFE9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateScheduleConsistencyChart(data) {
    const ctx = document.getElementById('checkin-period-chart');
    if (!ctx) return;
    if (window.scheduleChart) window.scheduleChart.destroy();
    window.scheduleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            datasets: [{
                label: '三段完成度',
                data: data,
                backgroundColor: '#D4E0D2',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 3, grid: { color: '#F2EFE9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateSummaryStatistics() {
    const targetYearMonth = `${currentStatsMonth.getFullYear()}-${String(currentStatsMonth.getMonth() + 1).padStart(2, '0')}`;

    const monthData = Object.entries(checkinData)
        .filter(([dateStr]) => dateStr.startsWith(targetYearMonth))
        .map(([_, data]) => data);

    const totalHours = monthData.reduce((sum, d) => sum + (d.duration || 0), 0) / 3600;
    const studyDays = monthData.filter(d => d.duration > 0).length;

    if (document.getElementById('total-checkin-days')) document.getElementById('total-checkin-days').textContent = studyDays;
    if (document.getElementById('total-task-hours')) document.getElementById('total-task-hours').textContent = totalHours.toFixed(1);
    if (document.getElementById('avg-daily-hours')) document.getElementById('avg-daily-hours').textContent = studyDays > 0 ? (totalHours / studyDays).toFixed(1) : '0.0';
    if (document.getElementById('max-streak-days')) document.getElementById('max-streak-days').textContent = calculateStreak();
}

function preparePhoneResistChartData(startDate, endDate, labels) {
    const data = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const ds = formatDateLocal(curr);
        data.push(phoneResistData.records?.[ds]?.count || 0);
        curr.setDate(curr.getDate() + 1);
    }
    return data.slice(-labels.length);
}

function updatePhoneResistChart(labels, data) {
    const ctx = document.getElementById('phone-resist-chart');
    if (!ctx) return;
    if (window.phoneResistChart) window.phoneResistChart.destroy();
    window.phoneResistChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '克制次数',
                data: data,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#F2EFE9' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function prepareMoodChartData(startDate, endDate) {
    const moodCounts = {};
    const moods = ['糟糕的一天', '忙碌的一天', '开心的一天', '平静的一天', '努力的一天', '摸鱼的一天', '幸运的一天'];
    moods.forEach(m => moodCounts[m] = 0);

    let curr = new Date(startDate);
    while (curr <= endDate) {
        const ds = formatDateLocal(curr);
        const m = checkinData[ds]?.mood;
        if (m && moodCounts.hasOwnProperty(m)) {
            moodCounts[m]++;
        }
        curr.setDate(curr.getDate() + 1);
    }
    return {
        labels: moods,
        data: moods.map(m => moodCounts[m])
    };
}

function updateMoodChart(moodData) {
    const ctx = document.getElementById('mood-distribution-chart');
    if (!ctx) return;
    if (window.moodChart) window.moodChart.destroy();

    const colors = ['#E9E2D8', '#B7C9B5', '#D4E0D2', '#F2EFE9', '#9BB796', '#C9DAC4', '#D8CFC4'];

    window.moodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: moodData.labels,
            datasets: [{
                data: moodData.data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 10 }, padding: 15 }
                }
            },
            cutout: '70%'
        }
    });
}

function prepareHabitChartData(startDate, endDate) {
    const counts = { reading: 0, vocab: 0, paper: 0, exercise: 0 };
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const ds = formatDateLocal(curr);
        const habits = checkinData[ds]?.habits || [];
        habits.forEach(h => { if (counts[h] !== undefined) counts[h]++ });
        curr.setDate(curr.getDate() + 1);
    }
    return {
        labels: ['读书', '单词', '文献', '运动'],
        data: [counts.reading, counts.vocab, counts.paper, counts.exercise]
    };
}

function updateHabitChart(habitData) {
    const ctx = document.getElementById('habit-radar-chart');
    if (!ctx) return;
    if (window.habitChart) window.habitChart.destroy();

    window.habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: habitData.labels,
            datasets: [{
                label: '完成次数',
                data: habitData.data,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, display: false },
                    grid: { color: '#F2EFE9' },
                    angleLines: { color: '#E9E2D8' },
                    pointLabels: { font: { size: 12, weight: 'bold' }, color: '#9BB796' }
                }
            }
        }
    });
}
