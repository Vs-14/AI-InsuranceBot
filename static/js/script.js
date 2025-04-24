// static/js/script.js
document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const faqBtns = document.querySelectorAll('.faq-btn');
    const humanBtn = document.querySelector('.human-btn');
    
    // Chat history array
    let chatHistory = [];
    
    // Function to scroll to bottom of chat
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Function to add message to chat
    function addMessageToChat(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message assistant-message';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isUser) {
            messageContent.textContent = content;
        } else {
            // Use marked.js to render markdown
            const markdownContent = document.createElement('div');
            markdownContent.className = 'markdown-body';
            markdownContent.innerHTML = marked.parse(content);
            messageContent.appendChild(markdownContent);
        }
        
        messageDiv.appendChild(messageContent);
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        scrollToBottom();
        
        // Add to chat history
        chatHistory.push({
            role: isUser ? 'user' : 'assistant',
            content: content
        });
    }
    
    // Function to add typing indicator
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingDiv.appendChild(dot);
        }
        
        chatContainer.appendChild(typingDiv);
        scrollToBottom();
    }
    
    // Function to remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Function to send message
    function sendMessage(message) {
        if (!message.trim()) return;
        
        // Add user message to chat
        addMessageToChat(message, true);
        
        // Clear input
        userInput.value = '';
        
        // Focus on input field for next message
        userInput.focus();
        
        // Show typing indicator
        addTypingIndicator();
        
        // Send message to server
        fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add AI response with simulated typing
            simulateTyping(data.response);
        })
        .catch(error => {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessageToChat('Sorry, there was an error processing your request. Please try again.', false);
        });
    }
    
    // Function to simulate typing effect for AI responses
    function simulateTyping(message, index = 0, currentText = '') {
        // Create or get a temporary message element
        let tempMessage = document.getElementById('temp-message');
        
        if (!tempMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant-message';
            
            tempMessage = document.createElement('div');
            tempMessage.className = 'message-content';
            tempMessage.id = 'temp-message';
            
            const markdownContent = document.createElement('div');
            markdownContent.className = 'markdown-body';
            markdownContent.id = 'temp-markdown';
            tempMessage.appendChild(markdownContent);
            
            messageDiv.appendChild(tempMessage);
            chatContainer.appendChild(messageDiv);
            
            // Make sure we scroll to see the new message
            scrollToBottom();
        }
        
        // Simulate typing by adding one character at a time
        if (index < message.length) {
            currentText += message[index];
            document.getElementById('temp-markdown').innerHTML = marked.parse(currentText + '▌');
            scrollToBottom();
            
            // Random typing speed between 10ms and 50ms
            const typingSpeed = Math.floor(Math.random() * 40) + 10;
            setTimeout(() => simulateTyping(message, index + 1, currentText), typingSpeed);
        } else {
            // Typing finished, remove the temp ID
            document.getElementById('temp-markdown').innerHTML = marked.parse(message);
            tempMessage.removeAttribute('id');
            document.getElementById('temp-markdown').removeAttribute('id');
            
            // Add to chat history
            chatHistory.push({
                role: 'assistant',
                content: message
            });
            
            // Final scroll to bottom
            scrollToBottom();
        }
    }
    
    // Function to handle FAQ button clicks
    function handleFaqClick(faqType) {
        let faqQuestion;
        
        switch(faqType) {
            case 'health':
                faqQuestion = 'Tell me about health insurance';
                break;
            case 'claim':
                faqQuestion = 'How do I file a claim?';
                break;
            case 'premium':
                faqQuestion = 'What affects premium costs?';
                break;
            case 'human':
                faqQuestion = 'I want to talk to a human agent';
                break;
            default:
                return;
        }
        
        // Add user message to chat
        addMessageToChat(faqQuestion, true);
        
        // Show typing indicator
        addTypingIndicator();
        
        // Get FAQ response
        fetch('/api/faq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: faqType })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add response with simulated typing
            simulateTyping(data.response);
        })
        .catch(error => {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessageToChat('Sorry, there was an error processing your request. Please try again.', false);
        });
    }
    
    // Event listeners
    sendBtn.addEventListener('click', () => {
        sendMessage(userInput.value);
    });
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(userInput.value);
        }
    });
    
    faqBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handleFaqClick(btn.getAttribute('data-faq-type'));
        });
    });
    
    humanBtn.addEventListener('click', () => {
        handleFaqClick('human');
    });
    
    // Add welcome message when page loads
    setTimeout(() => {
        addMessageToChat("Hello! I'm InsuranceBot, your insurance assistant. How can I help you today with your insurance questions?", false);
    }, 500);
    
    // Set focus on the input field when page loads
    userInput.focus();
});