class Messenger {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];
        this.userSettings = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
        this.loadSettings();
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
        
        // Настройки
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('close-settings-modal').addEventListener('click', () => this.hideSettingsModal());
        
        // Табы настроек
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });

        // Профиль
        document.getElementById('upload-avatar-btn').addEventListener('click', () => this.uploadAvatar());
        document.getElementById('avatar-upload').addEventListener('change', (e) => this.handleAvatarUpload(e));
        document.getElementById('save-profile-btn').addEventListener('click', () => this.saveProfile());

        // Внешний вид
        document.getElementById('window-opacity').addEventListener('input', (e) => this.updateOpacityValue(e.target.value));
        document.getElementById('save-appearance-btn').addEventListener('click', () => this.saveAppearanceSettings());

        // Фон
        document.getElementById('background-type').addEventListener('change', (e) => this.switchBackgroundType(e.target.value));
        document.querySelectorAll('.gradient-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGradient(e.target));
        });
        document.querySelectorAll('.gif-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGif(e.target.dataset.gif));
        });
        document.getElementById('solid-color').addEventListener('change', (e) => this.selectSolidColor(e.target.value));
        document.getElementById('save-background-btn').addEventListener('click', () => this.saveBackgroundSettings());
        document.getElementById('upload-background-btn').addEventListener('click', () => this.uploadBackground());
        document.getElementById('background-upload').addEventListener('change', (e) => this.handleBackgroundUpload(e));
    }

    // === АВТОРИЗАЦИЯ ===
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
                this.loadUserSettings();
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
                this.loadUserSettings();
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
            this.loadUserSettings();
        }
    }

    // === ОСНОВНОЙ ИНТЕРФЕЙС ===
    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        this.applySettings();
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
            
            const avatarStyle = chat.avatar ? `style="background-image: url(${chat.avatar})"` : '';
            chatElement.innerHTML = `
                <div class="chat-avatar" ${avatarStyle}>${chat.avatar ? '' : chat.name.charAt(0)}</div>
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

        if (messages.length === 0) {
            chatContainer.innerHTML = '<div class="welcome-message"><p>Нет сообщений. Начните общение!</p></div>';
            return;
        }

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

    // === ПОИСК И ЧАТЫ ===
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
            const avatarStyle = user.avatar ? `style="background-image: url(${user.avatar})"` : '';
            userElement.innerHTML = `
                <div class="user-avatar" ${avatarStyle}>${user.avatar ? '' : user.name.charAt(0)}</div>
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

    // === НАСТРОЙКИ ===
    async loadUserSettings() {
        try {
            const response = await this.apiCall('/api/settings');
            if (response) {
                this.userSettings = await response.json();
                this.applySettings();
                this.populateSettingsForm();
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    applySettings() {
        // Применяем настройки внешнего вида
        if (this.userSettings.windowOpacity) {
            this.applyWindowOpacity(this.userSettings.windowOpacity);
        }
        if (this.userSettings.fontSize) {
            document.documentElement.style.setProperty('--message-font-size', this.userSettings.fontSize);
        }
        if (this.userSettings.background) {
            this.applyBackground(this.userSettings.background);
        }
    }

    applyWindowOpacity(opacity) {
        document.querySelector('.chats-panel').style.opacity = opacity;
        document.querySelector('.messenger-container').style.opacity = opacity;
        document.getElementById('window-opacity').value = opacity;
        document.getElementById('opacity-value').textContent = Math.round(opacity * 100) + '%';
    }

    applyBackground(background) {
        if (background.type === 'gradient') {
            document.body.style.background = background.value;
            document.body.style.backgroundSize = 'cover';
        } else if (background.type === 'solid') {
            document.body.style.background = background.value;
        } else if (background.type === 'gif') {
            document.body.style.background = `url(${background.value})`;
            document.body.style.backgroundSize = 'cover';
        } else if (background.type === 'image') {
            document.body.style.background = `url(${background.value})`;
            document.body.style.backgroundSize = 'cover';
        }
    }

    populateSettingsForm() {
        // Заполняем форму профиля
        if (this.currentUser) {
            document.getElementById('profile-name').value = this.currentUser.name || '';
            document.getElementById('profile-status').value = this.currentUser.status || '';
            document.getElementById('profile-username').value = this.currentUser.username || '';
            
            // Устанавливаем аватар
            const avatarPreview = document.getElementById('avatar-preview');
            if (this.currentUser.avatar) {
                avatarPreview.style.backgroundImage = `url(${this.currentUser.avatar})`;
                avatarPreview.innerHTML = '';
            } else {
                avatarPreview.style.backgroundImage = 'none';
                avatarPreview.innerHTML = '<div class="avatar-placeholder">' + (this.currentUser.name?.charAt(0) || '?') + '</div>';
            }
        }

        // Заполняем настройки внешнего вида
        if (this.userSettings.windowOpacity) {
            this.applyWindowOpacity(this.userSettings.windowOpacity);
        }
        if (this.userSettings.fontSize) {
            document.getElementById('font-size').value = this.userSettings.fontSize;
        }
        if (this.userSettings.colorTheme) {
            document.getElementById('color-theme').value = this.userSettings.colorTheme;
        }
    }

    showSettingsModal() {
        document.getElementById('settings-modal').classList.add('active');
        this.populateSettingsForm();
    }

    hideSettingsModal() {
        document.getElementById('settings-modal').classList.remove('active');
    }

    switchSettingsTab(tabName) {
        // Скрываем все табы
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Показываем выбранный таб
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    // === ПРОФИЛЬ ===
    uploadAvatar() {
        document.getElementById('avatar-upload').click();
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarPreview = document.getElementById('avatar-preview');
                avatarPreview.style.backgroundImage = `url(${e.target.result})`;
                avatarPreview.innerHTML = '';
                
                // Сохраняем аватар в настройках
                this.userSettings.avatar = e.target.result;
                this.saveSettings();
            };
            reader.readAsDataURL(file);
        }
    }

    async saveProfile() {
        const name = document.getElementById('profile-name').value;
        const status = document.getElementById('profile-status').value;
        const avatar = this.userSettings.avatar || this.currentUser.avatar;

        try {
            const response = await this.apiCall('/api/profile', {
                method: 'PUT',
                body: JSON.stringify({ name, status, avatar })
            });

            if (response) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.hideSettingsModal();
                this.loadChats(); // Обновляем список чатов с новым именем
            }
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
        }
    }

    // === ВНЕШНИЙ ВИД ===
    updateOpacityValue(value) {
        document.getElementById('opacity-value').textContent = Math.round(value * 100) + '%';
        this.applyWindowOpacity(value);
    }

    async saveAppearanceSettings() {
        const opacity = document.getElementById('window-opacity').value;
        const fontSize = document.getElementById('font-size').value;
        const colorTheme = document.getElementById('color-theme').value;

        this.userSettings.windowOpacity = opacity;
        this.userSettings.fontSize = fontSize;
        this.userSettings.colorTheme = colorTheme;

        await this.saveSettings();
        this.hideSettingsModal();
    }

    // === ФОН ===
    switchBackgroundType(type) {
        document.querySelectorAll('.background-options').forEach(el => {
            el.style.display = 'none';
        });
        document.getElementById(`${type}-options`).style.display = 'block';
    }

    selectGradient(element) {
        document.querySelectorAll('.gradient-option').forEach(opt => {
            opt.classList.remove('active');
        });
        element.classList.add('active');
    }

    selectGif(gifUrl) {
        document.getElementById('gif-url').value = gifUrl;
    }

    selectSolidColor(color) {
        // Цвет уже выбран в input[type=color]
    }

    async saveBackgroundSettings() {
        const type = document.getElementById('background-type').value;
        let backgroundValue = '';

        if (type === 'gradient') {
            const activeGradient = document.querySelector('.gradient-option.active');
            backgroundValue = activeGradient?.dataset.gradient || 'linear-gradient(135deg, #1a1a2e, #16213e)';
        } else if (type === 'solid') {
            backgroundValue = document.getElementById('solid-color').value;
        } else if (type === 'gif') {
            backgroundValue = document.getElementById('gif-url').value;
        } else if (type === 'image') {
            backgroundValue = this.userSettings.backgroundImage || '';
        }

        this.userSettings.background = {
            type: type,
            value: backgroundValue
        };

        await this.saveSettings();
        this.applyBackground(this.userSettings.background);
        this.hideSettingsModal();
    }

    uploadBackground() {
        document.getElementById('background-upload').click();
    }

    handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.userSettings.backgroundImage = e.target.result;
                document.getElementById('background-type').value = 'image';
                this.switchBackgroundType('image');
            };
            reader.readAsDataURL(file);
        }
    }

    // === СИСТЕМНЫЕ ФУНКЦИИ ===
    async saveSettings() {
        try {
            await this.apiCall('/api/settings', {
                method: 'POST',
                body: JSON.stringify(this.userSettings)
            });
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];
        this.userSettings = {};

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
