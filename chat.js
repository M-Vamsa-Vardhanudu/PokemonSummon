// chat.js

const socket = io(); // Initialize Socket.IO client
const chatInput = document.getElementById('chatInput'); // Get the message input field
const chatMessages = document.getElementById('chatMessages'); // Get the <ul> to display messages

// Helper function to add a message to the chat UI
function addChatMessageToUI({ user, message, timestamp }) {
    const msgItem = document.createElement('li');
    msgItem.innerHTML = `[${timestamp}] <strong>${user}:</strong> ${message}`;
    chatMessages.appendChild(msgItem);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the bottom
}

// Show incoming messages (real-time from WebSocket)
socket.on('chat message', (data) => {
    addChatMessageToUI(data);
});

// Send a message
window.sendChat = function() {
    const message = chatInput.value.trim();

    if (message) {
        socket.emit('chat message', message); 
        chatInput.value = ''; 
    }
};

// Send message on Enter key press
chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        window.sendChat();
    }
});

// --- Socket.IO Connection Status Handlers and History Loading ---

// Handle successful connection
socket.on('connect', async () => {
    console.log('Socket.IO connected! Attempting to load chat history...');
    
    // Clear existing messages before loading history
    chatMessages.innerHTML = '';

    // Add a status message for connection
    const statusItem = document.createElement('li');
    statusItem.style.color = 'green';
    statusItem.textContent = 'You are connected to global chat.';
    chatMessages.appendChild(statusItem);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Fetch chat history from the server
        const response = await fetch('/api/chat-history');
        const data = await response.json();

        if (data.success && data.history) {
            console.log('Chat history loaded:', data.history.length, 'messages.');
            // Add historical messages to the UI
            data.history.forEach(msg => {
                addChatMessageToUI(msg);
            });
        } else {
            console.error('Failed to load chat history:', data.message || 'Unknown error');
            const errorItem = document.createElement('li');
            errorItem.style.color = 'red';
            errorItem.textContent = 'Failed to load chat history.';
            chatMessages.appendChild(errorItem);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching chat history:', error);
        const errorItem = document.createElement('li');
        errorItem.style.color = 'red';
        errorItem.textContent = 'Error fetching chat history. Check server connection.';
        chatMessages.appendChild(errorItem);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Handle connection errors
socket.on('connect_error', (err) => {
    console.error('Socket.IO connection error:', err.message);
    const errorItem = document.createElement('li');
    errorItem.style.color = 'red';
    errorItem.textContent = `Chat connection error: ${err.message}. Please try logging in again.`;
    chatMessages.appendChild(errorItem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Handle disconnects
socket.on('disconnect', (reason) => {
    console.log('Socket.IO disconnected:', reason);
    const disconnectItem = document.createElement('li');
    disconnectItem.style.color = 'orange';
    disconnectItem.textContent = `Disconnected from chat: ${reason}.`;
    chatMessages.appendChild(disconnectItem);
    chatMessages.scrollTop = chatMessages.scrollTop; // Auto-scroll to bottom
});
