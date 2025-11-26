// В конструкторе класса Messenger добавляем:
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
    
    // Добавляем флаг для мобильного устройства
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    this.init();
}

// Обновляем функцию отображения приветственного сообщения
renderMessages(messages) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';

    if (messages.length === 0) {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">✉️</div>
                <h3>Начните общение</h3>
                <p>Это начало нового диалога</p>
                <p>Отправьте первое сообщение</p>
            </div>
        `;
        return;
    }

    // остальной код без изменений...
}

// Обновляем функцию показа приложения для мобильных
showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    // На мобильных устройствах применяем дополнительные стили
    if (this.isMobile) {
        document.body.classList.add('mobile-device');
        this.adaptForMobile();
    }
}

// Новая функция для адаптации под мобильные
adaptForMobile() {
    // Закрываем клавиатуру при клике вне поля ввода
    document.addEventListener('click', (e) => {
        if (!e.target.matches('.message-input') && !e.target.matches('.search-input') && !e.target.matches('.settings-input')) {
            document.activeElement.blur();
        }
    });
    
    // Предотвращаем zoom при фокусе на поле ввода
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (this.isMobile) {
                setTimeout(() => {
                    document.body.style.zoom = "1.0";
                }, 100);
            }
        });
    });
}

// Обновляем функцию создания звуков
createAudioElements() {
    // Создаем реальные звуки (упрощенные версии)
    this.hoverSound = this.createBeepSound(800, 0.1);
    this.clickSound = this.createBeepSound(1000, 0.2);
    this.messageSound = this.createBeepSound(600, 0.3);
}

// Функция создания простых звуков через Web Audio API
createBeepSound(frequency, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
        
        return {
            play: () => {
                if (this.userSettings.soundsEnabled) {
                    this.createBeepSound(frequency, duration);
                }
            }
        };
    } catch (e) {
        console.log('Web Audio API not supported', e);
        return { play: () => {} };
    }
}

// Обновляем функцию привязки событий для звуков
addHoverSounds() {
    const interactiveElements = document.querySelectorAll('button, .chat-item, .user-result, .theme-option, .gradient-option, .tab-btn');
    interactiveElements.forEach(el => {
        // Для мобильных устройств используем touchstart вместо mouseenter
        if (this.isMobile) {
            el.addEventListener('touchstart', () => this.playSound(this.hoverSound));
        } else {
            el.addEventListener('mouseenter', () => this.playSound(this.hoverSound));
        }
        el.addEventListener('click', () => this.playSound(this.clickSound));
    });
}

// Обновляем функцию отправки сообщения для лучшей работы на мобильных
async sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if ((!text && !this.fileData) || !this.activeChatId) return;

    try {
        let attachment = null;
        if (this.fileData) {
            // На мобильных устройствах показываем индикатор загрузки
            if (this.isMobile) {
                this.showLoadingIndicator();
            }
            
            const fileResponse = await this.apiCall('/api/upload', {
                method: 'POST',
                body: this.fileData
            });
            if (fileResponse) {
                const fileData = await fileResponse.json();
                attachment = fileData.fileUrl;
            }
            
            if (this.isMobile) {
                this.hideLoadingIndicator();
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
            input.value = '';
            this.fileData = null;
            // На мобильных скрываем клавиатуру после отправки
            if (this.isMobile) {
                input.blur();
            }
            await this.loadMessages(this.activeChatId);
            await this.loadChats();
            this.playSound(this.messageSound);
        }
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        alert('Ошибка отправки сообщения');
        if (this.isMobile) {
            this.hideLoadingIndicator();
        }
    }
}

// Функции для индикатора загрузки на мобильных
showLoadingIndicator() {
    let loader = document.getElementById('mobile-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'mobile-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-primary);
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 10000;
            ">
                <div style="text-align: center; color: var(--text-primary);">
                    <div style="margin-bottom: 10px;">Отправка файла...</div>
                    <div style="width: 20px; height: 20px; border: 2px solid #ccc; border-top: 2px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loader);
    }
}

hideLoadingIndicator() {
    const loader = document.getElementById('mobile-loader');
    if (loader) {
        loader.remove();
    }
}

// Обновляем функцию отображения чатов для мобильных
renderChats() {
    const chatsList = document.getElementById('chats-list');
    const noChats = document.getElementById('no-chats');
    
    if (this.chats.length === 0) {
        chatsList.innerHTML = '';
        chatsList.appendChild(noChats);
        noChats.style.display = 'block';
        
        // Обновляем текст для пустого списка чатов
        noChats.innerHTML = `
            <div class="no-chats-icon">💬</div>
            <p>Нет активных чатов</p>
            <p>Начните общение с другими пользователями</p>
            <button class="find-users-btn" id="find-users-btn">Найти пользователей</button>
        `;
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
            'Новый чат';
        
        // Убираем эмодзи для групп
        const groupIcon = chat.is_group ? '' : '';
            
        chatElement.innerHTML = `
            <div class="chat-avatar" ${avatarStyle}>
                ${chat.avatar ? '' : (chat.is_group ? 'Г' : chat.name.charAt(0))}
            </div>
            <div class="chat-info">
                <div class="chat-name">${groupIcon}${chat.name}</div>
                <div class="chat-preview">${lastMessage}</div>
            </div>
            ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
        `;
        
        // Для мобильных добавляем обработчик touch
        if (this.isMobile) {
            chatElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.selectChat(chat);
            });
        } else {
            chatElement.addEventListener('click', () => this.selectChat(chat));
        }
        
        chatsList.appendChild(chatElement);
    });
}

// Обновляем функцию показа модальных окон для мобильных
showSearchModal() {
    document.getElementById('search-modal').classList.add('active');
    document.getElementById('user-search-input').value = '';
    
    // На мобильных фокусируемся с задержкой
    if (this.isMobile) {
        setTimeout(() => {
            document.getElementById('user-search-input').focus();
        }, 300);
    } else {
        document.getElementById('user-search-input').focus();
    }
    
    document.getElementById('user-search-results').innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <p>Начните вводить имя пользователя</p>
        </div>
    `;
}
