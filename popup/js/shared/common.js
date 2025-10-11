// Shared utility functions and common functionality for all popup pages

class PopupUtils {
  // Chrome extension messaging
  static async sendMessage(message) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error('Error sending message to background:', error);
      throw error;
    }
  }

  // Chrome storage operations
  static async getStorage(keys = null) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('Error getting from storage:', error);
      throw error;
    }
  }

  static async setStorage(data) {
    try {
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      console.error('Error setting storage:', error);
      throw error;
    }
  }

  static async removeStorage(keys) {
    try {
      await chrome.storage.local.remove(keys);
      return true;
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  static async clearStorage() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Tab operations
  static async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      throw error;
    }
  }

  static async getAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs;
    } catch (error) {
      console.error('Error getting all tabs:', error);
      throw error;
    }
  }

  // URL and domain utilities
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      console.error('Error extracting domain from URL:', url, error);
      return null;
    }
  }

  static isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Time formatting utilities
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  static parseTimeString(timeString) {
    const parts = timeString.split(':').map(part => parseInt(part, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // minutes:seconds
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
    }
    return 0;
  }

  static formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    }
  }

  // Date utilities
  static formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static formatDateTime(date) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  static isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  // UI utilities
  static showMessage(text, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('statusMessage') || document.createElement('div');
    messageEl.id = 'statusMessage';
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = text;
    
    if (!document.getElementById('statusMessage')) {
      document.body.appendChild(messageEl);
    }
    
    // Show the message
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    // Hide the message after duration
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, duration);
  }

  static showError(text, duration = 4000) {
    this.showMessage(text, 'error', duration);
  }

  static showSuccess(text, duration = 3000) {
    this.showMessage(text, 'success', duration);
  }

  static showWarning(text, duration = 3500) {
    this.showMessage(text, 'warning', duration);
  }

  static setLoading(element, isLoading) {
    if (isLoading) {
      element.classList.add('loading');
      element.disabled = true;
      const originalText = element.textContent;
      element.dataset.originalText = originalText;
      element.innerHTML = '<span class="loading-spinner"></span> Loading...';
    } else {
      element.classList.remove('loading');
      element.disabled = false;
      if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    }
  }

  // Data validation
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>\"'&]/g, '');
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateNumber(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  }

  // Local storage helpers for settings
  static getLocalSetting(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(`studyFocus_${key}`);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Error getting local setting:', key, error);
      return defaultValue;
    }
  }

  static setLocalSetting(key, value) {
    try {
      localStorage.setItem(`studyFocus_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting local setting:', key, error);
      return false;
    }
  }

  // Debug utilities
  static log(message, data = null) {
    if (this.getLocalSetting('debugMode', false)) {
      console.log(`[StudyFocus] ${message}`, data || '');
    }
  }

  static logError(message, error = null) {
    console.error(`[StudyFocus Error] ${message}`, error || '');
  }

  // Debounce utility
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle utility
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  // File utilities
  static downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static downloadCSV(data, filename) {
    const csv = this.arrayToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static arrayToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvContent.join('\n');
  }

  static async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // Event handling utilities
  static addClickOutsideListener(element, callback) {
    const handleClickOutside = (event) => {
      if (!element.contains(event.target)) {
        callback();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }

  // Animation utilities
  static fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const start = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  static fadeOut(element, duration = 300) {
    const start = performance.now();
    const initialOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = initialOpacity * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Statistics utilities
  static calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  static calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  // Notification utilities
  static async showNotification(title, message, iconUrl = null) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: iconUrl || chrome.runtime.getURL('images/icon48.png')
        });
      }
    }
  }

  // Keyboard shortcut utilities
  static handleKeyboardShortcut(event, shortcuts) {
    const key = event.key.toLowerCase();
    const modifiers = {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };

    for (const shortcut of shortcuts) {
      if (shortcut.key === key && 
          shortcut.ctrl === modifiers.ctrl &&
          shortcut.alt === modifiers.alt &&
          shortcut.shift === modifiers.shift &&
          shortcut.meta === modifiers.meta) {
        event.preventDefault();
        shortcut.callback();
        return true;
      }
    }
    return false;
  }
}

// Navigation helper for moving between pages
class PageNavigation {
  static navigateTo(page) {
    if (page.startsWith('http')) {
      window.open(page, '_blank');
    } else {
      window.location.href = page;
    }
  }

  static goBack() {
    window.history.back();
  }

  static goToMainMenu() {
    window.location.href = '../index.html';
  }
}

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add back button functionality if present
  const backButton = document.querySelector('.back-button');
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      PageNavigation.goBack();
    });
  }

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const shortcuts = [
      {
        key: 'escape',
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
        callback: () => {
          const modal = document.querySelector('.modal:not(.hidden)');
          if (modal) {
            modal.classList.add('hidden');
          } else {
            PageNavigation.goBack();
          }
        }
      },
      {
        key: 'h',
        ctrl: true,
        alt: false,
        shift: false,
        meta: false,
        callback: () => PageNavigation.goToMainMenu()
      }
    ];

    PopupUtils.handleKeyboardShortcut(e, shortcuts);
  });

  // Initialize tooltips if present
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(element => {
    element.addEventListener('mouseenter', (e) => {
      // Add tooltip functionality here if needed
    });
  });

  // Add loading state management to buttons
  const buttons = document.querySelectorAll('.action-button, .test-button, .settings-button');
  buttons.forEach(button => {
    const originalHandler = button.onclick;
    if (originalHandler) {
      button.onclick = async (e) => {
        try {
          PopupUtils.setLoading(button, true);
          await originalHandler.call(button, e);
        } catch (error) {
          PopupUtils.logError('Button action failed:', error);
          PopupUtils.showError('Action failed. Please try again.');
        } finally {
          PopupUtils.setLoading(button, false);
        }
      };
    }
  });

  // Initialize error handling for async operations
  window.addEventListener('unhandledrejection', (event) => {
    PopupUtils.logError('Unhandled promise rejection:', event.reason);
    PopupUtils.showError('An unexpected error occurred.');
  });
});

// Export utilities for use in other scripts
window.PopupUtils = PopupUtils;
window.PageNavigation = PageNavigation;