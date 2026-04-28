#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AUTH_PORT = parseInt(process.env.AUTH_PORT || '5050', 10);
const MONGO_URI = process.env.MONGO_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

if (!MONGO_URI) {
    console.error('Missing MONGO_URI environment variable.');
    process.exit(1);
}

if (!JWT_SECRET) {
    console.error('Missing JWT_SECRET environment variable.');
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
}, {
    timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const createToken = (user) => jwt.sign(
    { sub: String(user._id), email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
);

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.sub).lean();
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        return next();
    } catch (_error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const existing = await User.findOne({ email }).lean();
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const created = await User.create({ email, passwordHash });
        const token = createToken(created);
        return res.status(201).json({
            token,
            user: {
                id: String(created._id),
                email: created.email
            }
        });
    } catch (_error) {
        return res.status(500).json({ message: 'Failed to register user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = createToken(user);
        return res.json({
            token,
            user: {
                id: String(user._id),
                email: user.email
            }
        });
    } catch (_error) {
        return res.status(500).json({ message: 'Failed to login user' });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: String(req.user._id),
            email: req.user.email
        }
    });
});

const run = async () => {
    await mongoose.connect(MONGO_URI);
    app.listen(AUTH_PORT, () => {
        console.info(`Auth server listening on port ${AUTH_PORT}`);
    });
};

run().catch((error) => {
    console.error('Failed to start auth server:', error);
    process.exit(1);
});
