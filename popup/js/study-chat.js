document.addEventListener('DOMContentLoaded', function() {
  const chatContainer = document.getElementById('chat-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

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
    sendButton.disabled = true;
    sendButton.textContent = 'Thinking...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'askStudyQuestion',
        question: message
      });

      addMessage(response?.success ? response.answer : 'Sorry, I couldn\'t process your question. Please try again.');
    } catch (error) {
      addMessage('Error connecting to study helper. Please try again.');
    }

    sendButton.disabled = false;
    sendButton.textContent = 'Send';
  }

  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());
});