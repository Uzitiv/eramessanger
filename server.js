const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных
const db = new sqlite3.Database(':memory:');

// Создание таблиц
db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    status TEXT DEFAULT 'в сети',
    avatar TEXT,
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица сообщений
  db.run(`CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  )`);

  // Таблица чатов
  db.run(`CREATE TABLE chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER,
    user2_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id)
  )`);

  // Создаем тестовых пользователей
  bcrypt.hash('password123', 10, (err, hash) => {
    if (!err) {
      db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)', 
        ['user1', hash, 'Анна']);
      db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)', 
        ['user2', hash, 'Иван']);
      db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)', 
        ['user3', hash, 'Мария']);
    }
  });
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

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (username, password, name, settings) VALUES (?, ?, ?, ?)', 
      [username, hashedPassword, name, JSON.stringify({})], function(err) {
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
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            name: user.name, 
            status: user.status,
            avatar: user.avatar
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

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Запрос должен содержать минимум 2 символа' });
  }

  db.all(`SELECT id, username, name, status, avatar FROM users 
          WHERE (username LIKE ? OR name LIKE ?) AND id != ?`, 
    [`%${query}%`, `%${query}%`, req.user.id], (err, users) => {
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
    SELECT c.id, 
           CASE 
             WHEN c.user1_id = ? THEN u2.id 
             ELSE u1.id 
           END as other_user_id,
           CASE 
             WHEN c.user1_id = ? THEN u2.name 
             ELSE u1.name 
           END as name,
           CASE 
             WHEN c.user1_id = ? THEN u2.username 
             ELSE u1.username 
           END as username,
           CASE 
             WHEN c.user1_id = ? THEN u2.status 
             ELSE u1.status 
           END as status,
           CASE 
             WHEN c.user1_id = ? THEN u2.avatar 
             ELSE u1.avatar 
           END as avatar,
           (SELECT text FROM messages 
            WHERE (sender_id = ? AND receiver_id = other_user_id) 
               OR (sender_id = other_user_id AND receiver_id = ?) 
            ORDER BY time DESC LIMIT 1) as lastMessage,
           (SELECT COUNT(*) FROM messages 
            WHERE sender_id = other_user_id AND receiver_id = ? AND read = FALSE) as unread
    FROM chats c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    WHERE c.user1_id = ? OR c.user2_id = ?
  `;

  db.all(query, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId], 
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

  db.get('SELECT * FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)', 
    [chatId, userId, userId], (err, chat) => {
      if (err || !chat) {
        return res.status(404).json({ error: 'Чат не найден' });
      }

      const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

      db.all(`
        SELECT m.*, 
               u.name as sender_name,
               CASE 
                 WHEN m.sender_id = ? THEN 'outgoing' 
                 ELSE 'incoming' 
               END as type
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) 
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.time ASC
      `, [userId, userId, otherUserId, otherUserId, userId], (err, messages) => {
        if (err) {
          console.error('Messages error:', err);
          return res.status(500).json({ error: 'Ошибка загрузки сообщений' });
        }
        res.json(messages);
      });
    });
});

// Отправка сообщения
app.post('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  db.get('SELECT * FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)', 
    [chatId, userId, userId], (err, chat) => {
      if (err || !chat) {
        return res.status(404).json({ error: 'Чат не найден' });
      }

      const receiverId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

      db.run('INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)', 
        [userId, receiverId, text.trim()], function(err) {
          if (err) {
            console.error('Send message error:', err);
            return res.status(500).json({ error: 'Ошибка отправки сообщения' });
          }

          // Получаем созданное сообщение
          db.get(`
            SELECT m.*, 
                   u.name as sender_name,
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
  db.get('SELECT id FROM users WHERE id = ?', [otherUserId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, существует ли уже чат
    db.get(`SELECT * FROM chats 
            WHERE (user1_id = ? AND user2_id = ?) 
               OR (user1_id = ? AND user2_id = ?)`, 
      [currentUserId, otherUserId, otherUserId, currentUserId], (err, existingChat) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка сервера' });
        }

        if (existingChat) {
          return res.json({ id: existingChat.id, message: 'Чат уже существует' });
        }

        // Создаем новый чат
        db.run('INSERT INTO chats (user1_id, user2_id) VALUES (?, ?)', 
          [currentUserId, otherUserId], function(err) {
            if (err) {
              console.error('Create chat error:', err);
              return res.status(500).json({ error: 'Ошибка создания чата' });
            }

            res.json({ id: this.lastID, message: 'Чат успешно создан' });
          });
      });
  });
});

// Обновление профиля
app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, status, avatar } = req.body;
  const userId = req.user.id;

  db.run('UPDATE users SET name = ?, status = ?, avatar = ? WHERE id = ?', 
    [name, status, avatar, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка обновления профиля' });
      }

      // Получаем обновленного пользователя
      db.get('SELECT id, username, name, status, avatar FROM users WHERE id = ?', 
        [userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка получения профиля' });
          }
          res.json({ user, message: 'Профиль обновлен' });
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
        windowOpacity: 0.9,
        fontSize: '14px',
        background: {
          type: 'gradient',
          value: 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }
      };
      res.json(settings);
    } catch (e) {
      res.json({
        windowOpacity: 0.9,
        fontSize: '14px',
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

// Загрузка аватарки (демо-версия)
app.post('/api/upload/avatar', authenticateToken, (req, res) => {
  // В реальном приложении здесь была бы загрузка файла
  const { avatarData } = req.body;
  
  if (!avatarData) {
    return res.status(400).json({ error: 'Данные аватарки отсутствуют' });
  }

  res.json({ 
    success: true, 
    avatarUrl: avatarData,
    message: 'Аватар успешно обновлен' 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`📱 Открой http://localhost:${PORT} в браузере`);
});
