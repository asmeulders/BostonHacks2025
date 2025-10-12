// Study Session JavaScript functionality

class StudySessionManager {
  constructor() {
    this.currentSession = null;
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = 0;
    this.sessionType = 'pomodoro';
    this.sessionCount = 0;
    this.settings = {
      pomodoro: 25 * 60, // 25 minutes
      shortBreak: 5 * 60, // 5 minutes
      longBreak: 15 * 60, // 15 minutes
      longBreakInterval: 4, // Every 4 pomodoros
      autoStartBreaks: false,
      notifications: true,
      dailyGoal: 4 // sessions per day
    };
    
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      await this.loadSessionData();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to initialize study session manager:', error);
      PopupUtils.showError('Failed to initialize. Please refresh the page.');
    }
  }

  async loadSettings() {
    try {
      const data = await PopupUtils.getStorage(['sessionSettings']);
      if (data.sessionSettings) {
        this.settings = { ...this.settings, ...data.sessionSettings };
      }
    } catch (error) {
      PopupUtils.logError('Failed to load session settings:', error);
    }
  }

  async saveSettings() {
    try {
      await PopupUtils.setStorage({ sessionSettings: this.settings });
    } catch (error) {
      PopupUtils.logError('Failed to save session settings:', error);
      throw error;
    }
  }

  async loadSessionData() {
    try {
      const data = await PopupUtils.getStorage(['currentSession']);
      
      if (data.currentSession) {
        this.currentSession = data.currentSession;
        this.sessionType = this.currentSession.type;
        this.timeRemaining = this.currentSession.timeRemaining;
        this.sessionCount = this.currentSession.sessionCount || 0;
      }
    } catch (error) {
      PopupUtils.logError('Failed to load session data:', error);
    }
  }

  async saveSessionData() {
    try {
      await PopupUtils.setStorage({
        currentSession: this.currentSession
      });
    } catch (error) {
      PopupUtils.logError('Failed to save session data:', error);
    }
  }

  setupEventListeners() {
    // Session type selection
    const sessionTypes = document.querySelectorAll('.session-type-card');
    sessionTypes.forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        this.selectSessionType(type);
      });
    });

    // Timer controls
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    const stopBtn = document.getElementById('stopTimer');
    const resetBtn = document.getElementById('resetTimer');//timer sliders
    const workSlider = document.getElementById("workRange");
    const workTime = document.getElementById("work-time");
    const restSlider = document.getElementById("restRange");
    const restTime = document.getElementById("rest-time");

    workTime.innerHTML = workSlider.value;
    restTime.innerHTML = restSlider.value;

    // const { activeSession } = await chrome.storage.local.get('activeSession');
    //let active = activeSession ?? false; // fallback if undefined

    //sessionButton.textContent = active ? "End Work" : "Start Work";

    if (startBtn) startBtn.addEventListener('click', () => this.startTimer());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseTimer());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stopTimer());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());
    if (workSlider) workSlider.addEventListener('input', (event) => {workTime.innerHTML = event.target.value;});
    if (restSlider) restSlider.addEventListener('input', (event) => {restTime.innerHTML = event.target.value;});

    // Custom time inputs
    const timeInputs = document.querySelectorAll('.time-input');
    timeInputs.forEach(input => {
      input.addEventListener('change', () => this.updateCustomTime());
    });

    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-button');
    presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        const duration = parseInt(button.dataset.duration) * 60;
        this.setCustomDuration(duration);
      });
    });

    // Settings toggles
    const autoStartToggle = document.getElementById('autoStartBreaks');
    const notificationsToggle = document.getElementById('notifications');
    
    if (autoStartToggle) {
      autoStartToggle.addEventListener('change', (e) => {
        this.settings.autoStartBreaks = e.target.checked;
        this.saveSettings();
      });
    }
    
    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', (e) => {
        this.settings.notifications = e.target.checked;
        this.saveSettings();
      });
    }

    // Daily goal input
    const goalInput = document.getElementById('dailyGoal');
    if (goalInput) {
      goalInput.addEventListener('change', (e) => {
        const goal = parseInt(e.target.value);
        if (goal > 0) {
          this.settings.dailyGoal = goal;
          this.saveSettings();
          this.updateDailyGoal();
        }
      });
    }
  }

  updateUI() {
    this.updateTimerDisplay();
    this.updateSessionControls();
  }

  updateTimerDisplay() {
    const timeDisplay = document.getElementById('timerTime');
    const labelDisplay = document.getElementById('timerLabel');
    const sessionInfo = document.getElementById('sessionInfo');

    if (timeDisplay) {
      timeDisplay.textContent = PopupUtils.formatTime(this.timeRemaining);
    }

    if (labelDisplay) {
      const labels = {
        pomodoro: '🍅 Focus Time',
        shortBreak: '☕ Short Break',
        longBreak: '🌴 Long Break',
        custom: '⚡ Custom Session'
      };
      labelDisplay.textContent = labels[this.sessionType] || 'Study Session';
    }

    if (sessionInfo) {
      sessionInfo.innerHTML = `
        <span class="session-counter">
          <span>Session ${this.sessionCount + 1}</span>
        </span>
        <span class="session-counter">
          <span>Today: ${this.getTodaySessionCount()}</span>
        </span>
      `;
    }

    // Update progress ring if present
    this.updateProgressRing();
  }
  updateProgressRing() {
    const progressRing = document.querySelector('.progress-ring-progress');
    const progressText = document.querySelector('.progress-ring-text');
    
    if (!progressRing || !progressText) return;

    const totalTime = this.getSessionDuration(this.sessionType);
    const elapsed = totalTime - this.timeRemaining;
    const percentage = totalTime > 0 ? (elapsed / totalTime) * 100 : 0;
    
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset = offset;
    
    progressText.textContent = `${Math.round(percentage)}%`;
  }

  updateControls() {
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    const stopBtn = document.getElementById('stopTimer');
    const resetBtn = document.getElementById('resetTimer');

    if (startBtn) {
      startBtn.disabled = this.isRunning && !this.isPaused;
      startBtn.textContent = this.isPaused ? '▶️ Resume' : '▶️ Start';
    }

    if (pauseBtn) {
      pauseBtn.disabled = !this.isRunning || this.isPaused;
    }

    if (stopBtn) {
      stopBtn.disabled = !this.isRunning && !this.isPaused;
    }

    if (resetBtn) {
      resetBtn.disabled = this.isRunning;
    }

    // Update timer display class
    const timerDisplay = document.querySelector('.timer-display');
    if (timerDisplay) {
      timerDisplay.classList.toggle('active', this.isRunning && !this.isPaused);
    }
  }

  updateSessionTypeCards() {
    const cards = document.querySelectorAll('.session-type-card');
    cards.forEach(card => {
      const type = card.dataset.type;
      card.classList.toggle('active', type === this.sessionType);
      
      const duration = card.querySelector('.session-type-duration');
      if (duration && type !== 'custom') {
        duration.textContent = PopupUtils.formatDuration(this.getSessionDuration(type) / 60);
      }
    });
  }

  updateSettings() {
    const autoStartToggle = document.getElementById('autoStartBreaks');
    const notificationsToggle = document.getElementById('notifications');
    const goalInput = document.getElementById('dailyGoal');

    if (autoStartToggle) {
      autoStartToggle.checked = this.settings.autoStartBreaks;
    }

    if (notificationsToggle) {
      notificationsToggle.checked = this.settings.notifications;
    }

    if (goalInput) {
      goalInput.value = this.settings.dailyGoal;
    }
  }

  updateProgress() {
    this.updateDailyGoal();
    this.updateRecentSessions();
    this.updateStatistics();
  }

  updateDailyGoal() {
    const goalElement = document.getElementById('dailyGoalProgress');
    if (!goalElement) return;

    const todayCount = this.getTodaySessionCount();
    const goal = this.settings.dailyGoal;
    const percentage = Math.min((todayCount / goal) * 100, 100);

    goalElement.innerHTML = `
      <div class="goal-header">
        <span class="goal-title">Daily Goal</span>
        <span class="goal-percentage">${Math.round(percentage)}%</span>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="goal-time-info">
        <span>${todayCount} of ${goal} sessions</span>
        <span>${Math.max(0, goal - todayCount)} remaining</span>
      </div>
    `;
  }

  updateRecentSessions() {
    const sessionsList = document.getElementById('recentSessions');
    if (!sessionsList) return;

    const recentSessions = this.sessionHistory.slice(-5).reverse();

    if (recentSessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="no-sessions">
          <span>📋</span>
          <p>No sessions completed yet</p>
        </div>
      `;
      return;
    }

    const sessionsHTML = recentSessions.map(session => `
      <div class="session-item">
        <div class="session-info">
          <div class="session-type-badge">${this.getSessionTypeLabel(session.type)}</div>
          <div class="session-duration">${PopupUtils.formatTime(session.duration)}</div>
        </div>
        <div class="session-time">
          ${PopupUtils.formatDateTime(new Date(session.endTime))}
        </div>
      </div>
    `).join('');

    sessionsList.innerHTML = sessionsHTML;
  }

  updateStatistics() {
    const statsContainer = document.getElementById('progressStats');
    if (!statsContainer) return;

    const today = new Date().toDateString();
    const todaySessions = this.sessionHistory.filter(session => 
      new Date(session.endTime).toDateString() === today
    );

    const totalTime = todaySessions.reduce((sum, session) => sum + session.duration, 0);
    const avgSession = todaySessions.length > 0 ? totalTime / todaySessions.length : 0;

    statsContainer.innerHTML = `
      <div class="progress-stat">
        <span class="progress-stat-number">${todaySessions.length}</span>
        <span class="progress-stat-label">Sessions</span>
      </div>
      <div class="progress-stat">
        <span class="progress-stat-number">${Math.floor(totalTime / 60)}</span>
        <span class="progress-stat-label">Minutes</span>
      </div>
      <div class="progress-stat">
        <span class="progress-stat-number">${Math.floor(avgSession / 60)}</span>
        <span class="progress-stat-label">Avg/Session</span>
      </div>
    `;
  }

  selectSessionType(type) {
    if (this.isRunning) {
      PopupUtils.showWarning('Stop current session before changing type');
      return;
    }

    this.sessionType = type;
    this.timeRemaining = this.getSessionDuration(type);
    this.updateUI();
    
    // Save current selection
    this.saveSessionData();
  }

  getSessionDuration(type) {
    switch (type) {
      case 'pomodoro': return this.settings.pomodoro;
      case 'shortBreak': return this.settings.shortBreak;
      case 'longBreak': return this.settings.longBreak;
      case 'custom': return this.getCustomDuration();
      default: return this.settings.pomodoro;
    }
  }

  getCustomDuration() {
    const hours = parseInt(document.getElementById('customHours')?.value || 0);
    const minutes = parseInt(document.getElementById('customMinutes')?.value || 25);
    const seconds = parseInt(document.getElementById('customSeconds')?.value || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  setCustomDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const hoursInput = document.getElementById('customHours');
    const minutesInput = document.getElementById('customMinutes');
    const secondsInput = document.getElementById('customSeconds');

    if (hoursInput) hoursInput.value = hours;
    if (minutesInput) minutesInput.value = minutes;
    if (secondsInput) secondsInput.value = secs;

    if (this.sessionType === 'custom') {
      this.timeRemaining = seconds;
      this.updateTimerDisplay();
    }
  }

  updateCustomTime() {
    if (this.sessionType === 'custom') {
      this.timeRemaining = this.getCustomDuration();
      this.updateTimerDisplay();
      this.saveSessionData();
    }
  }

  async startTimer() {
    if (this.isRunning && !this.isPaused) return;

    if (!this.isPaused) {
      // Starting new session
      this.currentSession = {
        type: this.sessionType,
        startTime: Date.now(),
        duration: this.getSessionDuration(this.sessionType),
        timeRemaining: this.timeRemaining,
        sessionCount: this.sessionCount
      };
    }

    this.isRunning = true;
    this.isPaused = false;

    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.currentSession.timeRemaining = this.timeRemaining;
      
      this.updateTimerDisplay();
      this.saveSessionData();

      if (this.timeRemaining <= 0) {
        this.completeSession();
      }
    }, 1000);

    this.updateControls();
    
    // Notify background script
    await PopupUtils.sendMessage({
      type: 'SESSION_STARTED',
      sessionType: this.sessionType,
      duration: this.getSessionDuration(this.sessionType)
    });

    PopupUtils.showSuccess('Timer started');
  }

  pauseTimer() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    clearInterval(this.timer);
    this.timer = null;

    this.updateControls();
    this.saveSessionData();

    PopupUtils.showInfo('Timer paused');
  }

  async stopTimer() {
    if (!this.isRunning && !this.isPaused) return;

    const wasRunning = this.isRunning;
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Record partial session if it was running
    if (wasRunning && this.currentSession) {
      const elapsed = this.currentSession.duration - this.timeRemaining;
      if (elapsed > 30) { // Only record if more than 30 seconds
        this.recordSession(this.currentSession.type, elapsed, false);
      }
    }

    this.currentSession = null;
    this.timeRemaining = this.getSessionDuration(this.sessionType);

    this.updateUI();
    this.saveSessionData();

    // Notify background script
    await PopupUtils.sendMessage({
      type: 'SESSION_STOPPED'
    });

    PopupUtils.showInfo('Timer stopped');
  }

  resetTimer() {
    if (this.isRunning) return;

    this.timeRemaining = this.getSessionDuration(this.sessionType);
    this.currentSession = null;
    
    this.updateTimerDisplay();
    this.saveSessionData();

    PopupUtils.showInfo('Timer reset');
  }

  async completeSession() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const sessionType = this.currentSession.type;
    const duration = this.currentSession.duration;

    // Record completed session
    this.recordSession(sessionType, duration, true);

    // Update session count for pomodoros
    if (sessionType === 'pomodoro') {
      this.sessionCount++;
    }

    // Show notification
    if (this.settings.notifications) {
      const message = this.getSessionCompleteMessage(sessionType);
      PopupUtils.showNotification('Session Complete!', message);
    }

    // Auto-start next session if enabled
    if (this.settings.autoStartBreaks && sessionType === 'pomodoro') {
      const nextType = this.getNextSessionType();
      this.selectSessionType(nextType);
      setTimeout(() => this.startTimer(), 1000);
    } else {
      // Reset to next appropriate session type
      const nextType = this.getNextSessionType();
      this.selectSessionType(nextType);
    }

    this.currentSession = null;
    this.updateUI();
    this.saveSessionData();

    // Notify background script
    await PopupUtils.sendMessage({
      type: 'SESSION_COMPLETED',
      sessionType: sessionType,
      duration: duration
    });

    PopupUtils.showSuccess('Session completed! 🎉');
  }

  recordSession(type, duration, completed) {
    const session = {
      type: type,
      duration: duration,
      completed: completed,
      endTime: Date.now(),
      date: new Date().toDateString()
    };

    this.sessionHistory.push(session);
    
    // Keep only last 100 sessions
    if (this.sessionHistory.length > 100) {
      this.sessionHistory = this.sessionHistory.slice(-100);
    }
  }

  getNextSessionType() {
    if (this.sessionType !== 'pomodoro') {
      return 'pomodoro';
    }

    // After pomodoro, determine break type
    const pomodoroCount = this.sessionCount + 1;
    if (pomodoroCount % this.settings.longBreakInterval === 0) {
      return 'longBreak';
    } else {
      return 'shortBreak';
    }
  }

  getSessionCompleteMessage(type) {
    const messages = {
      pomodoro: 'Great work! Time for a break.',
      shortBreak: 'Break complete! Ready for another session?',
      longBreak: 'Long break finished! You\'re doing great!',
      custom: 'Custom session complete!'
    };
    return messages[type] || 'Session complete!';
  }

  getSessionTypeLabel(type) {
    const labels = {
      pomodoro: '🍅 Focus',
      shortBreak: '☕ Break',
      longBreak: '🌴 Long Break',
      custom: '⚡ Custom'
    };
    return labels[type] || type;
  }

  getTodaySessionCount() {
    const today = new Date().toDateString();
    return this.sessionHistory.filter(session => 
      session.date === today && session.completed && session.type === 'pomodoro'
    ).length;
  }

  // Export session data
  exportSessionData() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessionHistory: this.sessionHistory,
      settings: this.settings,
      totalSessions: this.sessionHistory.length
    };

    const filename = `study-sessions-${new Date().toISOString().split('T')[0]}.json`;
    PopupUtils.downloadJSON(exportData, filename);
    PopupUtils.showSuccess('Session data exported successfully');
  }
}

// Initialize study session manager when page loads
let studySessionManager;

document.addEventListener('DOMContentLoaded', () => {
  studySessionManager = new StudySessionManager();
  
  // Add export button listener if present
  const exportBtn = document.getElementById('exportSessions');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      studySessionManager.exportSessionData();
    });
  }
});

// Export for global access
window.studySessionManager = studySessionManager;

