require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/db');

const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const playlistRoutes = require('./routes/playlists');
const settingsRoutes = require('./routes/settings');
const playerRoutes = require('./routes/player');
const accountRoutes = require('./routes/account');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads como estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/account', accountRoutes);

// Saúde
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, async () => {
  await testConnection();
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
