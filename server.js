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
app.use(express.static('.'));

// Mock database
const users = [];
const chats = [];
const messages = [];

// Auth endpoints
app.post('/api/register', async (req, res) => {
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
});

app.post('/api/login', async (req, res) => {
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
});

// Mock data for development
app.get('/api/users/search', (req, res) => {
    const { query } = req.query;
    const results = users
        .filter(u => 
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase())
        )
        .map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            status: u.status
        }));
    
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`👥 Зарегистрировано пользователей: ${users.length}`);
});
