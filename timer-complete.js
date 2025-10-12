// Timer completion page script - CSP compliant

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const completedPhase = urlParams.get('phase') || 'work';
const message = urlParams.get('message') || 'Session complete!';

// Update the page content based on completed phase
function updatePageContent() {
    const phaseIcon = document.getElementById('phaseIcon');
    const title = document.getElementById('title');
    const messageEl = document.getElementById('message');
    const nextPhase = document.getElementById('nextPhase');
    const nextTimer = document.getElementById('nextTimer');
    
    if (completedPhase === 'work') {
        phaseIcon.textContent = '🎯';
        title.textContent = 'Work Session Complete!';
        messageEl.textContent = 'Excellent work! Time to take a well-deserved break.';
        nextPhase.textContent = 'It\'s Break Time! 🌟';
        //nextTimer.textContent = '5:00'; // Default break time
    } else {
        phaseIcon.textContent = '⏰';
        title.textContent = 'Break Complete!';
        messageEl.textContent = 'Refreshed and ready? Let\'s get back to focused work!';
        nextPhase.textContent = 'Time to Work Again! 💪';
        //nextTimer.textContent = '25:00'; // Default work time
    }
}

// Auto-close the tab after 8 seconds
function setupAutoClose() {
    setTimeout(() => {
        window.close();
    }, 8000);
}

// Add entrance animation
function setupAnimation() {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.5s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updatePageContent();
    setupAutoClose();
    setupAnimation();
});