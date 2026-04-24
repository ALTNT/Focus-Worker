/**
 * PHDShed - Daily Check-in & Habit Tracking Module
 */

// --- 每日必打卡 ---
function initHabitCheckin() {
    const today = getTodayString();
    if (!checkinData[today].habits) {
        checkinData[today].habits = [];
    }

    document.querySelectorAll('.habit-checkbox').forEach(cb => {
        const habitId = cb.getAttribute('data-habit');

        // 设置初始状态
        cb.checked = (checkinData[today].habits || []).includes(habitId);

        // 绑定事件
        cb.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            if (isChecked) {
                if (!checkinData[today].habits.includes(habitId)) {
                    checkinData[today].habits.push(habitId);
                }
            } else {
                checkinData[today].habits = checkinData[today].habits.filter(h => h !== habitId);
            }
            saveData();
        });
    });
}

// --- 每日心情打卡 ---
function initMoodCheckin() {
    const container = document.getElementById('mood-options-container');
    const display = document.getElementById('current-mood-display');
    if (!container) return;

    const moods = [
        { text: '糟糕的一天', icon: '😫', color: 'bg-[#F2D1D1]', textCol: 'text-[#C07F6E]' },
        { text: '忙碌的一天', icon: '🐝', color: 'bg-[#FEEAD1]', textCol: 'text-[#D5A46C]' },
        { text: '开心的一天', icon: '🌈', color: 'bg-[#FFF9D1]', textCol: 'text-[#C5B75E]' },
        { text: '平静的一天', icon: '🍃', color: 'bg-[#D1E9F2]', textCol: 'text-[#6E9DB1]' },
        { text: '努力的一天', icon: '🎯', color: 'bg-[#D1F2D1]', textCol: 'text-[#6E9B6E]' },
        { text: '摸鱼的一天', icon: '🎣', color: 'bg-[#E5E7EB]', textCol: 'text-[#6B7280]' },
        { text: '幸运的一天', icon: '🍀', color: 'bg-[#E9D1F2]', textCol: 'text-[#9B6EAB]' }
    ];

    function renderMoodUI() {
        const today = getTodayString();
        const currentMood = checkinData[today]?.mood || '';

        container.innerHTML = moods.map(m => `
            <button onclick="selectMood('${m.text}')" 
                class="p-4 rounded-2xl ${m.color} ${m.textCol} font-bold border-2 transition-all text-sm flex flex-col items-center gap-2 shadow-sm
                ${currentMood === m.text ? 'border-primary ring-4 ring-primary/10 scale-105' : 'border-transparent hover:border-white hover:scale-105'}">
                <span class="text-3xl">${m.icon}</span>
                <span>${m.text}</span>
            </button>
        `).join('');

        if (currentMood) {
            display.innerHTML = `<span class="text-primary">✨</span> 今日心情记录为：<span class="text-primary font-black">${currentMood}</span>`;
        } else {
            display.textContent = '今日心情：还没记录哦';
        }

        updateMonthlyMoodStats();
    }

    window.selectMood = (mood) => {
        const today = getTodayString();
        checkinData[today].mood = mood;
        saveData();
        renderMoodUI();
    };

    renderMoodUI();
}

// 初始化手机克制功能
function initPhoneResist() {
    const btn = document.getElementById('add-phone-resist');
    if (btn) {
        btn.onclick = () => {
            const today = getTodayString();
            if (!phoneResistData.records) phoneResistData.records = {};
            if (!phoneResistData.records[today]) phoneResistData.records[today] = { count: 0, times: [] };

            phoneResistData.totalCount++;
            phoneResistData.records[today].count++;
            phoneResistData.records[today].times.push(getCurrentTimeString());

            updatePhoneResistUI();
            saveData();
            updateTodayStatus();
            // checkAchievements();
        };
    }
    updatePhoneResistUI();
}

function updatePhoneResistUI() {
    const today = getTodayString();
    const todayCount = phoneResistData.records[today]?.count || 0;
    const totalCount = phoneResistData.totalCount || 0;
    const times = phoneResistData.records[today]?.times || [];

    if (document.getElementById('phone-resist-count')) document.getElementById('phone-resist-count').textContent = totalCount;
    if (document.getElementById('today-phone-resist-count')) document.getElementById('today-phone-resist-count').textContent = todayCount;

    const timesEl = document.getElementById('today-phone-resist-times');
    if (timesEl) {
        timesEl.innerHTML = times.length ? times.map(t => `<span class="inline-block bg-warning/10 text-warning px-2 py-0.5 rounded text-[10px] mr-1 mb-1">${t}</span>`).join('') : '暂无记录';
    }
}
