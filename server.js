const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'messenger-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Mock database
const users = [];
const chats = [];
const messages = [];

// Auth endpoints
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const user = {
            id: users.length + 1,
            username,
            password: await bcrypt.hash(password, 10),
            name,
            status: 'в сети',
            avatar: null
        };
        
        users.push(user);
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                name: user.name,
                status: user.status
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Неверные данные' });
        }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                name: user.name,
                status: user.status
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
