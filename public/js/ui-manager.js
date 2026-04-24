/**
 * PHDShed - UI Management & Glue Logic
 */

// 更新当前日期时间
function updateDateTime() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' };
    const dtEl = document.getElementById('current-date-time');
    if (dtEl) dtEl.textContent = now.toLocaleDateString('zh-CN', options);
}

// 初始化导航切换
function initNavigation() {
    // 初始化隐身模式状态
    const isOptOut = localStorage.getItem(getUserKey('opt_out')) === 'true';
    if (typeof updateOptOutUI === 'function') {
        updateOptOutUI(isOptOut);
    }

    const toggleBtn = document.getElementById('toggle-optout-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentOptOut = localStorage.getItem(getUserKey('opt_out')) === 'true';
            const newOptOut = !currentOptOut;
            localStorage.setItem(getUserKey('opt_out'), newOptOut.toString());
            if (typeof updateOptOutUI === 'function') {
                updateOptOutUI(newOptOut);
            }
            saveData(true); // 立即同步到服务器应用隐身
        });
    }

    // 定义按钮及其对应的分节。如果多个section对应同一个按钮，可以将它们放在同一个数组中。
    const navMapping = [
        { btn: 'nav-checkin', sections: ['checkin-section'] },
        { btn: 'nav-phone', sections: ['phone-section'] },
        { btn: 'nav-leave', sections: ['leave-section'] },
        { btn: 'nav-stats', sections: ['stats-section'] },
        { btn: 'nav-papers', sections: ['papers-section', 'submissions-section'] },
        { btn: 'nav-leaderboard', sections: ['leaderboard-section'] }
    ];

    const allSections = ['checkin-section', 'phone-section', 'tasks-section', 'leave-section', 'stats-section', 'papers-section', 'submissions-section', 'leaderboard-section'];

    navMapping.forEach(item => {
        const btn = document.getElementById(item.btn);
        if (!btn) return;
        btn.addEventListener('click', function () {
            // 隐藏所有section
            allSections.forEach(sectionId => {
                const sec = document.getElementById(sectionId);
                if (sec) sec.classList.add('hidden');
            });

            // 显示该按钮对应的所有section
            item.sections.forEach(sectionId => {
                const targetSec = document.getElementById(sectionId);
                if (targetSec) targetSec.classList.remove('hidden');
            });

            // 更新导航按钮样式
            navMapping.forEach(otherItem => {
                const b = document.getElementById(otherItem.btn);
                if (!b) return;
                b.classList.remove('bg-primary', 'text-white', 'shadow-sm', 'shadow-primary/20');
                b.classList.add('text-text/70', 'hover:bg-secondary/30');
            });

            btn.classList.add('bg-primary', 'text-white', 'shadow-sm', 'shadow-primary/20');
            btn.classList.remove('text-text/70', 'hover:bg-secondary/30');

            if (item.btn === 'nav-stats' && typeof refreshDashboard === 'function') {
                refreshDashboard();
            } else if (item.btn === 'nav-leaderboard' && typeof fetchLeaderboard === 'function') {
                fetchLeaderboard();
            }
        });
    });
}
