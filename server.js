const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Создаем папку для базы данных если её нет
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Инициализация базы данных (файловая вместо in-memory)
const db = new sqlite3.Database('./data/messenger.db');

// Создание таблиц с улучшенной структурой
db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    status TEXT DEFAULT 'в сети',
    avatar TEXT,
    settings TEXT DEFAULT '{}',
    allow_group_invites BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица сообщений
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    attachment TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  )`);

  // Таблица чатов
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER,
    user2_id INTEGER,
    is_group BOOLEAN DEFAULT FALSE,
    group_name TEXT,
    group_avatar TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message TEXT DEFAULT '',
    last_message_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

  // Таблица участников групп
  db.run(`CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    user_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES chats(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(group_id, user_id)
  )`);
});

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = user;
    next();
  });
};

// Регистрация
app.post('/api/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Имя пользователя должно содержать минимум 3 символа' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (username, password, name, settings) VALUES (?, ?, ?, ?)', 
      [username, hashedPassword, name, JSON.stringify({
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
        background: {
          type: 'gradient',
          value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }
      })], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
          }
          return res.status(500).json({ error: 'Ошибка сервера' });
        }

        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
        res.json({ 
          token, 
          user: { 
            id: this.lastID, 
            username, 
            name, 
            status: 'в сети',
            avatar: null
          } 
        });
      });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Авторизация
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Неверное имя пользователя или пароль' });
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
        
        // Получаем настройки пользователя
        let settings = {};
        try {
          settings = user.settings ? JSON.parse(user.settings) : {};
        } catch (e) {
          settings = {};
        }

        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            name: user.name, 
            status: user.status,
            avatar: user.avatar,
            allow_group_invites: user.allow_group_invites,
            settings: settings
          } 
        });
      } else {
        res.status(400).json({ error: 'Неверное имя пользователя или пароль' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
});

// Поиск пользователей
app.get('/api/users/search', authenticateToken, (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Запрос должен содержать минимум 2 символа' });
  }

  const searchQuery = `%${query.trim()}%`;
  
  db.all(`SELECT id, username, name, status, avatar FROM users 
          WHERE (username LIKE ? OR name LIKE ?) AND id != ? 
          ORDER BY 
            CASE WHEN username LIKE ? THEN 1 ELSE 2 END,
            name ASC`, 
    [searchQuery, searchQuery, req.user.id, searchQuery], (err, users) => {
      if (err) {
        console.error('Search error:', err);
        return res.status(500).json({ error: 'Ошибка поиска' });
      }
      res.json(users);
    });
});

// Получение списка чатов
app.get('/api/chats', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      c.id,
      c.is_group,
      c.group_name,
      c.group_avatar,
      CASE 
        WHEN c.is_group = 1 THEN c.group_name
        WHEN c.user1_id = ? THEN u2.name 
        ELSE u1.name 
      END as name,
      CASE 
        WHEN c.is_group = 1 THEN 'группа'
        WHEN c.user1_id = ? THEN u2.status 
        ELSE u1.status 
      END as status,
      CASE 
        WHEN c.is_group = 1 THEN c.group_avatar
        WHEN c.user1_id = ? THEN u2.avatar 
        ELSE u1.avatar 
      END as avatar,
      c.last_message as lastMessage,
      c.last_message_time as lastMessageTime,
      (SELECT COUNT(*) FROM messages 
       WHERE chat_id = c.id AND receiver_id = ? AND read = FALSE) as unread
    FROM chats c
    LEFT JOIN users u1 ON c.user1_id = u1.id
    LEFT JOIN users u2 ON c.user2_id = u2.id
    WHERE c.id IN (
      SELECT chat_id FROM (
        SELECT id as chat_id FROM chats WHERE user1_id = ? OR user2_id = ?
        UNION
        SELECT group_id as chat_id FROM group_members WHERE user_id = ?
      )
    )
    ORDER BY c.last_message_time DESC
  `;

  db.all(query, [userId, userId, userId, userId, userId, userId, userId], 
    (err, chats) => {
      if (err) {
        console.error('Chats error:', err);
        return res.status(500).json({ error: 'Ошибка загрузки чатов' });
      }
      res.json(chats);
    });
});

// Получение сообщений чата
app.get('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  // Проверяем доступ к чату
  const checkQuery = `
    SELECT c.* FROM chats c
    LEFT JOIN group_members gm ON c.id = gm.group_id
    WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ? OR gm.user_id = ?)
  `;
  
  db.get(checkQuery, [chatId, userId, userId, userId], (err, chat) => {
    if (err || !chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    db.all(`
      SELECT 
        m.*,
        u.name as sender_name,
        u.avatar as sender_avatar,
        CASE 
          WHEN m.sender_id = ? THEN 'outgoing' 
          ELSE 'incoming' 
        END as type
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.time ASC
    `, [userId, chatId], (err, messages) => {
      if (err) {
        console.error('Messages error:', err);
        return res.status(500).json({ error: 'Ошибка загрузки сообщений' });
      }

      // Помечаем сообщения как прочитанные
      db.run('UPDATE messages SET read = TRUE WHERE chat_id = ? AND receiver_id = ? AND read = FALSE', 
        [chatId, userId]);

      res.json(messages);
    });
  });
});

// Отправка сообщения
app.post('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const { text, attachment } = req.body;
  const userId = req.user.id;

  if ((!text || text.trim() === '') && !attachment) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  // Проверяем доступ к чату
  const checkQuery = `
    SELECT c.* FROM chats c
    LEFT JOIN group_members gm ON c.id = gm.group_id
    WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ? OR gm.user_id = ?)
  `;
  
  db.get(checkQuery, [chatId, userId, userId, userId], (err, chat) => {
    if (err || !chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    let receiverId = null;
    if (!chat.is_group) {
      receiverId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
    }

    db.run(`INSERT INTO messages (chat_id, sender_id, receiver_id, text, attachment) VALUES (?, ?, ?, ?, ?)`, 
      [chatId, userId, receiverId, text ? text.trim() : null, attachment], function(err) {
        if (err) {
          console.error('Send message error:', err);
          return res.status(500).json({ error: 'Ошибка отправки сообщения' });
        }

        // Обновляем последнее сообщение в чате
        const lastMessage = attachment ? 'Файл' : (text ? text.trim() : '');
        db.run(`UPDATE chats SET last_message = ?, last_message_time = CURRENT_TIMESTAMP WHERE id = ?`, 
          [lastMessage, chatId]);

        // Получаем созданное сообщение
        db.get(`
          SELECT 
            m.*,
            u.name as sender_name,
            u.avatar as sender_avatar,
            'outgoing' as type
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [this.lastID], (err, message) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка получения сообщения' });
          }
          res.json(message);
        });
      });
  });
});

// Создание нового чата
app.post('/api/chats', authenticateToken, (req, res) => {
  const { userId: otherUserId } = req.body;
  const currentUserId = req.user.id;

  if (currentUserId === otherUserId) {
    return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
  }

  // Проверяем существование пользователя
  db.get('SELECT id, username, name, avatar FROM users WHERE id = ?', [otherUserId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, существует ли уже чат
    db.get(`SELECT id FROM chats 
            WHERE (user1_id = ? AND user2_id = ?) 
               OR (user1_id = ? AND user2_id = ?)`, 
      [currentUserId, otherUserId, otherUserId, currentUserId], (err, existingChat) => {
        if (err) {
          console.error('Check existing chat error:', err);
          return res.status(500).json({ error: 'Ошибка сервера' });
        }

        if (existingChat) {
          return res.json({ 
            id: existingChat.id, 
            message: 'Чат уже существует',
            exists: true 
          });
        }

        // Создаем новый чат
        db.run(`INSERT INTO chats (user1_id, user2_id, last_message) VALUES (?, ?, ?)`, 
          [currentUserId, otherUserId, 'Чат создан'], function(err) {
            if (err) {
              console.error('Create chat error:', err);
              return res.status(500).json({ error: 'Ошибка создания чата' });
            }

            res.json({ 
              id: this.lastID, 
              message: 'Чат успешно создан',
              user: user
            });
          });
      });
  });
});

// Создание группы
app.post('/api/groups', authenticateToken, (req, res) => {
  const { groupName, userIds } = req.body;
  const currentUserId = req.user.id;

  if (!groupName || !userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ error: 'Неверные данные для создания группы' });
  }

  // Проверяем, разрешено ли добавлять пользователей
  const placeholders = userIds.map(() => '?').join(',');
  const checkQuery = `SELECT id, username, allow_group_invites FROM users WHERE id IN (${placeholders})`;
  
  db.all(checkQuery, userIds, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка проверки пользователей' });
    }

    const notAllowedUsers = users.filter(user => !user.allow_group_invites);
    if (notAllowedUsers.length > 0) {
      const usernames = notAllowedUsers.map(u => u.username).join(', ');
      return res.status(400).json({ 
        error: `Следующие пользователи запретили добавлять себя в группы: ${usernames}` 
      });
    }

    // Создаем группу
    db.run(`INSERT INTO chats (is_group, group_name, created_by, last_message) VALUES (?, ?, ?, ?)`, 
      [true, groupName.trim(), currentUserId, 'Группа создана'], function(err) {
        if (err) {
          console.error('Create group error:', err);
          return res.status(500).json({ error: 'Ошибка создания группы' });
        }

        const groupId = this.lastID;

        // Добавляем создателя в группу
        const members = [currentUserId, ...userIds];
        const insertMembers = () => {
          if (members.length === 0) {
            // Все участники добавлены
            res.json({ 
              id: groupId, 
              message: 'Группа успешно создана'
            });
            return;
          }

          const memberId = members.shift();
          db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', 
            [groupId, memberId], function(err) {
              if (err) {
                console.error('Add member error:', err);
              }
              insertMembers();
            });
        };

        insertMembers();
      });
  });
});

// Обновление профиля
app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, status, avatar, allow_group_invites } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Имя не может быть пустым' });
  }

  db.run('UPDATE users SET name = ?, status = ?, avatar = ?, allow_group_invites = ? WHERE id = ?', 
    [name.trim(), status || 'в сети', avatar, allow_group_invites !== undefined ? allow_group_invites : true, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка обновления профиля' });
      }

      // Получаем обновленного пользователя
      db.get('SELECT id, username, name, status, avatar, allow_group_invites, settings FROM users WHERE id = ?', 
        [userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка получения профиля' });
          }

          let settings = {};
          try {
            settings = user.settings ? JSON.parse(user.settings) : {};
          } catch (e) {
            settings = {};
          }

          res.json({ 
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              status: user.status,
              avatar: user.avatar,
              allow_group_invites: user.allow_group_invites,
              settings: settings
            }, 
            message: 'Профиль обновлен' 
          });
        });
    });
});

// Смена username
app.put('/api/profile/username', authenticateToken, (req, res) => {
  const { username } = req.body;
  const userId = req.user.id;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username должен содержать минимум 3 символа' });
  }

  const newUsername = username.trim();

  // Проверяем, не занят ли username
  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, userId], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Этот username уже занят' });
    }

    // Обновляем username
    db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка обновления username' });
      }

      // Генерируем новый токен
      const newToken = jwt.sign({ id: userId, username: newUsername }, JWT_SECRET);

      // Получаем обновленного пользователя
      db.get('SELECT id, username, name, status, avatar, allow_group_invites, settings FROM users WHERE id = ?', 
        [userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка получения профиля' });
          }

          let settings = {};
          try {
            settings = user.settings ? JSON.parse(user.settings) : {};
          } catch (e) {
            settings = {};
          }

          res.json({ 
            token: newToken,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              status: user.status,
              avatar: user.avatar,
              allow_group_invites: user.allow_group_invites,
              settings: settings
            }, 
            message: 'Username успешно изменен' 
          });
        });
    });
  });
});

// Получение настроек
app.get('/api/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get('SELECT settings FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения настроек' });
    }
    
    try {
      const settings = row?.settings ? JSON.parse(row.settings) : {
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
        background: {
          type: 'gradient',
          value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }
      };
      res.json(settings);
    } catch (e) {
      res.json({
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
        background: {
          type: 'gradient',
          value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }
      });
    }
  });
});

// Сохранение настроек
app.post('/api/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const settings = req.body;

  db.run('UPDATE users SET settings = ? WHERE id = ?', 
    [JSON.stringify(settings), userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка сохранения настроек' });
      }
      res.json({ message: 'Настройки сохранены' });
    });
});

// Загрузка файла
app.post('/api/upload', authenticateToken, express.raw({type: '*/*', limit: '10mb'}), (req, res) => {
  const fileName = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const fileData = req.body.toString('base64');
  
  res.json({ 
    success: true, 
    fileUrl: `data:application/octet-stream;base64,${fileData}`,
    fileName: fileName
  });
});

// Получение информации о пользователе
app.get('/api/user/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;

  db.get('SELECT id, username, name, status, avatar, allow_group_invites FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`📱 Открой http://localhost:${PORT} в браузере`);
  console.log(`💾 База данных сохранена в файле ./data/messenger.db`);
});
