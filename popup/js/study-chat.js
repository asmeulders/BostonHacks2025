document.addEventListener('DOMContentLoaded', function() {
  const chatContainer = document.getElementById('chat-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  // Auto-focus input field
  messageInput.focus();

  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message and reset input
    addMessage(message, true);
    messageInput.value = '';
    messageInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Thinking...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'askStudyQuestion',
        question: message
      });

      if (response?.success) {
        addMessage(response.answer);
      } else {
        addMessage('Sorry, I couldn\'t process your question. Please try again.');
      }
    } catch (error) {
      console.error('Study chat error:', error);
      addMessage('Error connecting to study helper. Please try again.');
    }

    messageInput.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
    messageInput.focus();
  }

  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());
});