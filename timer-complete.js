// Timer Complete Page JavaScript
// Handles the session completion notification page

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Timer complete page loading...');
    initializeTimerCompletePage();
});

function initializeTimerCompletePage() {
    console.log('🚀 Initializing timer complete page');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const completedPhase = urlParams.get('phase') || 'work';
    const message = urlParams.get('message') || 'Session complete!';
    
    console.log('📋 Page parameters:');
    console.log('- Completed phase:', completedPhase);
    console.log('- Message:', message);
    console.log('- Full URL:', window.location.href);
    
    // Update the page content based on completed phase
    updatePageContent(completedPhase, message);
    
    // Set up auto-close timer
    setupAutoClose();
    
    // Set up button event listeners
    setupEventListeners();
    
    // Add animation on load
    animatePageLoad();
    
    console.log('✅ Timer complete page initialization complete');
}

function updatePageContent(completedPhase, message) {
    const phaseIcon = document.getElementById('phaseIcon');
    const title = document.getElementById('title');
    const messageEl = document.getElementById('message');
    const nextPhase = document.getElementById('nextPhase');
    const nextTimer = document.getElementById('nextTimer');
    
    if (completedPhase === 'work') {
        phaseIcon.textContent = '🎯';
        title.textContent = 'Work Session Complete!';
        nextPhase.textContent = 'Starting Break Session';
        nextTimer.textContent = '5:00'; // Default break time
    } else {
        phaseIcon.textContent = '⏰';
        title.textContent = 'Break Complete!';
        nextPhase.textContent = 'Starting Work Session';
        nextTimer.textContent = '25:00'; // Default work time
    }
    
    messageEl.textContent = decodeURIComponent(message);
}

function setupAutoClose() {
    // Auto-close after 10 seconds if user doesn't interact
    let autoCloseTimer = setTimeout(() => {
        closeTab();
    }, 10000);
    
    // Cancel auto-close if user interacts with the page
    document.addEventListener('click', () => {
        clearTimeout(autoCloseTimer);
    });
    
    // Store timer reference for potential cleanup
    window.autoCloseTimer = autoCloseTimer;
}

function setupEventListeners() {
    const returnBtn = document.getElementById('returnBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (returnBtn) {
        returnBtn.addEventListener('click', returnToExtension);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTab);
    }
}

function returnToExtension() {
    // Try to send message to background script, then close tab
    try {
        chrome.runtime.sendMessage({action: 'FOCUS_EXTENSION'}, () => {
            window.close();
        });
    } catch (err) {
        // If chrome.runtime is not available, just close
        console.log('Could not send message to extension:', err);
        window.close();
    }
}

function closeTab() {
    window.close();
}

function animatePageLoad() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.5s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }
}