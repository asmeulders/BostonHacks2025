import { DomainManagerLogic, domainManagerLogic  } from './popup/js/domain-manager-logic.js';
console.log('🔧 Pomodoro Service Worker with Study Teacher starting up...');

// StudyFocusManager functionality (inline implementation)
let studyFocusManager = null;
let geminiApiKey = null;

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

// Study Teacher Configuration
const encouragingPhrases = [
  "Great question! 🤔",
  "I love your curiosity! 📚", 
  "Let's explore this together! 🔍",
  "Excellent thinking! 💡",
  "That's a thoughtful question! 🎯",
  "I can help you understand this! 🌟",
  "Let's break this down step by step! 📝",
  "Perfect topic to dive into! 🚀"
];

// Study session tracking
let studySession = {
  questionsAsked: 0,
  subjects: [],
  startTime: null
};

// Get random encouraging phrase
function getEncouragingPhrase() {
  return encouragingPhrases[Math.floor(Math.random() * encouragingPhrases.length)];
}

// Enhanced prompt with session context for Study Teacher
function buildTeacherPrompt(question) {
  const sessionContext = studySession.questionsAsked > 0 
    ? `\n\n📊 **SESSION CONTEXT:** This is question #${studySession.questionsAsked + 1} in our study session. Previous subjects covered: ${studySession.subjects.join(', ') || 'None yet'}.`
    : '\n\n🎯 **SESSION START:** Welcome to our study session!';
  
  return `You are Professor StudyBot 🎓, an experienced and caring academic tutor specializing in helping students truly understand concepts.

🎯 **YOUR MISSION:** Help students LEARN and UNDERSTAND, not just get answers.

📖 **TEACHING APPROACH BY SUBJECT:**
• **Math/Science:** Show step-by-step solutions, explain the "why" behind each step, use real-world applications
• **Literature/Writing:** Ask about themes, guide analysis, help develop critical thinking
• **History:** Connect events to causes/effects, relate to current events when relevant  
• **Programming:** Explain logic flow, suggest debugging approaches, teach best practices
• **Study Skills:** Provide proven techniques, time management, memory strategies

💡 **RESPONSE FORMULA:**
1. **Acknowledge:** Start with "${getEncouragingPhrase()}"
2. **Teach:** Break down the concept step-by-step with clear explanations
3. **Example:** Provide a relatable example or analogy when helpful
4. **Engage:** End with a thought-provoking follow-up question to deepen learning
5. **Encourage:** Remind them they're making progress

🎪 **PERSONALITY TRAITS:**
- Patient and never condescending 
- Enthusiastic about learning
- Uses analogies and real-world connections
- Asks Socratic questions to guide discovery
- Celebrates student insights and progress

⚡ **SPECIAL RULES:**
- For homework: Guide to solution, don't just give answers
- For unclear questions: Ask clarifying questions
- For off-topic questions: Gently redirect to academic topics
- Keep responses focused (2-4 paragraphs) but thorough
- Reference previous questions in the session when relevant

${sessionContext}

**Student's Question:** "${question}"

Now help them learn! 🚀`;
}

// Load Gemini API key
async function loadGeminiApiKey() {
  try {
    // First check Chrome storage
    // const storageResult = await chrome.storage.local.get(['geminiApiKey']);
    // if (storageResult.geminiApiKey) {
    //   geminiApiKey = storageResult.geminiApiKey;
    //   console.log('🔑 API key loaded from Chrome storage', geminiApiKey);
    //   return;
    // }
    
    // Try to load from config.json
    const response = await fetch(chrome.runtime.getURL('config.json'));
    const config = await response.json();
    
    if (config.geminiApiKey && config.geminiApiKey.trim()) {
      geminiApiKey = config.geminiApiKey.trim();
      await chrome.storage.local.set({ geminiApiKey: geminiApiKey });
      console.log('🔑 API key loaded from config.json and stored in Chrome storage');
    } else {
      console.warn('⚠️ No API key found in config.json - Gemini chat will not work');
    }
  } catch (error) {
    console.error('❌ Error loading Gemini API key:', error);
  }
}

// Ask Gemini AI a question with Study Teacher persona
async function askGemini(question) {
  if (!geminiApiKey) {
    await loadGeminiApiKey();
  }
  
  if (!geminiApiKey) {
    return 'Gemini API key not configured. Please set it up first.';
  }

  console.log('🎓 Professor StudyBot is analyzing your question:', question);

  try {
    // Track study session progress
    if (!studySession.startTime) {
      studySession.startTime = Date.now();
      console.log('📚 New study session started!');
    }
    studySession.questionsAsked++;

    const requestBody = {
      contents: [{
        parts: [{
          text: buildTeacherPrompt(question)
        }]
      }]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Gemini API response status:', response.status);

    const data = await response.json();
    console.log('📄 Gemini API response received');
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const answer = data.candidates[0].content.parts[0].text;
      console.log('✅ Professor StudyBot provided an answer!');
      return answer;
    } else {
      console.log('❌ No valid response found');
      if (data.error) {
        console.log('API Error:', data.error);
        return `API Error: ${data.error.message || 'Unknown error'}`;
      }
      return 'Sorry, I couldn\'t generate a response.';
    }
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return 'Error connecting to AI service. Please try again.';
  }
}

// Initialize study chat functionality
async function initializeStudyFocusManager() {
  try {
    await loadGeminiApiKey();
    studyFocusManager = true; // Just a flag to indicate it's ready
    console.log('🤖 Study Teacher functionality initialized');
  } catch (error) {
    console.error('❌ Failed to initialize study teacher:', error);
  }
}

// Handle study question requests
async function handleStudyQuestion(question) {
  console.log('🔄 handleStudyQuestion called with:', question);
  try {
    const result = await askGemini(question);
    console.log('🔄 handleStudyQuestion returning answer');
    return result;
  } catch (error) {
    console.error('🔄 handleStudyQuestion error:', error);
    throw error;
  }
}

// ===================
// TIMER FUNCTIONALITY
// ===================

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
    activeTabId: phase === 'work' ? null : timerState.activeTabId,
    workDomains: phase === 'work' ? [] : timerState.workDomains
  };

  await saveTimerState();
  setupAlarm();
  broadcastStateUpdate();
  
  console.log(`🎯 ${phase === 'work' ? 'Work session started - distraction alerts enabled' : 'Break session started'}`);
}

// Setup alarm for timer completion
function setupAlarm() {
  chrome.alarms.clear(ALARM_NAME);
  
  const alarmTime = new Date(timerState.endTime).getTime();
  console.log(`⏰ Setting alarm for: ${new Date(alarmTime).toLocaleTimeString()}`);
  
  chrome.alarms.create(ALARM_NAME, { when: alarmTime });
}

// Broadcast state update to all listening popups
function broadcastStateUpdate() {
  const currentState = getCurrentState();
  console.log('📡 Broadcasting state update:', currentState);
  
  // This will be caught by any open popup
  chrome.runtime.sendMessage({
    action: 'TIMER_STATE_UPDATE',
    state: currentState
  }).catch(() => {
    // Silently ignore - no popup is open
  });
}

// Complete the current session
async function completeCurrentSession() {
  console.log(`🎉 Session complete: ${timerState.phase}`);
  
  const completedPhase = timerState.phase;
  
  // Update state
  await showCompletionTab(completedPhase);
  
  // Determine next phase and duration
  const nextPhase = completedPhase === 'work' ? 'break' : 'work';
  const nextDuration = nextPhase === 'work' ? timerState.workDuration : timerState.breakDuration;

  console.log(`🔄 Auto-starting ${nextPhase} session for ${nextDuration} seconds`);
  
  // Start the next session automatically


  await startSession(nextPhase, nextDuration);
}

// Show session completion tab
async function showCompletionTab(phase) {
  try {
    const url = chrome.runtime.getURL('timer-complete.html') + `?phase=${phase}`;
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
    timeRemaining: timeRemaining
  };
}

// ===================
// MESSAGE HANDLERS
// ===================

// Handle alarms (timer completion)
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

  // Manual API key setup
  if (request.action === 'setupGeminiApiKey') {
    loadGeminiApiKey()
      .then(() => sendResponse({ success: true, message: 'API key loaded successfully' }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Study chat functionality
  if (request.action === 'askStudyQuestion') {
    console.log('🎯 Handling study question:', request.question);
    handleStudyQuestion(request.question)
      .then(answer => {
        console.log('✅ Got answer from Professor StudyBot:', answer.substring(0, 100) + '...');
        sendResponse({ success: true, answer });
      })
      .catch(error => {
        console.error('❌ Study question error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that the response is asynchronous
  }

  // Legacy support for existing functionality
  if (request.action === 'OPEN_SESSION_COMPLETE_TAB') {
    showCompletionTab(request.phase);
    sendResponse({ success: true });
    return true;
  }

  // Study chat functionality
  if (request.action === 'addWorkDomain') {
    domainManagerLogic.add(request.domain)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    domainManagerUI
    return true;
  }

  // Study chat functionality
  if (request.action === 'goBack') {
    domainManagerLogic.add(request.domain)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    domainManagerUI
    return true;
  }
});

// Initialize when service worker starts
initializeTimer();
initializeStudyFocusManager();

// Force load API key immediately
loadGeminiApiKey();

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

console.log('✅ Pomodoro Service Worker with Professor StudyBot ready! 🎓');