class Messenger {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        // Авторизация
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('show-register').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('show-login').addEventListener('click', () => this.showLoginForm());

        // Чат
        document.getElementById('new-chat-btn').addEventListener('click', () => this.showSearchModal());
        document.getElementById('close-search-modal').addEventListener('click', () => this.hideSearchModal());
        document.getElementById('user-search-input').addEventListener('input', (e) => this.searchUsers(e.target.value));
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('search-btn').addEventListener('click', () => this.showSearchModal());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.token = data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.showApp();
                this.loadChats();
            } else {
                document.getElementById('login-error').textContent = data.error;
            }
        } catch (error) {
            document.getElementById('login-error').textContent = 'Ошибка подключения';
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.token = data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.showApp();
                this.loadChats();
            } else {
                document.getElementById('register-error').textContent = data.error;
            }
        } catch (error) {
            document.getElementById('register-error').textContent = 'Ошибка подключения';
        }
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            this.token = token;
            this.currentUser = JSON.parse(user);
            this.showApp();
            this.loadChats();
        }
    }

    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }

    showRegisterForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }

    async loadChats() {
        try {
            const response = await this.apiCall('/api/chats');
            if (!response) return;

            this.chats = await response.json();
            this.renderChats();
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
        }
    }

    renderChats() {
        const chatsList = document.getElementById('chats-list');
        chatsList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${chat.id === this.activeChatId ? 'active' : ''}`;
            chatElement.innerHTML = `
                <div class="chat-avatar">${chat.name.charAt(0)}</div>
                <div class="chat-info">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-preview">${chat.lastMessage || 'Нет сообщений'}</div>
                </div>
                ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
            `;
            chatElement.addEventListener('click', () => this.selectChat(chat));
            chatsList.appendChild(chatElement);
        });
    }

    async selectChat(chat) {
        this.activeChatId = chat.id;
        document.getElementById('current-chat-name').textContent = chat.name;
        document.getElementById('current-chat-status').textContent = chat.status;
        
        document.getElementById('message-input').disabled = false;
        document.getElementById('send-btn').disabled = false;

        await this.loadMessages(chat.id);
        this.renderChats();
    }

    async loadMessages(chatId) {
        try {
            const response = await this.apiCall(`/api/chats/${chatId}/messages`);
            if (!response) return;

            const messages = await response.json();
            this.renderMessages(messages);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }

    renderMessages(messages) {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = '';

        messages.forEach(message => {
            const isOutgoing = message.sender_id === this.currentUser.id;
            const messageElement = document.createElement('div');
            messageElement.className = `message message-${isOutgoing ? 'outgoing' : 'incoming'}`;
            messageElement.innerHTML = `
                ${message.text}
                <div class="message-time">
                    ${new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            `;
            chatContainer.appendChild(messageElement);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (!text || !this.activeChatId) return;

        try {
            const response = await this.apiCall(`/api/chats/${this.activeChatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });

            if (response) {
                input.value = '';
                this.loadMessages(this.activeChatId);
                this.loadChats();
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
        }
    }

    async searchUsers(query) {
        if (!query) {
            document.getElementById('user-search-results').innerHTML = '';
            return;
        }

        try {
            const response = await this.apiCall(`/api/users/search?query=${encodeURIComponent(query)}`);
            if (!response) return;

            const users = await response.json();
            this.renderSearchResults(users);
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }

    renderSearchResults(users) {
        const resultsContainer = document.getElementById('user-search-results');
        resultsContainer.innerHTML = '';

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-result';
            userElement.innerHTML = `
                <div class="user-avatar">${user.name.charAt(0)}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-username">@${user.username}</div>
                </div>
            `;
            userElement.addEventListener('click', () => this.startChat(user));
            resultsContainer.appendChild(userElement);
        });
    }

    async startChat(user) {
        try {
            const response = await this.apiCall('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id })
            });

            if (response) {
                this.hideSearchModal();
                this.loadChats();
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
        }
    }

    showSearchModal() {
        document.getElementById('search-modal').classList.add('active');
        document.getElementById('user-search-input').focus();
    }

    hideSearchModal() {
        document.getElementById('search-modal').classList.remove('active');
        document.getElementById('user-search-input').value = '';
        document.getElementById('user-search-results').innerHTML = '';
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];

        document.getElementById('app-container').style.display = 'none';
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }

    async apiCall(url, options = {}) {
        if (!this.token) {
            this.logout();
            return null;
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return response;
        } catch (error) {
            console.error('API call error:', error);
            return null;
        }
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    new Messenger();
});