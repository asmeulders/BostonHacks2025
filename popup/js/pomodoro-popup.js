// Pomodoro Popup - UI Display Only
// All timer logic is handled by the background service worker

class PomodoroPopup {
  constructor() {
    this.currentState = null;
    this.updateInterval = null;
    this.init();
  }

  async init() {
    console.log('🎯 Pomodoro Popup initializing...');
    
    // Get initial state from background
    console.log('🔄 Getting initial state...');
    await this.requestStateUpdate();
    
    // Set up UI event listeners
    console.log('🎛️ Setting up event listeners...');
    this.setupEventListeners();
    
    // Listen for state updates from background
    console.log('📻 Setting up message listener...');
    this.setupMessageListener();
    
    // Update UI every second for smooth countdown
    console.log('⏱️ Starting UI updates...');
    this.startUIUpdates();
    
    console.log('✅ Pomodoro Popup ready');
  }

  async requestStateUpdate() {
    try {
      console.log('📤 Requesting timer state from background...');
      const response = await chrome.runtime.sendMessage({ action: 'GET_TIMER_STATE' });
      console.log('📥 Received response from background:', response);
      if (response && response.success) {
        console.log('🔄 Updating state with:', response.state);
        this.updateState(response.state);
      } else {
        console.error('❌ Invalid response from background:', response);
      }
    } catch (error) {
      console.error('❌ Failed to get timer state:', error);
    }
  }

  setupMessageListener() {
    // Listen for state updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'TIMER_STATE_UPDATE') {
        this.updateState(message.state);
      }
    });
  }

  setupEventListeners() {
    // Settings sliders
    const workSlider = document.getElementById('workRange');
    const workTime = document.getElementById('work-time');
    const restSlider = document.getElementById('restRange');
    const restTime = document.getElementById('rest-time');

    if (workSlider && workTime) {
      workTime.textContent = workSlider.value;
      workSlider.addEventListener('input', (event) => {
        workTime.textContent = event.target.value;
        this.updateSettings();
      });
    }

    if (restSlider && restTime) {
      restTime.textContent = restSlider.value;
      restSlider.addEventListener('input', (event) => {
        restTime.textContent = event.target.value;
        this.updateSettings();
      });
    }

    // Control buttons
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseSession');
    const endBtn = document.getElementById('endSession');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startSession());
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.togglePause());
    }

    if (endBtn) {
      endBtn.addEventListener('click', () => this.stopSession());
    }
  }

  async updateSettings() {
    const workSlider = document.getElementById('workRange');
    const restSlider = document.getElementById('restRange');
    
    const workMinutes = workSlider ? parseInt(workSlider.value) : 25;
    const restMinutes = restSlider ? parseInt(restSlider.value) : 5;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'UPDATE_SETTINGS',
        workDuration: workMinutes * 60,
        breakDuration: restMinutes * 60
      });
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
    }
  }

  async startSession() {
    if (!this.currentState) return;
    
    const workSlider = document.getElementById('workRange');
    const duration = workSlider ? parseInt(workSlider.value) * 60 : 25 * 60;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'START_WORK_SESSION',
        duration: duration
      });
    } catch (error) {
      console.error('❌ Failed to start session:', error);
    }
  }

  async togglePause() {
    // TODO: Implement pause functionality in background script
    console.log('⏸️ Pause functionality not yet implemented');
  }

  async stopSession() {
    try {
      await chrome.runtime.sendMessage({ action: 'STOP_TIMER' });
    } catch (error) {
      console.error('❌ Failed to stop session:', error);
    }
  }

  updateState(newState) {
    this.currentState = newState;
    this.updateUI();
  }

  startUIUpdates() {
    // Update UI every second for smooth countdown
    this.updateInterval = setInterval(() => {
      if (this.currentState && this.currentState.isRunning) {
        // Request fresh state for accurate countdown
        this.requestStateUpdate();
      }
    }, 1000);
  }

  updateUI() {
    if (!this.currentState) return;

    this.updateTimerDisplay();
    this.updateSessionControls();
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const sessionTypeDisplay = document.getElementById('sessionType');
    const progressFill = document.getElementById('progressFill');

    if (timerDisplay) {
      const time = this.currentState.timeRemaining || 0;
      timerDisplay.textContent = this.formatTime(time);
    }

    if (sessionTypeDisplay) {
      const phaseLabel = this.currentState.phase === 'work' ? '🍅 Focus Session' : '☕ Break Time';
      sessionTypeDisplay.textContent = phaseLabel;
    }

    if (progressFill && this.currentState.isRunning) {
      const elapsed = this.currentState.duration - this.currentState.timeRemaining;
      const pct = (elapsed / this.currentState.duration) * 100;
      progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    } else if (progressFill) {
      progressFill.style.width = '0%';
    }
  }

  updateSessionControls() {
    const activeSection = document.getElementById('activeSessionSection');
    const starterSection = document.getElementById('sessionStarterSection');
    const startBtn = document.getElementById('startTimer');

    const showActive = this.currentState && this.currentState.isRunning;
    
    if (showActive) {
      if (activeSection) activeSection.style.display = 'block';
      if (starterSection) starterSection.style.display = 'none';
    } else {
      if (activeSection) activeSection.style.display = 'none';
      if (starterSection) starterSection.style.display = 'block';
      
      // Update start button text based on current phase
      if (startBtn) {
        if (this.currentState && this.currentState.phase === 'break') {
          startBtn.textContent = 'Start Work Session';
        } else {
          startBtn.textContent = 'Start Focus Session';
        }
      }
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PomodoroPopup();
  window.pomodoroPopup = popup; // For debugging
});