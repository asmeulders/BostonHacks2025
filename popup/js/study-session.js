// Study Session JavaScript functionality — wall-clock based, survives popup close
// Now alternates Work ↔ Rest with random phase-complete messages
// Enforces a minimum work duration of 10 seconds

class StudySessionManager {
  constructor() {
    this.currentSession = null; // { type, startTime, endTime, duration, paused, pausedAt? }
    this.timer = null;          // UI repaint interval only
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = 0;     // seconds
    this.sessionType = 'pomodoro';

    // Work/Rest phase tracking
    this.phase = 'work'; // 'work' | 'rest'

    // Fun messages
    this.workCompleteMsgs = [
      "Great job! Time to recharge.",
      "Nice focus session—grab some water!",
      "You crushed it. Stretch time!",
      "Deep breath—enjoy a short break.",
    ];
    this.restCompleteMsgs = [
      "Break’s over—let’s dive back in!",
      "Refreshed? Back to it!",
      "You’ve got this—time to focus.",
      "Small steps, big wins—let’s go!",
    ];

    this.settings = {
      pomodoro: 25 * 60,  // work (seconds)
      shortBreak: 5 * 60, // rest (seconds)
      longBreak: 15 * 60, // unused for now
      notifications: true
    };

    // NEW: minimum work duration
    this.MIN_WORK_SECONDS = 10;

    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      await this.loadSessionData();   // reconstruct state from storage
      this.setupEventListeners();
      this.updateUI();

      // Keep UI in sync if another context changes currentSession
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.currentSession) {
          this.currentSession = changes.currentSession.newValue || null;
          this.refreshStateFromWallClock();
        }
        if (changes.phase) {
          this.phase = changes.phase.newValue || 'work';
          this.updateUI();
        }
      });
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
      const data = await chrome.storage.local.get(['currentSession', 'phase']);
      if (data.phase) this.phase = data.phase;

      if (data.currentSession) {
        this.currentSession = data.currentSession;
        this.sessionType = this.currentSession.type;
        // derive flags & remaining from wall clock
        this.refreshStateFromWallClock();
        if (this.currentSession) this.startUITimer();
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }

  async persistSession() {
    try {
      await chrome.storage.local.set({ currentSession: this.currentSession, phase: this.phase });
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
        this.settings.pomodoro = parseInt(event.target.value, 10) * 60;
        this.saveSettings();
      });
    }

    if (restSlider && restTime) {
      restTime.textContent = restSlider.value;
      restSlider.addEventListener('input', (event) => {
        restTime.textContent = event.target.value;
        this.settings.shortBreak = parseInt(event.target.value, 10) * 60;
        this.saveSettings();
      });
    }

    // Start button (HTML id is "startTimer")
    const startBtn = document.getElementById('startTimer');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startCustomSession());
    }

    // Session controls
    const pauseSessionBtn = document.getElementById('pauseSession');
    const endSessionBtn = document.getElementById('endSession');

    if (pauseSessionBtn) {
      pauseSessionBtn.addEventListener('click', () => this.togglePause());
    }
    if (endSessionBtn) {
      endSessionBtn.addEventListener('click', () => this.stopTimer());
    }
  }

  // --- Wall clock core -------------------------------------------------------

  refreshStateFromWallClock() {
    if (!this.currentSession) {
      this.isRunning = false;
      this.isPaused = false;
      this.timeRemaining = 0;
      this.updateUI();
      return;
    }

    const s = this.currentSession;
    this.sessionType = s.type;

    let remainingMs;
    if (s.paused) {
      // freeze remaining time at pause moment
      remainingMs = Math.max(0, s.endTime - (s.pausedAt || Date.now()));
      this.isPaused = true;
      this.isRunning = false;
    } else {
      remainingMs = Math.max(0, s.endTime - Date.now());
      this.isPaused = false;
      this.isRunning = remainingMs > 0;
    }

    this.timeRemaining = Math.ceil(remainingMs / 1000);

    if (this.timeRemaining <= 0) {
      this.completeSession(); // will chain to next phase
      return;
    }

    this.updateUI();
  }

  startUITimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.refreshStateFromWallClock();
    }, 1000);
  }

  // --- Session lifecycle -----------------------------------------------------

  async startSession(type, durationSeconds) {
    // Ensure minimum duration for work/custom timers
    if (type === 'pomodoro' || type === 'custom') {
      durationSeconds = Math.max(this.MIN_WORK_SECONDS, durationSeconds);
    }

    // type: 'pomodoro' (work) or 'shortBreak' (rest) or 'custom'
    const now = Date.now();
    const endTime = now + durationSeconds * 1000;

    this.currentSession = {
      type,
      startTime: now,
      endTime,              // wall-clock end
      duration: durationSeconds,
      paused: false
    };

    this.isRunning = true;
    this.isPaused = false;

    // Keep the overall study "active" across phases
    await chrome.storage.local.set({ activeSession: true });
    await this.persistSession();
    this.startUITimer();
    this.updateUI();

    // (Optional) notify background
    try {
      await chrome.runtime.sendMessage({
        action: 'SESSION_STARTED',
        sessionType: type,
        duration: durationSeconds
      });
    } catch (err) { /* no-op */ }
  }

  // helpers for durations & phases
  getWorkDuration() {
    // Enforce minimum on read as well
    return Math.max(this.MIN_WORK_SECONDS, this.settings.pomodoro);
  }
  getRestDuration() { return this.settings.shortBreak; }

  async startWork() {
    this.phase = 'work';
    await this.persistSession(); // writes phase
    await this.startSession('pomodoro', this.getWorkDuration());
  }

  async startRest() {
    this.phase = 'rest';
    await this.persistSession(); // writes phase
    await this.startSession('shortBreak', this.getRestDuration());
  }

  startCustomSession() {
    // start a Work phase based on the current slider, clamped to minimum
    const workSlider = document.getElementById('workRange');
    if (workSlider) {
      const minutes = parseInt(workSlider.value, 10);
      this.settings.pomodoro = Math.max(this.MIN_WORK_SECONDS, minutes * 60);
    } else {
      this.settings.pomodoro = Math.max(this.MIN_WORK_SECONDS, this.settings.pomodoro);
    }
    this.startWork();
  }

  async stopTimer() {
    // terminate the whole loop
    this.isRunning = false;
    this.isPaused = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.currentSession = null;
    this.timeRemaining = 0;

    await chrome.storage.local.set({ activeSession: false });
    await this.persistSession(); // writes null currentSession, keeps last phase value
    this.updateUI();

    try {
      await chrome.runtime.sendMessage({ action: 'SESSION_ENDED' });
    } catch (err) { /* no-op */ }
  }

  // When a single phase finishes → open new tab and auto-queue the next phase
  async completeSession() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;

    // Choose a message by phase
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let title, msg;
    if (this.phase === 'work') {
      title = 'Focus Session Complete!';
      msg = pick(this.workCompleteMsgs);
    } else {
      title = 'Rest Complete!';
      msg = pick(this.restCompleteMsgs);
    }

    // Open new tab instead of notification
    try {
      await chrome.runtime.sendMessage({
        action: 'OPEN_SESSION_COMPLETE_TAB',
        phase: this.phase,
        message: msg,
        title: title
      });
    } catch (err) {
      console.log('Could not open session complete tab:', err);
    }

    // Clear finished session but KEEP activeSession true (we're chaining)
    this.currentSession = null;
    await this.persistSession();
    this.updateUI();

    // Chain to next phase immediately
    if (this.phase === 'work') {
      await this.startRest();
    } else {
      await this.startWork();
    }
  }

  // --- Pause/Resume ----------------------------------------------------------

  async pauseTimer() {
    if (!this.currentSession || !this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.isRunning = false;
    this.currentSession.paused = true;
    this.currentSession.pausedAt = Date.now();
    await this.persistSession();
    this.updateSessionControls();
  }

  async resumeTimer() {
    if (!this.currentSession || this.isRunning || !this.isPaused) return;
    const delta = Date.now() - (this.currentSession.pausedAt || Date.now());
    this.currentSession.endTime += delta; // shift end time forward by pause duration
    this.currentSession.paused = false;
    delete this.currentSession.pausedAt;

    this.isPaused = false;
    this.isRunning = true;
    await this.persistSession();
    this.startUITimer();
    this.updateTimerDisplay();

    const pauseBtn = document.getElementById('pauseSession');
    if (pauseBtn) pauseBtn.innerHTML = '⏸️ Pause';
  }

  togglePause() {
    if (this.isRunning && !this.isPaused) this.pauseTimer();
    else if (this.isPaused) this.resumeTimer();
  }

  // --- UI helpers ------------------------------------------------------------

  updateUI() {
    this.updateTimerDisplay();
    this.updateSessionControls();
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const sessionTypeDisplay = document.getElementById('sessionType');
    const progressFill = document.getElementById('progressFill');

    if (timerDisplay) {
      const fallback = (this.phase === 'rest') ? this.getRestDuration() : this.getWorkDuration();
      const time = (this.currentSession ? this.timeRemaining : fallback);
      timerDisplay.textContent = this.formatTime(time);
    }

    if (sessionTypeDisplay) {
      // Show explicit label by phase
      sessionTypeDisplay.textContent = (this.phase === 'rest')
        ? '☕ Rest Time'
        : '🍅 Focus Session';
    }

    if (progressFill && this.currentSession) {
      const elapsed = this.currentSession.duration - this.timeRemaining;
      const pct = (elapsed / this.currentSession.duration) * 100;
      progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    } else if (progressFill) {
      progressFill.style.width = '0%';
    }
  }

  updateSessionControls() {
    const activeSection = document.getElementById('activeSessionSection');
    const starterSection = document.getElementById('sessionStarterSection');
    const pauseBtn = document.getElementById('pauseSession');

    const showActive = !!this.currentSession && (this.isRunning || this.isPaused);
    if (showActive) {
      if (activeSection) activeSection.style.display = 'block';
      if (starterSection) starterSection.style.display = 'none';
      if (pauseBtn) pauseBtn.innerHTML = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
    } else {
      if (activeSection) activeSection.style.display = 'none';
      if (starterSection) starterSection.style.display = 'block';
    }
  }

  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '../images/hello_extensions.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message, icon: '../images/hello_extensions.png' });
        }
      });
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const mgr = new StudySessionManager();
  window.studySessionManager = mgr; // expose for debugging
});
