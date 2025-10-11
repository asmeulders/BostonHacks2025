// Study Session JavaScript functionality - Simplified

class StudySessionManager {
  constructor() {
    this.currentSession = null;
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = 0;
    this.sessionType = 'pomodoro';
    this.settings = {
      pomodoro: 25 * 60, // 25 minutes
      shortBreak: 5 * 60, // 5 minutes
      longBreak: 15 * 60, // 15 minutes
      notifications: true
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
      console.error('Failed to initialize study session manager:', error);
    }
  }

  async loadSettings() {
    try {
      const data = await chrome.storage.local.get(['sessionSettings']);
      if (data.sessionSettings) {
        this.settings = { ...this.settings, ...data.sessionSettings };
      }
    } catch (error) {
      console.error('Failed to load session settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ sessionSettings: this.settings });
    } catch (error) {
      console.error('Failed to save session settings:', error);
      throw error;
    }
  }

  async loadSessionData() {
    try {
      const data = await chrome.storage.local.get(['currentSession']);
      
      if (data.currentSession) {
        this.currentSession = data.currentSession;
        this.sessionType = this.currentSession.type;
        this.timeRemaining = this.currentSession.timeRemaining;
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }

  async saveSessionData() {
    try {
      await chrome.storage.local.set({
        currentSession: this.currentSession
      });
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  setupEventListeners() {
    // Timer sliders
    const workSlider = document.getElementById('workRange');
    const workTime = document.getElementById('work-time');
    const restSlider = document.getElementById('restRange');
    const restTime = document.getElementById('rest-time');

    if (workSlider && workTime) {
      workTime.textContent = workSlider.value;
      workSlider.addEventListener('input', (event) => {
        workTime.textContent = event.target.value;
        this.settings.pomodoro = parseInt(event.target.value) * 60;
        this.saveSettings();
      });
    }

    if (restSlider && restTime) {
      restTime.textContent = restSlider.value;
      restSlider.addEventListener('input', (event) => {
        restTime.textContent = event.target.value;
        this.settings.shortBreak = parseInt(event.target.value) * 60;
        this.saveSettings();
      });
    }

    // Custom session start button
    const startCustomSessionBtn = document.getElementById('startCustomSession');
    if (startCustomSessionBtn) {
      startCustomSessionBtn.addEventListener('click', () => this.startCustomSession());
    }

    // Session controls
    const pauseSessionBtn = document.getElementById('pauseSession');
    const endSessionBtn = document.getElementById('endSession');
    
    if (pauseSessionBtn) {
      pauseSessionBtn.addEventListener('click', () => this.pauseSession());
    }
    
    if (endSessionBtn) {
      endSessionBtn.addEventListener('click', () => this.endSession());
    }

    // Session type selection (quick start cards)
    const sessionTypes = document.querySelectorAll('.session-type-card');
    sessionTypes.forEach(card => {
      card.addEventListener('click', () => {
        const duration = parseInt(card.dataset.duration);
        this.startQuickSession(duration);
      });
    });
  }

  updateUI() {
    this.updateTimerDisplay();
    this.updateSessionControls();
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const sessionTypeDisplay = document.getElementById('sessionType');
    const progressFill = document.getElementById('progressFill');

    if (timerDisplay) {
      const time = this.isRunning || this.isPaused ? this.timeRemaining : this.settings.pomodoro;
      timerDisplay.textContent = this.formatTime(time);
    }

    if (sessionTypeDisplay) {
      sessionTypeDisplay.textContent = this.getSessionTypeLabel(this.sessionType);
    }

    if (progressFill && this.currentSession) {
      const progress = ((this.currentSession.duration - this.timeRemaining) / this.currentSession.duration) * 100;
      progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  updateSessionControls() {
    const activeSection = document.getElementById('activeSessionSection');
    const starterSection = document.getElementById('sessionStarterSection');
    const pauseBtn = document.getElementById('pauseSession');

    if (this.isRunning || this.isPaused) {
      if (activeSection) activeSection.style.display = 'block';
      if (starterSection) starterSection.style.display = 'none';
      
      if (pauseBtn) {
        pauseBtn.innerHTML = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
      }
    } else {
      if (activeSection) activeSection.style.display = 'none';
      if (starterSection) starterSection.style.display = 'block';
    }
  }

  async startSession(type, duration) {
    if (this.isRunning) {
      return;
    }

    this.currentSession = {
      type: type,
      startTime: Date.now(),
      duration: duration,
      timeRemaining: duration
    };

    this.timeRemaining = duration;
    this.sessionType = type;
    this.isRunning = true;
    this.isPaused = false;

    await this.saveSessionData();
    this.startTimer();
    this.updateUI();

    // Notify background script
    try {
      await chrome.runtime.sendMessage({
        action: 'SESSION_STARTED',
        sessionType: type,
        duration: duration
      });
    } catch (error) {
      console.error('Failed to notify background script:', error);
    }
  }

  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.currentSession.timeRemaining = this.timeRemaining;
        this.updateTimerDisplay();
        this.saveSessionData();
      } else {
        this.completeSession();
      }
    }, 1000);
  }

  pauseTimer() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.isRunning = false;
      clearInterval(this.timer);
      this.updateSessionControls();
      this.saveSessionData();
    }
  }

  async stopTimer() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timer);
    this.currentSession = null;
    this.timeRemaining = 0;
    
    await this.saveSessionData();
    this.updateUI();

    // Notify background script
    try {
      await chrome.runtime.sendMessage({
        action: 'SESSION_ENDED'
      });
    } catch (error) {
      console.error('Failed to notify background script:', error);
    }
  }

  completeSession() {
    clearInterval(this.timer);
    this.isRunning = false;
    this.isPaused = false;

    // Show completion notification
    if (this.settings.notifications) {
      this.showNotification('Session Complete!', this.getSessionCompleteMessage(this.sessionType));
    }

    this.currentSession = null;
    this.updateUI();
    this.saveSessionData();
  }

  showNotification(title, message) {
    // Simple browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '../images/hello_extensions.png'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '../images/hello_extensions.png'
          });
        }
      });
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  getSessionCompleteMessage(type) {
    const messages = {
      pomodoro: 'Great work! Time for a break.',
      shortBreak: 'Break complete! Ready for another session?',
      longBreak: 'Long break finished! You\'re doing great!',
      custom: 'Custom session complete!'
    };
    return messages[type] || 'Session complete!';
  }

  // New methods for connecting timer functionality
  startCustomSession() {
    const workSlider = document.getElementById('workRange');
    const duration = workSlider ? parseInt(workSlider.value) * 60 : this.settings.pomodoro;
    this.startSession('custom', duration);
  }

  startQuickSession(durationMinutes) {
    const duration = durationMinutes * 60;
    this.startSession('pomodoro', duration);
  }

  pauseSession() {
    if (this.isRunning && !this.isPaused) {
      this.pauseTimer();
    } else if (this.isPaused) {
      this.resumeTimer();
    }
  }

  endSession() {
    if (this.isRunning || this.isPaused) {
      this.stopTimer();
    }
  }

  resumeTimer() {
    if (this.isPaused && this.currentSession) {
      this.isPaused = false;
      this.isRunning = true;
      this.startTimer();
      this.updateTimerDisplay();
      
      // Update pause button
      const pauseBtn = document.getElementById('pauseSession');
      if (pauseBtn) {
        pauseBtn.innerHTML = '⏸️ Pause';
      }
    }
  }
}

// Initialize study session manager when page loads
let studySessionManager;

document.addEventListener('DOMContentLoaded', () => {
  studySessionManager = new StudySessionManager();
});

// Export for global access
window.studySessionManager = studySessionManager;