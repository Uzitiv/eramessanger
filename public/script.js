class Messenger {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];
        this.userSettings = {};
        this.searchTimeout = null;
        
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
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Чат
        document.getElementById('new-chat-btn').addEventListener('click', () => this.showSearchModal());
        document.getElementById('close-search-modal').addEventListener('click', () => this.hideSearchModal());
        document.getElementById('user-search-input').addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('search-btn').addEventListener('click', () => this.showSearchModal());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Настройки
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
        document.getElementById('window-opacity').addEventListener('input', (e) => this.updateOpacityPreview(e.target.value));
        document.getElementById('save-appearance-btn').addEventListener('click', () => this.saveAppearanceSettings());

        // Фон
        document.getElementById('background-type').addEventListener('change', (e) => this.switchBackgroundType(e.target.value));
        document.querySelectorAll('.gradient-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGradient(e.target));
        });
        document.querySelectorAll('.gif-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGif(e.target));
        });
        document.getElementById('solid-color').addEventListener('change', (e) => this.previewSolidColor(e.target.value));
        document.getElementById('save-background-btn').addEventListener('click', () => this.saveBackgroundSettings());
        document.getElementById('upload-background-btn').addEventListener('click', () => this.uploadBackground());
        document.getElementById('background-upload').addEventListener('change', (e) => this.handleBackgroundUpload(e));
    }

    // ==================== АВТОРИЗАЦИЯ ====================
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showError('login-error', 'Заполните все поля');
            return;
        }

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
                await this.loadChats();
                await this.loadUserSettings();
                this.hideError('login-error');
            } else {
                this.showError('login-error', data.error);
            }
        } catch (error) {
            this.showError('login-error', 'Ошибка подключения к серверу');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;

        if (!name || !username || !password) {
            this.showError('register-error', 'Заполните все поля');
            return;
        }

        if (username.length < 3) {
            this.showError('register-error', 'Username должен содержать минимум 3 символа');
            return;
        }

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
                await this.loadChats();
                await this.loadUserSettings();
                this.hideError('register-error');
            } else {
                this.showError('register-error', data.error);
            }
        } catch (error) {
            this.showError('register-error', 'Ошибка подключения к серверу');
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(elementId) {
        const element = document.getElementById(elementId);
        element.textContent = '';
        element.style.display = 'none';
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

    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        this.hideError('register-error');
    }

    showRegisterForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        this.hideError('login-error');
    }

    // ==================== ЧАТЫ И СООБЩЕНИЯ ====================
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
        const noChats = document.getElementById('no-chats');
        
        if (this.chats.length === 0) {
            chatsList.innerHTML = '';
            chatsList.appendChild(noChats);
            noChats.style.display = 'block';
            return;
        }

        noChats.style.display = 'none';
        chatsList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${chat.id === this.activeChatId ? 'active' : ''}`;
            
            const avatarStyle = chat.avatar ? `style="background-image: url(${chat.avatar})"` : '';
            const lastMessage = chat.lastMessage ? 
                (chat.lastMessage.length > 30 ? chat.lastMessage.substring(0, 30) + '...' : chat.lastMessage) : 
                'Нет сообщений';
                
            chatElement.innerHTML = `
                <div class="chat-avatar" ${avatarStyle}>
                    ${chat.avatar ? '' : chat.name.charAt(0)}
                </div>
                <div class="chat-info">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-preview">${lastMessage}</div>
                </div>
                ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
            `;
            
            chatElement.addEventListener('click', () => this.selectChat(chat));
            chatsList.appendChild(chatElement);
        });
    }

    async selectChat(chat) {
        this.activeChatId = chat.id;
        
        // Обновляем заголовок
        document.getElementById('current-chat-name').textContent = chat.name;
        document.getElementById('current-chat-status').textContent = chat.status;
        
        // Активируем поле ввода
        document.getElementById('message-input').disabled = false;
        document.getElementById('send-btn').disabled = false;
        document.getElementById('message-input').placeholder = `Сообщение для ${chat.name}...`;

        // Загружаем сообщения
        await this.loadMessages(chat.id);
        
        // Обновляем список чатов (подсветка активного)
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
            chatContainer.innerHTML = `
                <div class="welcome-message">
                    <h3>💬 Начните общение!</h3>
                    <p>Это начало вашей беседы</p>
                    <p>Напишите первое сообщение</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message message-${message.type}`;
            messageElement.innerHTML = `
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-time">
                    ${new Date(message.time).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            `;
            chatContainer.appendChild(messageElement);
        });

        // Прокрутка к последнему сообщению
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                await this.loadMessages(this.activeChatId);
                await this.loadChats(); // Обновляем список чатов
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            alert('Ошибка отправки сообщения');
        }
    }

    // ==================== ПОИСК ПОЛЬЗОВАТЕЛЕЙ ====================
    handleSearchInput(query) {
        // Дебаунс поиска
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchUsers(query);
        }, 300);
    }

    async searchUsers(query) {
        const resultsContainer = document.getElementById('user-search-results');
        
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '<div class="no-results">Введите минимум 2 символа для поиска</div>';
            return;
        }

        try {
            const response = await this.apiCall(`/api/users/search?query=${encodeURIComponent(query)}`);
            if (!response) return;

            const users = await response.json();
            this.renderSearchResults(users);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            resultsContainer.innerHTML = '<div class="no-results">Ошибка поиска</div>';
        }
    }

    renderSearchResults(users) {
        const resultsContainer = document.getElementById('user-search-results');
        
        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Пользователи не найдены</div>';
            return;
        }

        resultsContainer.innerHTML = '';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-result';
            
            const avatarStyle = user.avatar ? `style="background-image: url(${user.avatar})"` : '';
            userElement.innerHTML = `
                <div class="user-avatar" ${avatarStyle}>
                    ${user.avatar ? '' : user.name.charAt(0)}
                </div>
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
                const result = await response.json();
                this.hideSearchModal();
                await this.loadChats();
                
                // Если чат создан, выбираем его
                if (result.id) {
                    const newChat = this.chats.find(chat => chat.id === result.id);
                    if (newChat) {
                        this.selectChat(newChat);
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            alert('Ошибка создания чата');
        }
    }

    showSearchModal() {
        document.getElementById('search-modal').classList.add('active');
        document.getElementById('user-search-input').value = '';
        document.getElementById('user-search-input').focus();
        document.getElementById('user-search-results').innerHTML = '<div class="no-results">Начните вводить запрос для поиска</div>';
    }

    hideSearchModal() {
        document.getElementById('search-modal').classList.remove('active');
    }

    // ==================== НАСТРОЙКИ ====================
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
            // Устанавливаем настройки по умолчанию
            this.userSettings = {
                windowOpacity: 0.9,
                fontSize: '14px',
                background: {
                    type: 'gradient',
                    value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
                }
            };
            this.applySettings();
        }
    }

    applySettings() {
        // Прозрачность окон
        if (this.userSettings.windowOpacity !== undefined) {
            this.applyWindowOpacity(this.userSettings.windowOpacity);
        }

        // Размер шрифта
        if (this.userSettings.fontSize) {
            document.documentElement.style.setProperty('--message-font-size', this.userSettings.fontSize);
        }

        // Фон
        if (this.userSettings.background) {
            this.applyBackground(this.userSettings.background);
        }
    }

    applyWindowOpacity(opacity) {
        const chatsPanel = document.querySelector('.chats-panel');
        const messengerContainer = document.querySelector('.messenger-container');
        
        if (chatsPanel) chatsPanel.style.opacity = opacity;
        if (messengerContainer) messengerContainer.style.opacity = opacity;
        
        // Обновляем значение в слайдере
        const opacitySlider = document.getElementById('window-opacity');
        const opacityValue = document.getElementById('opacity-value');
        
        if (opacitySlider) opacitySlider.value = opacity;
        if (opacityValue) opacityValue.textContent = Math.round(opacity * 100) + '%';
    }

    applyBackground(background) {
        if (!background) return;

        const body = document.body;
        
        switch (background.type) {
            case 'gradient':
                body.style.background = background.value;
                body.style.backgroundSize = 'cover';
                body.className = 'bg-gradient-custom';
                break;
            case 'solid':
                body.style.background = background.value;
                body.style.backgroundSize = 'cover';
                body.className = '';
                break;
            case 'gif':
                body.style.background = `url(${background.value})`;
                body.style.backgroundSize = 'cover';
                body.className = 'bg-gif';
                break;
            case 'image':
                body.style.background = `url(${background.value})`;
                body.style.backgroundSize = 'cover';
                body.className = 'bg-image';
                break;
        }
    }

    populateSettingsForm() {
        if (!this.currentUser) return;

        // Заполняем данные профиля
        document.getElementById('profile-name').value = this.currentUser.name || '';
        document.getElementById('profile-status').value = this.currentUser.status || 'в сети';
        document.getElementById('profile-username').value = this.currentUser.username || '';

        // Аватар
        const avatarPreview = document.getElementById('avatar-preview');
        if (this.currentUser.avatar) {
            avatarPreview.style.backgroundImage = `url(${this.currentUser.avatar})`;
            avatarPreview.innerHTML = '';
        } else {
            avatarPreview.style.backgroundImage = 'none';
            avatarPreview.innerHTML = '<div class="avatar-placeholder">' + (this.currentUser.name?.charAt(0) || '?') + '</div>';
        }

        // Настройки внешнего вида
        if (this.userSettings.windowOpacity !== undefined) {
            document.getElementById('window-opacity').value = this.userSettings.windowOpacity;
            document.getElementById('opacity-value').textContent = Math.round(this.userSettings.windowOpacity * 100) + '%';
        }

        if (this.userSettings.fontSize) {
            document.getElementById('font-size').value = this.userSettings.fontSize;
        }

        // Настройки фона
        if (this.userSettings.background) {
            document.getElementById('background-type').value = this.userSettings.background.type;
            this.switchBackgroundType(this.userSettings.background.type);
            
            // Устанавливаем активные опции в зависимости от типа фона
            switch (this.userSettings.background.type) {
                case 'gradient':
                    const activeGradient = document.querySelector(`.gradient-option[data-gradient="${this.userSettings.background.value}"]`);
                    if (activeGradient) {
                        document.querySelectorAll('.gradient-option').forEach(opt => opt.classList.remove('active'));
                        activeGradient.classList.add('active');
                    }
                    break;
                case 'solid':
                    document.getElementById('solid-color').value = this.userSettings.background.value;
                    break;
                case 'gif':
                    document.getElementById('gif-url').value = this.userSettings.background.value;
                    break;
            }
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

    // ==================== ПРОФИЛЬ ====================
    uploadAvatar() {
        document.getElementById('avatar-upload').click();
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('avatar-preview');
            avatarPreview.style.backgroundImage = `url(${e.target.result})`;
            avatarPreview.innerHTML = '';
            
            // Сохраняем данные аватарки для отправки на сервер
            this.avatarData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async saveProfile() {
        const name = document.getElementById('profile-name').value.trim();
        const status = document.getElementById('profile-status').value.trim();

        if (!name) {
            alert('Введите имя');
            return;
        }

        try {
            const response = await this.apiCall('/api/profile', {
                method: 'PUT',
                body: JSON.stringify({ 
                    name, 
                    status: status || 'в сети',
                    avatar: this.avatarData || this.currentUser.avatar 
                })
            });

            if (response) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                
                // Обновляем аватар в интерфейсе
                const avatarPreview = document.getElementById('avatar-preview');
                if (this.currentUser.avatar) {
                    avatarPreview.style.backgroundImage = `url(${this.currentUser.avatar})`;
                    avatarPreview.innerHTML = '';
                }
                
                this.hideSettingsModal();
                await this.loadChats(); // Обновляем список чатов с новым именем
                alert('Профиль успешно обновлен!');
            }
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            alert('Ошибка сохранения профиля');
        }
    }

    // ==================== ВНЕШНИЙ ВИД ====================
    updateOpacityPreview(value) {
        document.getElementById('opacity-value').textContent = Math.round(value * 100) + '%';
        this.applyWindowOpacity(value);
    }

    async saveAppearanceSettings() {
        const opacity = parseFloat(document.getElementById('window-opacity').value);
        const fontSize = document.getElementById('font-size').value;

        this.userSettings.windowOpacity = opacity;
        this.userSettings.fontSize = fontSize;

        await this.saveSettings();
        this.applySettings();
        alert('Настройки внешнего вида применены!');
    }

    // ==================== ФОН ====================
    switchBackgroundType(type) {
        // Скрываем все опции
        document.querySelectorAll('.background-options').forEach(el => {
            el.style.display = 'none';
        });
        
        // Показываем выбранные опции
        const optionsElement = document.getElementById(`${type}-options`);
        if (optionsElement) {
            optionsElement.style.display = 'block';
        }
    }

    selectGradient(element) {
        document.querySelectorAll('.gradient-option').forEach(opt => {
            opt.classList.remove('active');
        });
        element.classList.add('active');
        
        // Предпросмотр
        const gradient = element.dataset.gradient;
        document.body.style.background = gradient;
        document.body.style.backgroundSize = 'cover';
    }

    selectGif(element) {
        const gifUrl = element.dataset.gif;
        document.getElementById('gif-url').value = gifUrl;
        
        // Предпросмотр
        document.body.style.background = `url(${gifUrl})`;
        document.body.style.backgroundSize = 'cover';
    }

    previewSolidColor(color) {
        document.body.style.background = color;
        document.body.style.backgroundSize = 'cover';
    }

    async saveBackgroundSettings() {
        const type = document.getElementById('background-type').value;
        let value = '';

        switch (type) {
            case 'gradient':
                const activeGradient = document.querySelector('.gradient-option.active');
                value = activeGradient ? activeGradient.dataset.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
                break;
            case 'solid':
                value = document.getElementById('solid-color').value;
                break;
            case 'gif':
                value = document.getElementById('gif-url').value.trim();
                if (!value) {
                    alert('Введите URL GIF или выберите из примеров');
                    return;
                }
                break;
            case 'image':
                if (!this.backgroundImageData) {
                    alert('Загрузите изображение');
                    return;
                }
                value = this.backgroundImageData;
                break;
        }

        this.userSettings.background = {
            type: type,
            value: value
        };

        await this.saveSettings();
        this.applyBackground(this.userSettings.background);
        alert('Фон успешно применен!');
    }

    uploadBackground() {
        document.getElementById('background-upload').click();
    }

    handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.backgroundImageData = e.target.result;
            
            // Показываем превью
            const preview = document.getElementById('background-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.style.display = 'block';
            
            // Предпросмотр
            document.body.style.background = `url(${e.target.result})`;
            document.body.style.backgroundSize = 'cover';
        };
        reader.readAsDataURL(file);
    }

    // ==================== СИСТЕМНЫЕ ФУНКЦИИ ====================
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
        if (confirm('Вы уверены, что хотите выйти?')) {
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
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('register-form').style.display = 'none';
        }
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
