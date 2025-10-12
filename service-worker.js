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
  breakDuration: 5 * 60,  // 5 minutes in seconds
  workDomains: [],        // Domains designated as work-related
  activeTabId: null       // Track active tab during work sessions
};

const ALARM_NAME = 'pomodoroTimer';

// Tab monitoring for distraction detection
async function handleTabSwitch(tabId) {
  try {
    // Only monitor during work sessions
    if (!timerState.isRunning || timerState.phase !== 'work') {
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    
    // Skip internal Chrome pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('⏭️ Skipping internal page:', tab.url);
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    console.log('🌐 Current domain:', domain);

    // If this is the first tab during work session, designate as work domain
    if (timerState.activeTabId === null) {
      timerState.activeTabId = tabId;
      timerState.workDomains.push(domain);
      await saveTimerState();
      console.log('🎯 Designated work domain:', domain);
      return;
    }

    // Check if current domain is in work domains
    if (!timerState.workDomains.includes(domain)) {
      console.log('⚠️ Potential distraction detected:', domain);
      await showDistractionAlert(tabId, domain);
    }

  } catch (error) {
    console.error('❌ Error handling tab switch:', error);
  }
}

// Extract domain from URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('❌ Error parsing URL:', url, error);
    return '';
  }
}

// Show distraction alert
async function showDistractionAlert(tabId, domain) {
  try {
    console.log('🚨 Showing distraction alert for:', domain);
    
    // Inject content script to show alert
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['distraction-alert/distraction-content.js']
    });

    // Send message to show alert
    await chrome.tabs.sendMessage(tabId, {
      action: 'showDistractionAlert',
      domain: domain
    });

  } catch (error) {
    console.error('❌ Error showing distraction alert:', error);
  }
}

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
    duration: duration,
    // Reset work tracking when starting new work session
    workDomains: phase === 'work' ? [] : timerState.workDomains,
    activeTabId: phase === 'work' ? null : timerState.activeTabId
  };
  
  console.log(`🎯 ${phase} session started - work domains reset:`, timerState.workDomains);
  
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

// Set up tab monitoring for distraction detection
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('📑 Tab activated:', activeInfo.tabId);
  await handleTabSwitch(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log('📑 Tab updated and active:', tabId, tab.url);
    await handleTabSwitch(tabId);
  }
});

console.log('✅ Pomodoro Service Worker ready - timers will persist!');