import { StudyFocusManager } from './study-focus-manager/study-focus-manager.js';

const studyFocusManager = new StudyFocusManager();

// Set up message listener at the top level to ensure it's always active
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request);
  
  if (request.action === 'askStudyQuestion') {
    console.log('Processing study question:', request.question);
    
    studyFocusManager.askStudyQuestion(request.question)
      .then(answer => {
        console.log('Sending response:', answer);
        sendResponse({ success: true, answer });
      })
      .catch(error => {
        console.error('Error in askStudyQuestion:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates that the response is sent asynchronously
  }
  
  if (request.action === 'OPEN_SESSION_COMPLETE_TAB') {
    console.log('Opening session complete tab for phase:', request.phase);
    
    const url = chrome.runtime.getURL('timer-complete.html') + 
                `?phase=${request.phase}&message=${encodeURIComponent(request.message)}`;
    
    chrome.tabs.create({ url: url }, (tab) => {
      console.log('Created session complete tab:', tab.id);
      sendResponse({ success: true, tabId: tab.id });
    });
    
    return true;
  }
  
  // Forward other messages to the manager's handleMessage method
  if (studyFocusManager.handleMessage) {
    return studyFocusManager.handleMessage(request, sender, sendResponse);
  }
});