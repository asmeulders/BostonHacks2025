console.log('🔧 Pomodoro Service Worker starting up...');

// Pomodoro Timer State - ALL logic lives here
let timerState = {
  isRunning: false,
  isPaused: false,
  phase: 'work', // 'work' or 'break'
  startTime: null,
  endTime: null,
  duration: 0,
  workDuration: 25 * 60, // 25 minutes in seconds
  breakDuration: 5 * 60  // 5 minutes in seconds
};

const ALARM_NAME = 'pomodoroTimer';

// Initialize timer state from storage on startup
async function initializeTimer() {
  try {
    const result = await chrome.storage.local.get(['pomodoroState']);
    if (result.pomodoroState) {
      timerState = { ...timerState, ...result.pomodoroState };
      console.log('📂 Loaded timer state from storage:', timerState);
      
      // Check if we need to resume or complete a running timer
      if (timerState.isRunning && timerState.endTime) {
        const now = Date.now();
        if (now >= timerState.endTime) {
          console.log('⏰ Timer expired while service worker was inactive');
          await completeCurrentSession();
        } else {
          console.log('▶️ Resuming active timer');
          setupAlarm();
        }
      }
    } else {
      console.log('🆕 No previous timer state found - starting fresh');
    }
  } catch (error) {
    console.error('❌ Failed to load timer state:', error);
  }
}

// Save timer state to storage
async function saveTimerState() {
  try {
    await chrome.storage.local.set({ pomodoroState: timerState });
  } catch (error) {
    console.error('❌ Failed to save timer state:', error);
  }
}

// Start a new session (work or break)
async function startSession(phase, duration) {
  console.log(`🚀 Starting ${phase} session for ${duration} seconds`);
  
  const now = Date.now();
  timerState = {
    ...timerState,
    isRunning: true,
    isPaused: false,
    phase: phase,
    startTime: now,
    endTime: now + (duration * 1000),
    duration: duration
  };
  
  await saveTimerState();
  setupAlarm();
  broadcastStateUpdate();
}

// Setup chrome alarm for session completion
function setupAlarm() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { when: timerState.endTime });
  console.log(`⏰ Alarm set for ${new Date(timerState.endTime)}`);
}

// Complete current session and start next phase automatically
async function completeCurrentSession() {
  console.log(`✅ ${timerState.phase} session complete!`);
  
  const completedPhase = timerState.phase;
  const nextPhase = completedPhase === 'work' ? 'break' : 'work';
  const nextDuration = nextPhase === 'work' ? timerState.workDuration : timerState.breakDuration;
  
  // Show completion notification tab
  await showCompletionTab(completedPhase);
  
  // Automatically start next phase
  console.log(`🔄 Auto-starting ${nextPhase} session`);
  await startSession(nextPhase, nextDuration);
}

// Show completion tab
async function showCompletionTab(completedPhase) {
  const messages = {
    work: ['Great job! Time to recharge.', 'Nice focus session—grab some water!', 'You crushed it. Stretch time!'],
    break: ['Break\'s over—let\'s dive back in!', 'Refreshed? Back to it!', 'You\'ve got this—time to focus.']
  };
  
  const message = messages[completedPhase][Math.floor(Math.random() * messages[completedPhase].length)];
  
  try {
    const url = chrome.runtime.getURL('timer-complete.html') + 
                `?phase=${completedPhase}&message=${encodeURIComponent(message)}`;
    
    await chrome.tabs.create({ url: url });
    console.log('📄 Completion tab created');
  } catch (error) {
    console.error('❌ Failed to create completion tab:', error);
  }
}

// Stop the timer completely
async function stopTimer() {
  console.log('🛑 Stopping timer');
  
  timerState.isRunning = false;
  timerState.isPaused = false;
  chrome.alarms.clear(ALARM_NAME);
  
  await saveTimerState();
  broadcastStateUpdate();
}

// Get current timer state for popup
function getCurrentState() {
  if (!timerState.isRunning) {
    return {
      ...timerState,
      timeRemaining: timerState.phase === 'work' ? timerState.workDuration : timerState.breakDuration
    };
  }
  
  const now = Date.now();
  const timeRemaining = Math.max(0, Math.ceil((timerState.endTime - now) / 1000));
  
  return {
    ...timerState,
    timeRemaining
  };
}

// Broadcast state updates to popup (if open)
function broadcastStateUpdate() {
  const state = getCurrentState();
  
  chrome.runtime.sendMessage({
    action: 'TIMER_STATE_UPDATE',
    state: state
  }).catch(() => {
    // Popup might not be open, that's fine
  });
}

// Handle alarm events - this is where sessions complete automatically
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('⏰ Timer alarm triggered - completing session');
    completeCurrentSession();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📥 Service worker received message:', request);
  
  if (request.action === 'START_WORK_SESSION') {
    startSession('work', request.duration || timerState.workDuration);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'START_BREAK_SESSION') {
    startSession('break', request.duration || timerState.breakDuration);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'STOP_TIMER') {
    stopTimer();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'GET_TIMER_STATE') {
    const currentState = getCurrentState();
    console.log('📤 Sending timer state to popup:', currentState);
    sendResponse({ success: true, state: currentState });
    return true;
  }
  
  if (request.action === 'UPDATE_SETTINGS') {
    timerState.workDuration = request.workDuration || timerState.workDuration;
    timerState.breakDuration = request.breakDuration || timerState.breakDuration;
    saveTimerState();
    sendResponse({ success: true });
    return true;
  }

  // Legacy support for existing functionality
  if (request.action === 'OPEN_SESSION_COMPLETE_TAB') {
    showCompletionTab(request.phase);
    sendResponse({ success: true });
    return true;
  }
});

// Initialize when service worker starts
initializeTimer();

console.log('✅ Pomodoro Service Worker ready - timers will persist!');