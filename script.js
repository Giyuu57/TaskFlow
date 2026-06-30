let appData = {
    tasks: {},
    customTasks: {},
    importantDates: [],
    notes: {},
    reminders: {},
    mood: {},
    goals: [],
    habits: [],
    deletedDefaults: {},
    darkMode: false
};

const defaultTasks = [
    'Wake up at 6 AM',
    'Exercise',
    'Pray',
    'Study college',
    'Written work',
    'Read book',
    'Gym',
    'Proper diet',
    'Study',
    'Work'
];

const defaultAppData = {
    tasks: {},
    customTasks: {},
    importantDates: [],
    notes: {},
    reminders: {},
    mood: {},
    goals: [],
    habits: [],
    deletedDefaults: {},
    darkMode: false
};

let currentMonth = new Date();
let selectedDate = null;
let currentView = 'calendar';
let saveTimeout = null;
let authLoading = false;

// ---------- AUTH ----------
function normalizeAppData(data = {}) {
    return {
        ...defaultAppData,
        ...data,
        tasks: data.tasks || {},
        customTasks: data.customTasks || {},
        importantDates: Array.isArray(data.importantDates) ? data.importantDates : [],
        notes: data.notes || {},
        reminders: data.reminders || {},
        mood: data.mood || {},
        goals: Array.isArray(data.goals) ? data.goals : [],
        habits: Array.isArray(data.habits) ? data.habits : [],
        deletedDefaults: data.deletedDefaults || {},
        darkMode: Boolean(data.darkMode)
    };
}

async function checkAuth() {
    try {
        const res = await fetch('/api/me', {
            credentials: 'include',
            cache: 'no-store'
        });

        if (res.ok) {
            const user = await res.json();
            document.getElementById('user-email').textContent = user.email;

            // Open app first so page does not stay stuck on login screen
            showApp();

            // Then load saved data
            await loadDataFromServer();
        } else {
            showAuth();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-root').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-root').classList.remove('hidden');

    try {
        renderCalendar();
        updateStats();
    } catch (err) {
        console.error('App render error:', err);
    }
}

function toggleAuthForm(form) {
    document.getElementById('login-form').classList.toggle('hidden', form !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', form !== 'signup');
    clearAuthError();
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function clearAuthError() {
    const el = document.getElementById('auth-error');
    el.textContent = '';
    el.classList.add('hidden');
}

async function handleSignup() {
    if (authLoading) return;
    authLoading = true;
    clearAuthError();

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        authLoading = false;
        return showAuthError('Email and password are required');
    }

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error || 'Signup failed');
            return;
        }

        document.getElementById('user-email').textContent = data.email;

        // Important fix
        showApp();

        await loadDataFromServer();
    } catch (err) {
        console.error('Signup error:', err);
        showAuthError('Network error. Try again.');
    } finally {
        authLoading = false;
    }
}

async function handleLogin() {
    if (authLoading) return;
    authLoading = true;
    clearAuthError();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        authLoading = false;
        return showAuthError('Email and password are required');
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error || 'Login failed');
            return;
        }

        document.getElementById('user-email').textContent = data.email;

        // Important fix: open app immediately after login success
        showApp();

        // Load saved user data after app opens
        await loadDataFromServer();
    } catch (err) {
        console.error('Login error:', err);
        showAuthError('Network error. Try again.');
    } finally {
        authLoading = false;
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store'
        });
    } catch (err) {
        console.error('Logout error:', err);
    }

    location.reload();
}

async function loadDataFromServer() {
    try {
        const res = await fetch('/api/data', {
            credentials: 'include',
            cache: 'no-store'
        });

        if (!res.ok) {
            console.warn('Data load failed:', res.status);
            return;
        }

        const data = await res.json();
        appData = normalizeAppData(data);

        if (appData.darkMode) {
            document.body.classList.add('dark');
            document.body.classList.remove('light');
            document.getElementById('theme-icon').textContent = '☀️';
        } else {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
            document.getElementById('theme-icon').textContent = '🌙';
        }

        renderCalendar();
        updateStats();

        if (currentView === 'tracker') {
            renderTracker();
        }

        if (currentView === 'day' && selectedDate) {
            renderDayView();
        }
    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

function saveData() {
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        try {
            await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify(appData)
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    }, 500);
}

// ---------- DATE / PROGRESS HELPERS ----------
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getProgress(dateStr) {
    const dateTasks = appData.tasks[dateStr] || {};
    const deletedDefaults = appData.deletedDefaults[dateStr] || [];
    const activeDefaultIndices = defaultTasks
        .map((_, i) => i)
        .filter(i => !deletedDefaults.includes(i));

    const completedDefault = activeDefaultIndices.filter(i => dateTasks[i]).length;
    const customTasks = appData.customTasks[dateStr] || [];
    const completedCustom = customTasks.filter(t => t.completed).length;

    return {
        completed: completedDefault + completedCustom,
        total: activeDefaultIndices.length + customTasks.length
    };
}

function getStreak() {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);

        const dateStr = formatDate(checkDate);
        const progress = getProgress(dateStr);

        if (progress.completed === progress.total && progress.total > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    return streak;
}

// ---------- CALENDAR ----------
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('month-year').textContent =
        currentMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        if (appData.importantDates.includes(dateStr)) {
            dayCell.classList.add('important');
        }

        const progress = getProgress(dateStr);
        const progressPercent = progress.total > 0
            ? (progress.completed / progress.total) * 100
            : 0;

        dayCell.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="display: flex; justify-content: space-between;">
                    <span class="day-number">${day}</span>
                    <div class="day-icons">
                        ${appData.importantDates.includes(dateStr) ? '<span style="font-size: 0.75rem;">⭐</span>' : ''}
                        ${appData.reminders[dateStr] ? '<span style="font-size: 0.75rem;">🔔</span>' : ''}
                    </div>
                </div>
                ${appData.mood[dateStr] ? `<div style="margin-top: 0.25rem;">${appData.mood[dateStr] === 'happy' ? '😊' : appData.mood[dateStr] === 'neutral' ? '😐' : '☹️'}</div>` : ''}
                ${progress.total > 0 ? `
                    <div style="margin-top: auto;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; opacity: 0.7;">${progress.completed}/${progress.total}</div>
                    </div>
                ` : ''}
            </div>
        `;

        dayCell.onclick = () => openDay(dateStr);
        grid.appendChild(dayCell);
    }
}

function changeMonth(delta) {
    currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + delta,
        1
    );

    renderCalendar();
}

function openDay(dateStr) {
    selectedDate = dateStr;
    showView('day');
    renderDayView();
}

// ---------- DAY VIEW ----------
function renderDayView() {
    const date = new Date(selectedDate + 'T00:00:00');

    document.getElementById('selected-date-title').textContent =
        date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

    const starBtn = document.getElementById('star-btn');
    starBtn.textContent = appData.importantDates.includes(selectedDate) ? '⭐' : '☆';

    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => btn.classList.remove('active'));

    if (appData.mood[selectedDate]) {
        const activeMood = document.querySelector(`.mood-btn.${appData.mood[selectedDate]}`);
        if (activeMood) activeMood.classList.add('active');
    }

    const container = document.getElementById('tasks-container');
    container.innerHTML = '';

    const deletedDefaults = appData.deletedDefaults[selectedDate] || [];

    defaultTasks.forEach((task, idx) => {
        if (deletedDefaults.includes(idx)) return;

        const completed = appData.tasks[selectedDate]?.[idx] || false;
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${completed ? 'completed' : ''}`;

        taskDiv.innerHTML = `
            <span style="font-size: 1.5rem; cursor: pointer;" onclick="toggleTask(${idx})">${completed ? '✅' : '⬜'}</span>
            <span style="flex: 1; ${completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${task}</span>
            <button class="icon-btn" onclick="deleteDefaultTask(${idx})" title="Remove from today">🗑️</button>
        `;

        container.appendChild(taskDiv);
    });

    const customTasks = appData.customTasks[selectedDate] || [];

    customTasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;

        taskDiv.innerHTML = `
            <span style="font-size: 1.5rem; cursor: pointer;" onclick="toggleCustomTask(${task.id})">${task.completed ? '✅' : '⬜'}</span>
            <span style="flex: 1; ${task.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${task.text}</span>
            <button class="icon-btn" onclick="deleteCustomTask(${task.id})">🗑️</button>
        `;

        container.appendChild(taskDiv);
    });

    if (deletedDefaults.length > 0) {
        const resetDiv = document.createElement('div');
        resetDiv.style.cssText = 'text-align: center; margin-top: 0.5rem;';
        resetDiv.innerHTML = `
            <button class="btn btn-nav" style="font-size: 0.8rem; opacity: 0.7;" onclick="restoreDefaultsForDay()">
                ↺ Restore default tasks for this day
            </button>
        `;
        container.appendChild(resetDiv);
    }

    const progress = getProgress(selectedDate);
    const progressPercent = progress.total > 0
        ? (progress.completed / progress.total) * 100
        : 0;

    document.getElementById('progress-text').textContent =
        `${progress.completed}/${progress.total} tasks`;

    document.getElementById('progress-fill').style.width =
        `${progressPercent}%`;

    document.getElementById('notes-textarea').value =
        appData.notes[selectedDate] || '';

    document.getElementById('reminder-input').value =
        appData.reminders[selectedDate] || '';
}

function toggleTask(idx) {
    if (!appData.tasks[selectedDate]) appData.tasks[selectedDate] = {};
    appData.tasks[selectedDate][idx] = !appData.tasks[selectedDate][idx];

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function deleteDefaultTask(idx) {
    if (!appData.deletedDefaults[selectedDate]) {
        appData.deletedDefaults[selectedDate] = [];
    }

    if (!appData.deletedDefaults[selectedDate].includes(idx)) {
        appData.deletedDefaults[selectedDate].push(idx);
    }

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function restoreDefaultsForDay() {
    delete appData.deletedDefaults[selectedDate];

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function clearAllDefaultsForDay() {
    appData.deletedDefaults[selectedDate] = defaultTasks.map((_, i) => i);

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function toggleCustomTask(id) {
    const tasks = appData.customTasks[selectedDate] || [];
    const task = tasks.find(t => t.id === id);

    if (task) task.completed = !task.completed;

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function deleteCustomTask(id) {
    appData.customTasks[selectedDate] =
        (appData.customTasks[selectedDate] || []).filter(t => t.id !== id);

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function addCustomTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();

    if (text) {
        if (!appData.customTasks[selectedDate]) {
            appData.customTasks[selectedDate] = [];
        }

        appData.customTasks[selectedDate].push({
            id: Date.now(),
            text,
            completed: false
        });

        input.value = '';

        saveData();
        renderDayView();
        renderCalendar();
        updateStats();
    }
}

function toggleImportant() {
    const idx = appData.importantDates.indexOf(selectedDate);

    if (idx > -1) {
        appData.importantDates.splice(idx, 1);
    } else {
        appData.importantDates.push(selectedDate);
    }

    saveData();
    renderDayView();
    renderCalendar();
    updateStats();
}

function setMood(moodType) {
    appData.mood[selectedDate] = moodType;

    saveData();
    renderDayView();
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
    const notesTextarea = document.getElementById('notes-textarea');
    const reminderInput = document.getElementById('reminder-input');

    if (notesTextarea) {
        notesTextarea.addEventListener('blur', (e) => {
            if (selectedDate) {
                appData.notes[selectedDate] = e.target.value;
                saveData();
            }
        });
    }

    if (reminderInput) {
        reminderInput.addEventListener('blur', (e) => {
            if (selectedDate) {
                appData.reminders[selectedDate] = e.target.value;
                saveData();
                renderCalendar();
            }
        });
    }
});

// ---------- VIEW SWITCHING ----------
function showView(view) {
    currentView = view;

    document.getElementById('calendar-view').classList.add('hidden');
    document.getElementById('day-view').classList.add('hidden');
    document.getElementById('tracker-view').classList.add('hidden');

    document.getElementById(`${view}-view`).classList.remove('hidden');

    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.classList.remove('active');
    });

    if (view === 'calendar') {
        const navButtons = document.querySelectorAll('.btn-nav');
        if (navButtons[0]) navButtons[0].classList.add('active');
        renderCalendar();
    } else if (view === 'tracker') {
        const navButtons = document.querySelectorAll('.btn-nav');
        if (navButtons[1]) navButtons[1].classList.add('active');
        renderTracker();
    }
}

function toggleDarkMode() {
    appData.darkMode = !appData.darkMode;

    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');

    document.getElementById('theme-icon').textContent =
        appData.darkMode ? '☀️' : '🌙';

    saveData();
}

function toggleStats() {
    const panel = document.getElementById('stats-panel');
    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        updateStats();
    }
}

function updateStats() {
    document.getElementById('stat-days').textContent =
        Object.keys(appData.tasks).length;

    document.getElementById('stat-important').textContent =
        appData.importantDates.length;

    document.getElementById('stat-goals').textContent =
        appData.goals.length;

    document.getElementById('stat-streak').textContent =
        getStreak();
}

// ---------- TRACKER ----------
function renderTracker() {
    const streak = getStreak();
    document.getElementById('streak-value').textContent = streak;

    let totalCompleted = 0;

    Object.values(appData.tasks).forEach(dateTasks => {
        totalCompleted += Object.values(dateTasks).filter(Boolean).length;
    });

    Object.values(appData.customTasks).forEach(tasks => {
        totalCompleted += tasks.filter(t => t.completed).length;
    });

    document.getElementById('total-tasks').textContent = totalCompleted;

    const completedGoals = appData.goals.filter(g => g.completed).length;
    document.getElementById('goals-progress').textContent =
        `${completedGoals}/${appData.goals.length}`;

    const quotes = [
        "The only way to do great work is to love what you do.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Believe you can and you're halfway there.",
        "Don't watch the clock; do what it does. Keep going.",
        "The future depends on what you do today.",
        "Start where you are. Use what you have. Do what you can.",
        "It always seems impossible until it's done.",
        "The secret of getting ahead is getting started."
    ];

    const quote = quotes[new Date().getDate() % quotes.length];

    document.getElementById('motivational-quote').innerHTML =
        `<div style="font-size: 2rem; margin-bottom: 1rem;">📈</div>"${quote}"`;

    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dateStr = formatDate(date);
        const progress = getProgress(dateStr);

        const percent = progress.total > 0
            ? (progress.completed / progress.total) * 100
            : 0;

        const barDiv = document.createElement('div');
        barDiv.className = 'chart-bar';

        barDiv.innerHTML = `
            <div class="bar-bg" style="width: 100%; height: 150px; border-radius: 0.5rem 0.5rem 0 0; position: relative; overflow: hidden;">
                <div class="bar" style="position: absolute; bottom: 0; width: 100%; height: ${percent}%;"></div>
            </div>
            <span style="font-size: 0.875rem; font-weight: 600;">
                ${date.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
        `;

        chartContainer.appendChild(barDiv);
    }

    const moodStats = {};

    Object.values(appData.mood).forEach(m => {
        moodStats[m] = (moodStats[m] || 0) + 1;
    });

    const moodContainer = document.getElementById('mood-overview');

    if (Object.keys(moodStats).length > 0) {
        moodContainer.innerHTML = `
            <h3 class="section-title">Mood Overview</h3>
            <div style="display: flex; gap: 2rem; justify-content: center;">
                ${moodStats.happy ? `<div style="text-align: center;"><div style="font-size: 3rem;">😊</div><div style="font-size: 1.5rem; font-weight: bold;">${moodStats.happy}</div><div style="opacity: 0.7;">Happy Days</div></div>` : ''}
                ${moodStats.neutral ? `<div style="text-align: center;"><div style="font-size: 3rem;">😐</div><div style="font-size: 1.5rem; font-weight: bold;">${moodStats.neutral}</div><div style="opacity: 0.7;">Neutral Days</div></div>` : ''}
                ${moodStats.sad ? `<div style="text-align: center;"><div style="font-size: 3rem;">☹️</div><div style="font-size: 1.5rem; font-weight: bold;">${moodStats.sad}</div><div style="opacity: 0.7;">Sad Days</div></div>` : ''}
            </div>
        `;
    } else {
        moodContainer.innerHTML = '';
    }

    renderGoals();
    renderHabits();
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';

    appData.goals.forEach(goal => {
        const goalDiv = document.createElement('div');
        goalDiv.className = `task-item ${goal.completed ? 'completed' : ''}`;

        goalDiv.innerHTML = `
            <span style="font-size: 1.5rem; cursor: pointer;" onclick="toggleGoal(${goal.id})">${goal.completed ? '✅' : '⬜'}</span>
            <span style="flex: 1; ${goal.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${goal.text}</span>
            <button class="icon-btn" onclick="deleteGoal(${goal.id})">🗑️</button>
        `;

        container.appendChild(goalDiv);
    });
}

function addGoal() {
    const input = document.getElementById('new-goal-input');
    const text = input.value.trim();

    if (text) {
        appData.goals.push({
            id: Date.now(),
            text,
            completed: false
        });

        input.value = '';

        saveData();
        renderTracker();
        updateStats();
    }
}

function toggleGoal(id) {
    const goal = appData.goals.find(g => g.id === id);

    if (goal) goal.completed = !goal.completed;

    saveData();
    renderTracker();
    updateStats();
}

function deleteGoal(id) {
    appData.goals = appData.goals.filter(g => g.id !== id);

    saveData();
    renderTracker();
    updateStats();
}

function renderHabits() {
    const container = document.getElementById('habits-container');
    container.innerHTML = '';

    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(formatDate(date));
    }

    appData.habits.forEach(habit => {
        const habitDiv = document.createElement('div');
        habitDiv.className = 'habit-tracker';

        let daysHtml = '';

        last7Days.forEach(dateStr => {
            const completed = habit.days[dateStr] || false;
            const day = new Date(dateStr + 'T00:00:00').getDate();

            daysHtml += `
                <div class="habit-day ${completed ? 'completed' : ''}" onclick="toggleHabitDay(${habit.id}, '${dateStr}')">
                    ${day}
                </div>
            `;
        });

        habitDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">${habit.name}</span>
                <button class="icon-btn" onclick="deleteHabit(${habit.id})">🗑️</button>
            </div>
            <div class="habit-days">${daysHtml}</div>
        `;

        container.appendChild(habitDiv);
    });
}

function addHabit() {
    const input = document.getElementById('new-habit-input');
    const name = input.value.trim();

    if (name) {
        appData.habits.push({
            id: Date.now(),
            name,
            days: {}
        });

        input.value = '';

        saveData();
        renderTracker();
    }
}

function toggleHabitDay(habitId, dateStr) {
    const habit = appData.habits.find(h => h.id === habitId);

    if (habit) {
        habit.days[dateStr] = !habit.days[dateStr];

        saveData();
        renderTracker();
    }
}

function deleteHabit(id) {
    appData.habits = appData.habits.filter(h => h.id !== id);

    saveData();
    renderTracker();
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `taskflow-backup-${formatDate(new Date())}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                appData = normalizeAppData({
                    ...appData,
                    ...imported
                });

                saveData();
                renderCalendar();
                updateStats();

                if (currentView === 'tracker') {
                    renderTracker();
                }

                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };

        reader.readAsText(file);
    }
}

checkAuth();