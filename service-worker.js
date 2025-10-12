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

// Task Management Storage
let tasks = [];
const TASK_STORAGE_KEY = 'studyTasks';

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
    const storageResult = await chrome.storage.local.get(['geminiApiKey']);
    if (storageResult.geminiApiKey) {
      geminiApiKey = storageResult.geminiApiKey;
      console.log('🔑 API key loaded from Chrome storage');
      return;
    }
    
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

  // First check if this is a task command
  const taskCommand = parseTaskCommand(question);
  if (taskCommand) {
    console.log('📋 Task command detected:', taskCommand);
    
    try {
      let response = '';
      
      switch (taskCommand.action) {
        case 'create':
          await createTask(taskCommand.task);
          response = `✅ Perfect! I've added "${taskCommand.task}" to your task list. Having clear tasks helps you stay organized and focused on your studies! 

🎯 **Study Tip:** Break down complex assignments into smaller, manageable tasks. This makes big projects feel less overwhelming and gives you more frequent victories to celebrate!

What would you like to work on first?`;
          break;
          
        case 'delete':
          await deleteTask(taskCommand.task);
          response = `🗑️ Alright! I've removed "${taskCommand.task}" from your task list. 

💡 **Remember:** It's okay to adjust your task list as priorities change. Being flexible with your planning is part of effective studying!

What's next on your agenda?`;
          break;
          
        case 'done':
          await markTaskDone(taskCommand.task);
          response = `🎉 Fantastic work! You've completed "${taskCommand.task}". I'm so proud of your progress! 

⭐ **Celebration Time:** Take a moment to acknowledge what you've accomplished. These small wins build momentum for bigger achievements!

Ready to tackle the next challenge?`;
          break;
          
        case 'list':
          const tasks = await getAllTasks();
          if (tasks.length === 0) {
            response = `📝 Your task list is currently empty! 

🚀 **Getting Started:** Try telling me "create a task to review chapter 3" or "add homework: math problems 1-20" to get organized!

What would you like to accomplish today?`;
          } else {
            const taskList = tasks.map((task, index) => 
              `${index + 1}. ${task.completed ? '✅' : '📌'} ${task.text}`
            ).join('\n');
            
            response = `📋 **Your Current Tasks:**

${taskList}

🎯 **Study Strategy:** Focus on one task at a time for better concentration and quality work. Which one feels most important right now?`;
          }
          break;
          
        default:
          response = '🤔 I understand you want to manage tasks, but I\'m not sure exactly what you\'d like me to do. Try phrases like "create task", "mark done", "delete task", or "show my tasks"!';
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Task management error:', error);
      return '⚠️ I had trouble managing your task. Don\'t worry though - let\'s keep focusing on your studies! What academic question can I help you with?';
    }
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

// ===============================
// TASK MANAGEMENT SYSTEM
// ===============================

// Load tasks from Chrome storage
async function loadTasks() {
  try {
    const result = await chrome.storage.local.get([TASK_STORAGE_KEY]);
    tasks = result[TASK_STORAGE_KEY] || [];
    console.log('📋 Loaded tasks:', tasks.length);
  } catch (error) {
    console.error('❌ Error loading tasks:', error);
    tasks = [];
  }
}

// Save tasks to Chrome storage
async function saveTasks() {
  try {
    await chrome.storage.local.set({ [TASK_STORAGE_KEY]: tasks });
    console.log('💾 Tasks saved to storage');
  } catch (error) {
    console.error('❌ Error saving tasks:', error);
  }
}

// Create a new task
async function createTask(taskText) {
  const newTask = {
    id: Date.now().toString(),
    text: taskText.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  
  tasks.push(newTask);
  await saveTasks();
  console.log('✅ Task created:', newTask);
  return newTask;
}

// Delete a task
async function deleteTask(taskText) {
  const normalizedText = taskText.toLowerCase().trim();
  const taskIndex = tasks.findIndex(task => 
    task.text.toLowerCase().includes(normalizedText) || 
    normalizedText.includes(task.text.toLowerCase())
  );
  
  if (taskIndex !== -1) {
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    await saveTasks();
    console.log('🗑️ Task deleted:', deletedTask);
    return deletedTask;
  }
  
  throw new Error(`Task "${taskText}" not found`);
}

// Mark task as done
async function markTaskDone(taskText) {
  const normalizedText = taskText.toLowerCase().trim();
  const task = tasks.find(task => 
    task.text.toLowerCase().includes(normalizedText) || 
    normalizedText.includes(task.text.toLowerCase())
  );
  
  if (task && !task.completed) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    await saveTasks();
    console.log('✅ Task marked done:', task);
    return task;
  }
  
  if (task && task.completed) {
    throw new Error(`Task "${taskText}" is already completed`);
  }
  
  throw new Error(`Task "${taskText}" not found`);
}

// Get all tasks
async function getAllTasks() {
  await loadTasks(); // Ensure we have latest data
  return [...tasks]; // Return copy
}

// Parse task commands from natural language
function parseTaskCommand(text) {
  const lowercaseText = text.toLowerCase().trim();
  
  // Create task patterns
  if (lowercaseText.match(/^(create|add|new)\s+(task|todo)?\s*:?\s*(.+)$/i)) {
    const match = lowercaseText.match(/^(create|add|new)\s+(task|todo)?\s*:?\s*(.+)$/i);
    return { action: 'create', task: match[3] };
  }
  
  // Delete task patterns
  if (lowercaseText.match(/^(delete|remove|clear)\s+(task|todo)?\s*:?\s*(.+)$/i)) {
    const match = lowercaseText.match(/^(delete|remove|clear)\s+(task|todo)?\s*:?\s*(.+)$/i);
    return { action: 'delete', task: match[3] };
  }
  
  // Mark done patterns
  if (lowercaseText.match(/^(done|complete|finish|finished)\s+(task|todo)?\s*:?\s*(.+)$/i)) {
    const match = lowercaseText.match(/^(done|complete|finish|finished)\s+(task|todo)?\s*:?\s*(.+)$/i);
    return { action: 'done', task: match[3] };
  }
  
  // List tasks patterns
  if (lowercaseText.match(/^(show|list|display|view)\s*(my\s*)?(tasks|todos|task list|todo list)$/i)) {
    return { action: 'list' };
  }
  
  return null;
}

// ===================
// TIMER FUNCTIONALITY
// ===================

// Tab monitoring for distraction detection
async function handleTabSwitch(tabId) {
  try {
    console.log('🔄 handleTabSwitch called for tab:', tabId);
    console.log('📊 Timer state:', {
      isRunning: timerState.isRunning,
      phase: timerState.phase,
      workDomains: timerState.workDomains
    });
    
    // Only monitor during work sessions
    if (!timerState.isRunning || timerState.phase !== 'work') {
      console.log('❌ Not monitoring - timer not running or not in work phase');
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

    // Enhanced distraction detection - show alert for any non-work domains during work sessions
    const isWorkDomain = timerState.workDomains.some(workDomain => 
      domain === workDomain || 
      domain.includes(workDomain) || 
      workDomain.includes(domain)
    );
    
    console.log('🔍 Domain check:', {
      domain: domain,
      workDomains: timerState.workDomains,
      isWorkDomain: isWorkDomain
    });
    
    if (!isWorkDomain) {
      console.log('⚠️ Non-work domain detected during work session:', domain);
      await showDistractionAlert(tabId, domain);
    } else {
      console.log('✅ Work domain - allowing access:', domain);
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
    
    // Send message to content script (already loaded via manifest)
    await chrome.tabs.sendMessage(tabId, {
      action: 'showDistractionAlert',
      domain: domain
    });

  } catch (error) {
    console.error('❌ Error showing distraction alert:', error);
    // If content script isn't loaded, try injecting it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['distraction-alert/distraction-content.js']
      });
      
      // Try sending message again
      await chrome.tabs.sendMessage(tabId, {
        action: 'showDistractionAlert',
        domain: domain
      });
    } catch (fallbackError) {
      console.error('❌ Fallback injection also failed:', fallbackError);
    }
  }
}

// Handle domain addition
async function handleDomainAdded(domain) {
  if (!timerState.workDomains.includes(domain)) {
    timerState.workDomains.push(domain);
    await saveTimerState();
    
    console.log('✅ Domain added to work domains:', domain);
    console.log('🔄 Updated work domains list:', timerState.workDomains);
  }
}

// ===============================
// ENHANCED DISTRACTION BLOCKING SYSTEM
// ===============================

// Enhanced blocking logic - shows distraction alert for non-work domains
function isDistractionDomain(domain) {
  // Common distracting sites
  const commonDistractingSites = [
    'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 
    'tiktok.com', 'reddit.com', 'netflix.com', 'twitch.tv', 
    'discord.com', 'whatsapp.com', 'telegram.org', 'snapchat.com',
    'pinterest.com', 'tumblr.com', 'linkedin.com', 'amazon.com',
    'ebay.com', 'aliexpress.com', 'spotify.com', 'soundcloud.com'
  ];
  
  // Check if current domain is a known distracting site
  const isDistractingSite = commonDistractingSites.some(distractor => 
    domain.includes(distractor) || distractor.includes(domain)
  );
  
  // Check if it's already a work domain
  const isWorkDomain = timerState.workDomains.some(workDomain => 
    workDomain.includes(domain) || domain.includes(workDomain)
  );
  
  // It's a distraction if it's a known distracting site AND not a work domain
  return isDistractingSite && !isWorkDomain;
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
  
  // Show completion notification tab
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
  
  console.log('🛑 Timer stopped - distraction alerts disabled');
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

  // Handle domain management
  if (request.type === 'DOMAIN_ADDED') {
    // Add domain to work domains and update blocking rules
    handleDomainAdded(request.domain)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Test blocking functionality
  if (request.action === 'TEST_BLOCKING') {
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(async tabs => {
        if (tabs[0]) {
          const domain = getDomainFromUrl(tabs[0].url);
          console.log('🧪 Testing blocking on domain:', domain);
          await showDistractionAlert(tabs[0].id, domain);
          sendResponse({ success: true, message: 'Test alert sent' });
        }
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle distraction alert responses
  if (request.action === 'addWorkDomain') {
    // User clicked "Yes, it's work" - add domain to work list
    handleDomainAdded(request.domain)
      .then(() => {
        console.log('✅ Domain marked as work domain from alert:', request.domain);
        sendResponse({ success: true });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'goBack') {
    // User clicked "No, go back" - close current tab or navigate back
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          chrome.tabs.goBack(tabs[0].id).catch(() => {
            // If can't go back, close the tab
            chrome.tabs.remove(tabs[0].id);
          });
        }
        sendResponse({ success: true });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
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
initializeStudyFocusManager();
loadTasks(); // Initialize task management

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