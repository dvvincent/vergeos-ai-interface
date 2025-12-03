// Configuration
const API_BASE = '';  // Same origin
const DEFAULT_MODEL = 'Gemma-3';
const MAX_FILE_SIZE = 100 * 1024; // 100KB limit for file uploads
const MAX_CONTENT_LENGTH = 4000; // Max chars to send to AI
const MAX_LINES = 50; // Max lines to include from file
let conversationHistory = [];
let currentAbortController = null;
let selectedModel = DEFAULT_MODEL;
let availableModels = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadModels();
    checkHealth();
    setupAutoResize();
    loadConversationHistory();
    updateCharCount();
});

// Theme management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

// File attachment handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB.`);
        event.target.value = '';
        return;
    }
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        
        // Truncate if too long (limit to ~50 lines or 4000 chars for safety)
        const lines = content.split('\n');
        let truncatedContent = content;
        let truncated = false;
        
        if (lines.length > 50) {
            truncatedContent = lines.slice(0, 50).join('\n');
            truncated = true;
        }
        if (truncatedContent.length > 4000) {
            truncatedContent = truncatedContent.substring(0, 4000);
            truncated = true;
        }
        
        // Insert file content into textarea
        const messageInput = document.getElementById('messageInput');
        const fileBlock = `Here is the content of ${file.name}:\n\n\`\`\`\n${truncatedContent}\n\`\`\`${truncated ? '\n\n(File truncated - showing first portion)' : ''}\n\nPlease analyze this file.`;
        
        messageInput.value = fileBlock;
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
        updateCharCount();
        messageInput.focus();
        
        // Clear file input
        event.target.value = '';
        
        if (truncated) {
            alert('File was truncated to fit within limits. You can edit the content in the text area before sending.');
        }
    };
    reader.onerror = () => {
        alert('Failed to read file');
        event.target.value = '';
    };
    reader.readAsText(file);
}

function showFilePreview() {
    // No longer used - content goes directly to textarea
}

function removeFile() {
    // No longer used - content is in textarea
    document.getElementById('fileInput').value = '';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Load available models from API
async function loadModels() {
    const modelSelect = document.getElementById('modelSelect');
    
    try {
        const response = await fetch(`${API_BASE}/api/models`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Models API response:', data);
        
        // Handle both direct array and wrapped response
        const modelList = data.data || data;
        
        if (Array.isArray(modelList) && modelList.length > 0) {
            availableModels = modelList.map(m => m.id || m);
            
            // Clear and populate dropdown
            modelSelect.innerHTML = '';
            availableModels.forEach(modelId => {
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelId;
                modelSelect.appendChild(option);
            });
            
            // Restore saved model preference or use first available
            const savedModel = localStorage.getItem('selectedModel');
            if (savedModel && availableModels.includes(savedModel)) {
                selectedModel = savedModel;
            } else {
                selectedModel = availableModels[0];
            }
            modelSelect.value = selectedModel;
            
            console.log('Models loaded:', availableModels);
            if (data.fallback) {
                console.log('Using fallback model list');
            }
        } else {
            console.warn('No models in response, using default');
            throw new Error('No models returned');
        }
    } catch (error) {
        console.error('Failed to load models:', error);
        // Default to Gemma-3
        modelSelect.innerHTML = `<option value="${DEFAULT_MODEL}">${DEFAULT_MODEL}</option>`;
        selectedModel = DEFAULT_MODEL;
        availableModels = [DEFAULT_MODEL];
        modelSelect.value = DEFAULT_MODEL;
    }
    
    updateWelcomeModel();
}

// Handle model selection change
function onModelChange() {
    const modelSelect = document.getElementById('modelSelect');
    selectedModel = modelSelect.value;
    localStorage.setItem('selectedModel', selectedModel);
    updateWelcomeModel();
    console.log('Model changed to:', selectedModel);
}

// Update welcome message with current model
function updateWelcomeModel() {
    const welcomeModelText = document.querySelector('.welcome-message p strong');
    if (welcomeModelText) {
        welcomeModelText.textContent = selectedModel;
    }
}

// Check server health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        
        document.getElementById('status').innerHTML = `
            <span class="status-dot"></span>
            <span>Connected</span>
        `;
        
        console.log('Server health:', data);
    } catch (error) {
        document.getElementById('status').innerHTML = `
            <span class="status-dot" style="background: #ef4444;"></span>
            <span>Disconnected</span>
        `;
        console.error('Health check failed:', error);
    }
}

// Setup textarea auto-resize
function setupAutoResize() {
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
        updateCharCount();
    });
}

// Update character count
function updateCharCount() {
    const textarea = document.getElementById('messageInput');
    const count = textarea.value.length;
    document.getElementById('charCount').textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

// Handle Enter key
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send quick message
function sendQuickMessage(message) {
    document.getElementById('messageInput').value = message;
    sendMessage();
}

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Hide welcome message
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    // Add user message to chat
    addMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateCharCount();
    
    // Disable send button, enable stop button
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    
    // Check if streaming is enabled
    const streamingEnabled = document.getElementById('streamingToggle').checked;
    
    try {
        if (streamingEnabled) {
            await sendStreamingRequest();
        } else {
            await sendRegularRequest();
        }
    } finally {
        // Re-enable send button, hide stop button
        sendBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        currentAbortController = null;
    }
    
    // Save conversation
    saveConversationHistory();
}

// Send regular (non-streaming) request
async function sendRegularRequest() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                model: selectedModel
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        typingIndicator.classList.remove('active');
        
        if (data.error) {
            addErrorMessage(data.error);
        } else {
            addMessage('assistant', data.message);
            conversationHistory.push({ role: 'assistant', content: data.message });
        }
        
    } catch (error) {
        typingIndicator.classList.remove('active');
        addErrorMessage(`Failed to get response: ${error.message}`);
        console.error('Chat error:', error);
    }
}

// Send streaming request
async function sendStreamingRequest() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.classList.add('active');
    
    // Create abort controller for this request
    currentAbortController = new AbortController();
    
    try {
        const response = await fetch(`${API_BASE}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                model: selectedModel
            }),
            signal: currentAbortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        typingIndicator.classList.remove('active');
        
        // Create assistant message container
        const messageDiv = createMessageElement('assistant', '');
        const contentDiv = messageDiv.querySelector('.message-content');
        let fullContent = '';
        let usageStats = null;
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                        continue;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.error) {
                            addErrorMessage(parsed.error);
                            messageDiv.remove();
                            return;
                        }
                        
                        if (parsed.content) {
                            fullContent += parsed.content;
                            contentDiv.innerHTML = formatMessage(fullContent);
                            scrollToBottom();
                        }
                        
                        if (parsed.usage) {
                            usageStats = parsed.usage;
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }
        
        // Add usage stats if available
        if (usageStats) {
            const statsHtml = `
                <div class="usage-stats">
                    <div class="stats-row">
                        <span class="stat-item">⚡ ${usageStats.tokens_per_second} tokens/s</span>
                        <span class="stat-item">📊 ${usageStats.completion_tokens} tokens</span>
                        <span class="stat-item">⏱️ ${usageStats.total_time}s</span>
                        ${usageStats.time_to_first_token ? `<span class="stat-item">🚀 ${usageStats.time_to_first_token}s TTFT</span>` : ''}
                    </div>
                </div>
            `;
            contentDiv.innerHTML = formatMessage(fullContent) + statsHtml;
        }
        
        // Add copy button after streaming completes
        const messageWrapper = messageDiv.querySelector('.message-wrapper');
        if (messageWrapper && fullContent) {
            const copyBtn = createCopyButton(fullContent);
            messageWrapper.appendChild(copyBtn);
        }
        
        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: fullContent });
        
    } catch (error) {
        typingIndicator.classList.remove('active');
        if (error.name === 'AbortError') {
            // Don't show error for user-initiated cancellation
            console.log('Request cancelled by user');
        } else {
            addErrorMessage(`Failed to get response: ${error.message}`);
            console.error('Streaming error:', error);
        }
    }
}

// Stop current request
function stopRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
}

// Create message element
function createMessageElement(role, content) {
    const chatContainer = document.getElementById('chatContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-wrapper';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMessage(content);
    
    contentWrapper.appendChild(contentDiv);
    
    // Add copy button for assistant messages
    if (role === 'assistant' && content) {
        const copyBtn = createCopyButton(content);
        contentWrapper.appendChild(copyBtn);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentWrapper);
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// Create copy button for messages
function createCopyButton(content) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.title = 'Copy response to clipboard';
    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(content);
            copyBtn.innerHTML = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = '📋 Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            copyBtn.innerHTML = '❌ Failed';
            setTimeout(() => {
                copyBtn.innerHTML = '📋 Copy';
            }, 2000);
        }
    };
    return copyBtn;
}

// Add message to chat
function addMessage(role, content) {
    createMessageElement(role, content);
}

// Add error message
function addErrorMessage(error) {
    const chatContainer = document.getElementById('chatContainer');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `Error: ${error}`;
    
    chatContainer.appendChild(errorDiv);
    scrollToBottom();
}

// Format message content (handle code blocks, etc.)
function formatMessage(content) {
    // Escape HTML
    let formatted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Format code blocks (```language\ncode\n```)
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // Format inline code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Format bold (**text**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format italic (*text*)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Format line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Scroll to bottom
function scrollToBottom() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Clear chat
function clearChat() {
    if (confirm('Are you sure you want to clear the conversation?')) {
        conversationHistory = [];
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🚀</div>
                <h2>Welcome to VergeOS AI Assistant</h2>
                <p>I'm powered by <strong>qwen3-coder-14B</strong> running on your VergeOS instance.</p>
                <p>Ask me anything about coding, infrastructure, or general questions!</p>
                
                <div class="quick-actions">
                    <button onclick="sendQuickMessage('Explain what VergeOS is')">What is VergeOS?</button>
                    <button onclick="sendQuickMessage('Write a Python script to list files')">Python Script</button>
                    <button onclick="sendQuickMessage('Explain Kubernetes pods')">Kubernetes Help</button>
                    <button onclick="sendQuickMessage('Write a bash script for backups')">Bash Script</button>
                </div>
            </div>
        `;
        saveConversationHistory();
    }
}

// Save conversation to localStorage
function saveConversationHistory() {
    try {
        localStorage.setItem('vergeosConversation', JSON.stringify(conversationHistory));
    } catch (e) {
        console.error('Failed to save conversation:', e);
    }
}

// Load conversation from localStorage
function loadConversationHistory() {
    try {
        const saved = localStorage.getItem('vergeosConversation');
        if (saved) {
            conversationHistory = JSON.parse(saved);
            
            // Restore messages to UI
            if (conversationHistory.length > 0) {
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.style.display = 'none';
                }
                
                conversationHistory.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
            }
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
    }
}
