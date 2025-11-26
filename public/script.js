class Messenger {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.activeChatId = null;
        this.chats = [];
        this.userSettings = {};
        this.searchTimeout = null;
        this.avatarData = null;
        this.backgroundImageData = null;
        this.selectedUsers = [];
        this.fileData = null;
        this.isMobile = this.checkMobile();
        
        this.init();
    }

    checkMobile() {
        return window.innerWidth <= 768;
    }

    init() {
        this.bindEvents();
        this.checkAuth();
        this.createAudioElements();
        this.setupMobileView();
    }

    setupMobileView() {
        if (this.isMobile) {
            document.body.classList.add('mobile-view');
        }
    }

    createAudioElements() {
        this.hoverSound = document.getElementById('hover-sound');
        this.clickSound = document.getElementById('click-sound');
        this.messageSound = document.getElementById('message-sound');
    }

    playSound(sound) {
        if (this.userSettings.soundsEnabled && sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    bindEvents() {
        console.log('Привязка событий...');
        
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

        // Основные кнопки
        this.bindButton('new-chat-btn', () => this.showSearchModal());
        this.bindButton('find-users-btn', () => this.showSearchModal());
        this.bindButton('new-group-btn', () => this.showGroupModal());
        this.bindButton('settings-btn', () => this.showSettingsModal());
        this.bindButton('close-search-modal', () => this.hideSearchModal());
        this.bindButton('send-btn', () => this.sendMessage());
        this.bindButton('logout-btn', () => this.logout());
        this.bindButton('attach-btn', () => this.uploadFile());
        this.bindButton('close-settings-modal', () => this.hideSettingsModal());
        this.bindButton('close-group-modal', () => this.hideGroupModal());
        this.bindButton('create-group-btn', () => this.createGroup());
        this.bindButton('upload-avatar-btn', () => this.uploadAvatar());
        this.bindButton('save-profile-btn', () => this.saveProfile());
        this.bindButton('change-username-btn', () => this.changeUsername());
        this.bindButton('save-theme-btn', () => this.saveThemeSettings());
        this.bindButton('save-effects-btn', () => this.saveEffectsSettings());
        this.bindButton('save-background-btn', () => this.saveBackgroundSettings());
        this.bindButton('upload-background-btn', () => this.uploadBackground());
        this.bindButton('test-gif-btn', () => this.testGifUrl());

        // Кнопки правой панели
        this.bindButton('right-panel-settings', () => this.showSettingsModal());
        this.bindButton('right-panel-logout', () => this.logout());
        this.bindButton('right-panel-new-chat', () => this.showSearchModal());
        this.bindButton('right-panel-new-group', () => this.showGroupModal());
        this.bindButton('right-panel-theme', () => this.switchToThemeTab());
        this.bindButton('right-panel-profile', () => this.switchToProfileTab());

        // Поиск
        document.getElementById('user-search-input').addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        document.getElementById('group-user-search').addEventListener('input', (e) => this.handleGroupUserSearch(e.target.value));
        
        // Сообщения
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Файлы
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('avatar-upload').addEventListener('change', (e) => this.handleAvatarUpload(e));
        document.getElementById('background-upload').addEventListener('change', (e) => this.handleBackgroundUpload(e));

        // Настройки - табы
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });

        // Тема
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectTheme(e.currentTarget));
        });

        // Эффекты
        document.getElementById('window-opacity').addEventListener('input', (e) => this.updateOpacityPreview(e.target.value));
        document.querySelectorAll('.glow-color-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGlowColor(e.currentTarget));
        });
        document.getElementById('glow-color-custom').addEventListener('change', (e) => this.selectCustomGlowColor(e.target.value));
        document.getElementById('glow-intensity').addEventListener('input', (e) => this.updateGlowIntensityPreview(e.target.value));
        document.querySelectorAll('input[name="glow-position"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.selectGlowPosition(e.target.value));
        });

        // Фон
        document.getElementById('background-type').addEventListener('change', (e) => this.switchBackgroundType(e.target.value));
        document.querySelectorAll('.gradient-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGradient(e.target));
        });
        document.querySelectorAll('.gif-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectGif(e.target));
        });
        document.getElementById('solid-color').addEventListener('change', (e) => this.previewSolidColor(e.target.value));

        // Адаптивность
        window.addEventListener('resize', () => this.handleResize());

        // Звуки
        this.addHoverSounds();
    }

    bindButton(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
            console.log(`Кнопка ${id} привязана`);
        } else {
            console.warn(`Элемент с id "${id}" не найден`);
        }
    }

    handleResize() {
        this.isMobile = this.checkMobile();
        this.setupMobileView();
    }

    addHoverSounds() {
        const interactiveElements = document.querySelectorAll('button, input[type="text"], input[type="password"], .chat-item, .user-result, .theme-option, .gradient-option');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => this.playSound(this.hoverSound));
            el.addEventListener('click', () => this.playSound(this.clickSound));
        });
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
                this.updateRightPanel();
                this.hideError('login-error');
                this.playSound(this.clickSound);
            } else {
                this.showError('login-error', data.error);
            }
        } catch (error) {
            console.error('Login error:', error);
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
                this.updateRightPanel();
                this.hideError('register-error');
                this.playSound(this.clickSound);
            } else {
                this.showError('register-error', data.error);
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showError('register-error', 'Ошибка подключения к серверу');
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    hideError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                this.token = token;
                this.currentUser = JSON.parse(user);
                this.showApp();
                this.loadChats();
                this.loadUserSettings();
                this.updateRightPanel();
            } catch (e) {
                console.error('Auth error:', e);
                this.logout();
            }
        }
    }

    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        if (this.isMobile) {
            this.setupMobileNavigation();
        }
    }

    updateRightPanel() {
        if (this.currentUser) {
            const panelAvatar = document.getElementById('panel-avatar');
            const panelUserName = document.getElementById('panel-user-name');
            const panelUserStatus = document.getElementById('panel-user-status');

            if (panelUserName) panelUserName.textContent = this.currentUser.name;
            if (panelUserStatus) panelUserStatus.textContent = this.currentUser.status || 'в сети';

            if (panelAvatar) {
                if (this.currentUser.avatar) {
                    panelAvatar.style.backgroundImage = `url(${this.currentUser.avatar})`;
                    panelAvatar.innerHTML = '';
                } else {
                    panelAvatar.style.backgroundImage = 'none';
                    panelAvatar.innerHTML = '<div class="avatar-placeholder">👤</div>';
                }
            }
        }
    }

    setupMobileNavigation() {
        if (!document.querySelector('.mobile-nav')) {
            const mobileNav = document.createElement('div');
            mobileNav.className = 'mobile-nav';
            mobileNav.innerHTML = `
                <button class="mobile-nav-btn active" data-action="chats">
                    <span>💬</span>
                    <span>Чаты</span>
                </button>
                <button class="mobile-nav-btn" data-action="search">
                    <span>🔍</span>
                    <span>Поиск</span>
                </button>
                <button class="mobile-nav-btn" data-action="groups">
                    <span>👥</span>
                    <span>Группы</span>
                </button>
                <button class="mobile-nav-btn" data-action="settings">
                    <span>⚙️</span>
                    <span>Настройки</span>
                </button>
            `;
            document.querySelector('.messenger-wrapper').appendChild(mobileNav);

            mobileNav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.handleMobileNavAction(action);
                    
                    mobileNav.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                });
            });
        }
    }

    handleMobileNavAction(action) {
        switch (action) {
            case 'chats':
                this.showChatsList();
                break;
            case 'search':
                this.showSearchModal();
                break;
            case 'groups':
                this.showGroupModal();
                break;
            case 'settings':
                this.showSettingsModal();
                break;
        }
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
        
        if (!chatsList || !noChats) return;

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
                (chat.lastMessage.length > 35 ? chat.lastMessage.substring(0, 35) + '...' : chat.lastMessage) : 
                'Чат создан';
            
            const groupIcon = chat.is_group ? '👥 ' : '';
                
            chatElement.innerHTML = `
                <div class="chat-avatar" ${avatarStyle}>
                    ${chat.avatar ? '' : (chat.is_group ? '👥' : chat.name.charAt(0))}
                </div>
                <div class="chat-info">
                    <div class="chat-name">${groupIcon}${chat.name}</div>
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
        const chatName = document.getElementById('current-chat-name');
        const chatStatus = document.getElementById('current-chat-status');
        if (chatName) chatName.textContent = chat.name;
        if (chatStatus) chatStatus.textContent = chat.is_group ? 'Групповой чат' : 'в сети';
        
        // Активируем поле ввода
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = `Сообщение для ${chat.name}...`;
            messageInput.focus();
        }
        if (sendBtn) sendBtn.disabled = false;

        // Загружаем сообщения
        await this.loadMessages(chat.id);
        
        // Обновляем список чатов
        this.renderChats();

        if (this.isMobile) {
            this.showChatView();
        }
    }

    showChatView() {
        if (this.isMobile) {
            const chatsPanel = document.querySelector('.chats-panel');
            const messengerContainer = document.querySelector('.messenger-container');
            const rightPanel = document.querySelector('.right-panel');
            if (chatsPanel) chatsPanel.style.display = 'none';
            if (messengerContainer) messengerContainer.style.display = 'flex';
            if (rightPanel) rightPanel.style.display = 'none';
        }
    }

    showChatsList() {
        if (this.isMobile) {
            const chatsPanel = document.querySelector('.chats-panel');
            const messengerContainer = document.querySelector('.messenger-container');
            const rightPanel = document.querySelector('.right-panel');
            if (chatsPanel) chatsPanel.style.display = 'flex';
            if (messengerContainer) messengerContainer.style.display = 'none';
            if (rightPanel) rightPanel.style.display = 'none';
        }
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
        if (!chatContainer) return;

        chatContainer.innerHTML = '';

        if (messages.length === 0) {
            chatContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">💬</div>
                    <h3>Начните общение!</h3>
                    <p>Это начало вашей беседы</p>
                    <p>Напишите первое сообщение</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message message-${message.type}`;
            
            const time = new Date(message.time).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            let attachmentHtml = '';
            if (message.attachment) {
                const fileName = message.attachment.split('/').pop() || 'Файл';
                attachmentHtml = `
                    <div class="attachment">
                        <span class="attachment-icon">📎</span>
                        <span class="attachment-name">${fileName}</span>
                    </div>
                `;
            }
            
            messageElement.innerHTML = `
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                ${attachmentHtml}
                <div class="message-time">${time}</div>
            `;
            chatContainer.appendChild(messageElement);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input ? input.value.trim() : '';

        if ((!text && !this.fileData) || !this.activeChatId) return;

        try {
            let attachment = null;
            if (this.fileData) {
                const fileResponse = await this.apiCall('/api/upload', {
                    method: 'POST',
                    body: this.fileData
                });
                if (fileResponse) {
                    const fileData = await fileResponse.json();
                    attachment = fileData.fileUrl;
                }
            }

            const response = await this.apiCall(`/api/chats/${this.activeChatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ 
                    text: text,
                    attachment: attachment
                })
            });

            if (response) {
                if (input) input.value = '';
                this.fileData = null;
                const messageInput = document.getElementById('message-input');
                if (messageInput) messageInput.placeholder = 'Введите сообщение...';
                await this.loadMessages(this.activeChatId);
                await this.loadChats();
                this.playSound(this.messageSound);
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            alert('Ошибка отправки сообщения');
        }
    }

    // ==================== ФАЙЛЫ ====================
    uploadFile() {
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) fileUpload.click();
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const input = document.getElementById('message-input');
        if (input) input.placeholder = `Загрузка: ${file.name}...`;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileData = e.target.result;
            if (input) input.placeholder = `Файл готов: ${file.name}`;
            if (input) input.value = '';
        };
        reader.onerror = () => {
            if (input) input.placeholder = 'Ошибка загрузки файла';
            this.fileData = null;
        };
        reader.readAsDataURL(file);
    }

    // ==================== ГРУППЫ ====================
    showGroupModal() {
        const modal = document.getElementById('group-modal');
        if (modal) modal.classList.add('active');
        
        const groupName = document.getElementById('group-name');
        const groupSearch = document.getElementById('group-user-search');
        const searchResults = document.getElementById('group-search-results');
        
        if (groupName) groupName.value = '';
        if (groupSearch) groupSearch.value = '';
        if (searchResults) searchResults.innerHTML = '';
        
        this.selectedUsers = [];
        this.renderSelectedUsers();
    }

    hideGroupModal() {
        const modal = document.getElementById('group-modal');
        if (modal) modal.classList.remove('active');
    }

    handleGroupUserSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchUsersForGroup(query);
        }, 300);
    }

    async searchUsersForGroup(query) {
        const resultsContainer = document.getElementById('group-search-results');
        if (!resultsContainer) return;
        
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <p>Введите минимум 2 символа для поиска</p>
                </div>
            `;
            return;
        }

        try {
            const response = await this.apiCall(`/api/users/search?query=${encodeURIComponent(query.trim())}`);
            if (!response) return;

            const users = await response.json();
            this.renderGroupSearchResults(users);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">❌</div>
                    <p>Ошибка поиска</p>
                </div>
            `;
        }
    }

    renderGroupSearchResults(users) {
        const resultsContainer = document.getElementById('group-search-results');
        if (!resultsContainer) return;
        
        const filteredUsers = users.filter(user => 
            user.id !== this.currentUser.id && 
            !this.selectedUsers.some(selected => selected.id === user.id)
        );

        if (filteredUsers.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">👥</div>
                    <p>Пользователи не найдены или уже добавлены</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = '';
        filteredUsers.forEach(user => {
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
            
            userElement.addEventListener('click', () => this.addUserToGroup(user));
            resultsContainer.appendChild(userElement);
        });
    }

    addUserToGroup(user) {
        if (!this.selectedUsers.some(u => u.id === user.id)) {
            this.selectedUsers.push(user);
            this.renderSelectedUsers();
            const groupSearch = document.getElementById('group-user-search');
            const searchResults = document.getElementById('group-search-results');
            if (groupSearch) groupSearch.value = '';
            if (searchResults) searchResults.innerHTML = '';
            this.playSound(this.clickSound);
        }
    }

    removeUserFromGroup(userId) {
        this.selectedUsers = this.selectedUsers.filter(user => user.id !== userId);
        this.renderSelectedUsers();
        this.playSound(this.clickSound);
    }

    renderSelectedUsers() {
        const container = document.getElementById('selected-users');
        if (!container) return;

        container.innerHTML = '';

        this.selectedUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'selected-user';
            userElement.innerHTML = `
                ${user.name}
                <button class="remove-user" onclick="messenger.removeUserFromGroup(${user.id})">×</button>
            `;
            container.appendChild(userElement);
        });
    }

    async createGroup() {
        const groupNameInput = document.getElementById('group-name');
        const groupName = groupNameInput ? groupNameInput.value.trim() : '';
        const userIds = this.selectedUsers.map(user => user.id);

        if (!groupName) {
            alert('Введите название группы');
            return;
        }

        if (userIds.length === 0) {
            alert('Добавьте хотя бы одного участника');
            return;
        }

        try {
            const response = await this.apiCall('/api/groups', {
                method: 'POST',
                body: JSON.stringify({
                    groupName: groupName,
                    userIds: userIds
                })
            });

            if (response) {
                alert('Группа успешно создана!');
                this.hideGroupModal();
                await this.loadChats();
                this.playSound(this.messageSound);
            }
        } catch (error) {
            console.error('Ошибка создания группы:', error);
            alert(`Ошибка создания группы: ${error.message}`);
        }
    }

    // ==================== ПОИСК ПОЛЬЗОВАТЕЛЕЙ ====================
    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchUsers(query);
        }, 300);
    }

    async searchUsers(query) {
        const resultsContainer = document.getElementById('user-search-results');
        if (!resultsContainer) return;
        
        console.log('Поиск:', query);

        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <p>Введите минимум 2 символа для поиска</p>
                </div>
            `;
            return;
        }

        try {
            const response = await this.apiCall(`/api/users/search?query=${encodeURIComponent(query.trim())}`);
            if (!response) return;

            const users = await response.json();
            console.log('Результаты поиска:', users);
            this.renderSearchResults(users);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">❌</div>
                    <p>Ошибка поиска: ${error.message}</p>
                </div>
            `;
        }
    }

    renderSearchResults(users) {
        const resultsContainer = document.getElementById('user-search-results');
        if (!resultsContainer) return;

        if (users.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">👥</div>
                    <p>Пользователи не найдены</p>
                </div>
            `;
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
            
            userElement.addEventListener('click', async () => {
                await this.startChatWithUser(user);
            });
            resultsContainer.appendChild(userElement);
        });
    }

    async startChatWithUser(user) {
        try {
            const response = await this.apiCall('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id })
            });

            if (response) {
                const result = await response.json();
                this.hideSearchModal();
                
                if (result.exists) {
                    // Чат уже существует, выбираем его
                    const existingChat = this.chats.find(chat => chat.id === result.id);
                    if (existingChat) {
                        await this.selectChat(existingChat);
                    }
                } else {
                    // Новый чат создан, перезагружаем список
                    await this.loadChats();
                    // Находим и выбираем новый чат
                    const newChat = this.chats.find(chat => chat.id === result.id);
                    if (newChat) {
                        await this.selectChat(newChat);
                    }
                }
                this.playSound(this.clickSound);
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            alert('Ошибка создания чата');
        }
    }

    // ==================== ПОИСК ====================
    showSearchModal() {
        console.log('showSearchModal вызван');
        const modal = document.getElementById('search-modal');
        if (modal) {
            console.log('Модальное окно найдено, открываем...');
            modal.classList.add('active');
            
            const searchInput = document.getElementById('user-search-input');
            const searchResults = document.getElementById('user-search-results');
            
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                console.log('Поле поиска очищено и в фокусе');
            }
            if (searchResults) {
                searchResults.innerHTML = `
                    <div class="no-results">
                        <div class="no-results-icon">🔍</div>
                        <p>Начните вводить запрос для поиска</p>
                    </div>
                `;
                console.log('Результаты поиска очищены');
            }
        } else {
            console.error('Модальное окно search-modal не найдено!');
        }
    }

    hideSearchModal() {
        console.log('hideSearchModal вызван');
        const modal = document.getElementById('search-modal');
        if (modal) {
            modal.classList.remove('active');
        }
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
            // Настройки по умолчанию
            this.userSettings = {
                theme: 'dark',
                windowOpacity: 0.9,
                glowColor: '#007AFF',
                glowPosition: 'back',
                glowIntensity: 0.3,
                fontSize: '14px',
                compactMode: false,
                roundedCorners: true,
                animations: true,
                soundsEnabled: true,
                panelSize: 'medium',
                background: {
                    type: 'gradient',
                    value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
                }
            };
            this.applySettings();
        }
    }

    applySettings() {
        // Применяем все настройки
        if (this.userSettings.theme) {
            this.applyTheme(this.userSettings.theme);
        }

        if (this.userSettings.windowOpacity !== undefined) {
            this.applyWindowOpacity(this.userSettings.windowOpacity);
        }

        if (this.userSettings.glowColor) {
            this.applyGlowColor(this.userSettings.glowColor);
        }

        if (this.userSettings.glowPosition) {
            this.applyGlowPosition(this.userSettings.glowPosition);
        }

        if (this.userSettings.glowIntensity !== undefined) {
            this.applyGlowIntensity(this.userSettings.glowIntensity);
        }

        if (this.userSettings.fontSize) {
            document.documentElement.style.setProperty('--message-font-size', this.userSettings.fontSize);
        }

        if (this.userSettings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }

        if (this.userSettings.roundedCorners !== false) {
            document.body.classList.add('rounded-corners');
            document.body.classList.remove('no-rounded-corners');
        } else {
            document.body.classList.add('no-rounded-corners');
            document.body.classList.remove('rounded-corners');
        }

        if (!this.userSettings.animations) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }

        if (this.userSettings.panelSize) {
            this.applyPanelSize(this.userSettings.panelSize);
        }

        if (this.userSettings.background) {
            this.applyBackground(this.userSettings.background);
        }
    }

    applyTheme(theme) {
        const themeClasses = [
            'theme-dark', 'theme-light', 'theme-gray', 'theme-dark-gray', 
            'theme-blue', 'theme-purple', 'theme-green', 'theme-orange',
            'theme-pink', 'theme-red', 'theme-teal', 'theme-cyan',
            'theme-indigo', 'theme-brown', 'theme-deep-purple'
        ];
        
        document.body.classList.remove(...themeClasses);
        document.body.classList.add(`theme-${theme}`);
    }

    applyWindowOpacity(opacity) {
        const chatsPanel = document.querySelector('.chats-panel');
        const messengerContainer = document.querySelector('.messenger-container');
        const rightPanel = document.querySelector('.right-panel');
        
        if (chatsPanel) chatsPanel.style.opacity = opacity;
        if (messengerContainer) messengerContainer.style.opacity = opacity;
        if (rightPanel) rightPanel.style.opacity = opacity;
    }

    applyGlowColor(color) {
        document.documentElement.style.setProperty('--glow-color', color);
    }

    applyGlowPosition(position) {
        document.documentElement.style.setProperty('--glow-position', position);
    }

    applyGlowIntensity(intensity) {
        document.documentElement.style.setProperty('--glow-intensity', intensity);
    }

    applyPanelSize(size) {
        document.documentElement.setAttribute('data-panel-size', size);
    }

    applyBackground(background) {
        if (!background) return;

        const body = document.body;
        
        // Удаляем все классы фона
        body.className = body.className.replace(/(^|\s)bg-\S+/g, '');
        
        switch (background.type) {
            case 'gradient':
                body.style.background = background.value;
                body.style.backgroundSize = 'cover';
                body.classList.add('bg-gradient-custom');
                break;
            case 'solid':
                body.style.background = background.value;
                body.style.backgroundSize = 'cover';
                body.classList.add('bg-solid');
                break;
            case 'gif':
                body.style.background = `url(${background.value})`;
                body.style.backgroundSize = 'cover';
                body.classList.add('bg-gif');
                break;
            case 'image':
                body.style.background = `url(${background.value})`;
                body.style.backgroundSize = 'cover';
                body.classList.add('bg-image');
                break;
        }
    }

    populateSettingsForm() {
        if (!this.currentUser) return;

        // Профиль
        const profileName = document.getElementById('profile-name');
        const profileStatus = document.getElementById('profile-status');
        const profileUsername = document.getElementById('profile-username');
        const allowGroupInvites = document.getElementById('allow-group-invites');
        
        if (profileName) profileName.value = this.currentUser.name || '';
        if (profileStatus) profileStatus.value = this.currentUser.status || 'в сети';
        if (profileUsername) profileUsername.value = this.currentUser.username || '';
        if (allowGroupInvites) allowGroupInvites.checked = this.currentUser.allow_group_invites !== false;

        // Аватар
        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) {
            if (this.currentUser.avatar) {
                avatarPreview.style.backgroundImage = `url(${this.currentUser.avatar})`;
                avatarPreview.innerHTML = '';
            } else {
                avatarPreview.style.backgroundImage = 'none';
                avatarPreview.innerHTML = '<div class="avatar-placeholder">👤</div>';
            }
        }

        // Тема
        if (this.userSettings.theme) {
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.remove('active');
            });
            const activeTheme = document.querySelector(`.theme-option[data-theme="${this.userSettings.theme}"]`);
            if (activeTheme) {
                activeTheme.classList.add('active');
            }
        }

        // Эффекты
        if (this.userSettings.windowOpacity !== undefined) {
            const opacitySlider = document.getElementById('window-opacity');
            const opacityValue = document.getElementById('opacity-value');
            if (opacitySlider) opacitySlider.value = this.userSettings.windowOpacity;
            if (opacityValue) opacityValue.textContent = Math.round(this.userSettings.windowOpacity * 100) + '%';
        }

        if (this.userSettings.glowColor) {
            this.applyGlowColor(this.userSettings.glowColor);
        }

        if (this.userSettings.glowPosition) {
            this.applyGlowPosition(this.userSettings.glowPosition);
        }

        if (this.userSettings.glowIntensity !== undefined) {
            const intensitySlider = document.getElementById('glow-intensity');
            const intensityValue = document.getElementById('glow-intensity-value');
            if (intensitySlider) intensitySlider.value = this.userSettings.glowIntensity;
            if (intensityValue) intensityValue.textContent = Math.round(this.userSettings.glowIntensity * 100) + '%';
        }

        if (this.userSettings.fontSize) {
            const fontSize = document.getElementById('font-size');
            if (fontSize) fontSize.value = this.userSettings.fontSize;
        }

        // Чекбоксы
        const compactMode = document.getElementById('compact-mode');
        const roundedCorners = document.getElementById('rounded-corners');
        const animations = document.getElementById('animations');
        const soundsEnabled = document.getElementById('sounds-enabled');
        
        if (compactMode) compactMode.checked = !!this.userSettings.compactMode;
        if (roundedCorners) roundedCorners.checked = this.userSettings.roundedCorners !== false;
        if (animations) animations.checked = this.userSettings.animations !== false;
        if (soundsEnabled) soundsEnabled.checked = this.userSettings.soundsEnabled !== false;

        // Размер панелей
        if (this.userSettings.panelSize) {
            const panelSize = document.getElementById('panel-size');
            if (panelSize) panelSize.value = this.userSettings.panelSize;
        }

        // Фон
        if (this.userSettings.background) {
            const backgroundType = document.getElementById('background-type');
            if (backgroundType) {
                backgroundType.value = this.userSettings.background.type;
                this.switchBackgroundType(this.userSettings.background.type);
                
                // Устанавливаем активные элементы в зависимости от типа фона
                switch (this.userSettings.background.type) {
                    case 'gradient':
                        document.querySelectorAll('.gradient-option').forEach(opt => {
                            opt.classList.remove('active');
                            if (opt.dataset.gradient === this.userSettings.background.value) {
                                opt.classList.add('active');
                            }
                        });
                        break;
                    case 'solid':
                        const solidColor = document.getElementById('solid-color');
                        if (solidColor) solidColor.value = this.userSettings.background.value;
                        break;
                    case 'gif':
                        document.querySelectorAll('.gif-option').forEach(opt => {
                            opt.classList.remove('active');
                            if (opt.dataset.gif === this.userSettings.background.value) {
                                opt.classList.add('active');
                            }
                        });
                        const gifUrl = document.getElementById('gif-url');
                        if (gifUrl) gifUrl.value = this.userSettings.background.value;
                        break;
                    case 'image':
                        // Для изображений просто применяем фон
                        break;
                }
            }
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('active');
            this.populateSettingsForm();
        }
    }

    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('active');
    }

    switchToThemeTab() {
        this.showSettingsModal();
        this.switchSettingsTab('theme');
    }

    switchToProfileTab() {
        this.showSettingsModal();
        this.switchSettingsTab('profile');
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const tabContent = document.getElementById(`${tabName}-tab`);
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    }

    // ==================== ПРОФИЛЬ ====================
    uploadAvatar() {
        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) avatarUpload.click();
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('avatar-preview');
            if (avatarPreview) {
                avatarPreview.style.backgroundImage = `url(${e.target.result})`;
                avatarPreview.innerHTML = '';
            }
            
            this.avatarData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async saveProfile() {
        const nameInput = document.getElementById('profile-name');
        const statusInput = document.getElementById('profile-status');
        const allowGroupInvites = document.getElementById('allow-group-invites');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const status = statusInput ? statusInput.value.trim() : '';
        const allowInvites = allowGroupInvites ? allowGroupInvites.checked : true;

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
                    avatar: this.avatarData || this.currentUser.avatar,
                    allow_group_invites: allowInvites
                })
            });

            if (response) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.updateRightPanel();
                
                const avatarPreview = document.getElementById('avatar-preview');
                if (avatarPreview && this.currentUser.avatar) {
                    avatarPreview.style.backgroundImage = `url(${this.currentUser.avatar})`;
                    avatarPreview.innerHTML = '';
                }
                
                this.hideSettingsModal();
                await this.loadChats();
                alert('Профиль успешно обновлен!');
                this.playSound(this.clickSound);
            }
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            alert('Ошибка сохранения профиля');
        }
    }

    async changeUsername() {
        const usernameInput = document.getElementById('profile-username');
        const newUsername = usernameInput ? usernameInput.value.trim() : '';

        if (!newUsername) {
            alert('Введите новый username');
            return;
        }

        if (newUsername === this.currentUser.username) {
            alert('Это ваш текущий username');
            return;
        }

        if (newUsername.length < 3) {
            alert('Username должен содержать минимум 3 символа');
            return;
        }

        try {
            const response = await this.apiCall('/api/profile/username', {
                method: 'PUT',
                body: JSON.stringify({ username: newUsername })
            });

            if (response) {
                const data = await response.json();
                this.currentUser = data.user;
                this.token = data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.updateRightPanel();
                alert('Username успешно изменен!');
                this.playSound(this.clickSound);
            }
        } catch (error) {
            console.error('Ошибка смены username:', error);
            alert(`Ошибка смены username: ${error.message}`);
        }
    }

    // ==================== ТЕМА ====================
    selectTheme(element) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        element.classList.add('active');
    }

    async saveThemeSettings() {
        const activeTheme = document.querySelector('.theme-option.active');
        const theme = activeTheme ? activeTheme.dataset.theme : 'dark';

        const compactMode = document.getElementById('compact-mode');
        const roundedCorners = document.getElementById('rounded-corners');
        const animations = document.getElementById('animations');
        const soundsEnabled = document.getElementById('sounds-enabled');
        const panelSize = document.getElementById('panel-size');

        this.userSettings.theme = theme;
        this.userSettings.compactMode = compactMode ? compactMode.checked : false;
        this.userSettings.roundedCorners = roundedCorners ? roundedCorners.checked : true;
        this.userSettings.animations = animations ? animations.checked : true;
        this.userSettings.soundsEnabled = soundsEnabled ? soundsEnabled.checked : true;
        this.userSettings.panelSize = panelSize ? panelSize.value : 'medium';

        await this.saveSettings();
        this.applySettings();
        alert('Настройки успешно применены!');
        this.playSound(this.clickSound);
    }

    // ==================== ЭФФЕКТЫ ====================
    updateOpacityPreview(value) {
        const opacityValue = document.getElementById('opacity-value');
        if (opacityValue) opacityValue.textContent = Math.round(value * 100) + '%';
        this.applyWindowOpacity(parseFloat(value));
    }

    selectGlowColor(element) {
        document.querySelectorAll('.glow-color-option').forEach(option => {
            option.classList.remove('active');
        });
        element.classList.add('active');
        
        const color = element.dataset.color;
        this.applyGlowColor(color);
    }

    selectCustomGlowColor(color) {
        this.applyGlowColor(color);
    }

    selectGlowPosition(position) {
        this.applyGlowPosition(position);
    }

    updateGlowIntensityPreview(value) {
        const intensityValue = document.getElementById('glow-intensity-value');
        if (intensityValue) intensityValue.textContent = Math.round(value * 100) + '%';
        this.applyGlowIntensity(parseFloat(value));
    }

    async saveEffectsSettings() {
        const opacitySlider = document.getElementById('window-opacity');
        const glowColorCustom = document.getElementById('glow-color-custom');
        const glowIntensitySlider = document.getElementById('glow-intensity');
        const fontSizeSelect = document.getElementById('font-size');
        const glowPositionRadio = document.querySelector('input[name="glow-position"]:checked');

        this.userSettings.windowOpacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.9;
        this.userSettings.glowColor = glowColorCustom ? glowColorCustom.value : '#007AFF';
        this.userSettings.glowIntensity = glowIntensitySlider ? parseFloat(glowIntensitySlider.value) : 0.3;
        this.userSettings.fontSize = fontSizeSelect ? fontSizeSelect.value : '14px';
        this.userSettings.glowPosition = glowPositionRadio ? glowPositionRadio.value : 'back';

        await this.saveSettings();
        this.applySettings();
        alert('Эффекты успешно применены!');
        this.playSound(this.clickSound);
    }

    // ==================== ФОН ====================
    switchBackgroundType(type) {
        document.querySelectorAll('.background-options').forEach(el => {
            el.style.display = 'none';
        });
        
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
        
        const gradient = element.dataset.gradient;
        this.applyBackground({
            type: 'gradient',
            value: gradient
        });
    }

    selectGif(element) {
        document.querySelectorAll('.gif-option').forEach(opt => {
            opt.classList.remove('active');
        });
        element.classList.add('active');
        
        const gifUrl = element.dataset.gif;
        this.applyBackground({
            type: 'gif',
            value: gifUrl
        });
        
        // Обновляем поле URL
        const gifUrlInput = document.getElementById('gif-url');
        if (gifUrlInput) gifUrlInput.value = gifUrl;
    }

    async testGifUrl() {
        const gifUrlInput = document.getElementById('gif-url');
        const url = gifUrlInput ? gifUrlInput.value.trim() : '';
        
        if (!url) {
            alert('Введите URL GIF');
            return;
        }

        try {
            // Создаем изображение для проверки
            const img = new Image();
            img.onload = () => {
                this.applyBackground({
                    type: 'gif',
                    value: url
                });
                alert('GIF успешно загружен!');
            };
            img.onerror = () => {
                alert('Не удалось загрузить GIF. Проверьте URL.');
            };
            img.src = url;
        } catch (error) {
            alert('Ошибка при проверке GIF: ' + error.message);
        }
    }

    previewSolidColor(color) {
        this.applyBackground({
            type: 'solid',
            value: color
        });
    }

    async saveBackgroundSettings() {
        const backgroundType = document.getElementById('background-type');
        const type = backgroundType ? backgroundType.value : 'gradient';
        
        let value = '';
        switch (type) {
            case 'gradient':
                const activeGradient = document.querySelector('.gradient-option.active');
                value = activeGradient ? activeGradient.dataset.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
                break;
            case 'solid':
                const solidColor = document.getElementById('solid-color');
                value = solidColor ? solidColor.value : '#1a1a2e';
                break;
            case 'gif':
                const gifUrlInput = document.getElementById('gif-url');
                value = gifUrlInput ? gifUrlInput.value.trim() : '';
                if (!value) {
                    // Проверяем выбранные GIF из примеров
                    const activeGif = document.querySelector('.gif-option.active');
                    value = activeGif ? activeGif.dataset.gif : '';
                }
                if (!value) {
                    alert('Выберите GIF из примеров или введите URL');
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
        this.playSound(this.clickSound);
    }

    uploadBackground() {
        const backgroundUpload = document.getElementById('background-upload');
        if (backgroundUpload) backgroundUpload.click();
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
            
            const preview = document.getElementById('background-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.style.display = 'block';
            }
            
            this.applyBackground({
                type: 'image',
                value: this.backgroundImageData
            });
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
            
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            
            if (loginForm) {
                loginForm.reset();
                loginForm.style.display = 'block';
            }
            if (registerForm) {
                registerForm.reset();
                registerForm.style.display = 'none';
            }
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

        if (options.body && typeof options.body === 'string' && options.body.startsWith('data:')) {
            defaultOptions.headers['Content-Type'] = 'application/octet-stream';
        }

        try {
            const config = { ...defaultOptions, ...options };
            
            // Для GET запросов не добавляем body
            if (config.method === 'GET' || !config.method) {
                delete config.body;
            }

            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.logout();
                return null;
            }

            if (!response.ok) {
                let errorMessage = 'Ошибка сервера';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return response;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.messenger = new Messenger();
});
