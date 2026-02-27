const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024 },
});

// POST /api/media — upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });

  const { title, width_px, height_px, duration_ms } = req.body;
  const isVideo = req.file.mimetype.startsWith('video/');
  const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    const [result] = await pool.query(
      `INSERT INTO media_assets
        (client_id, media_type, title, file_name, file_url, mime_type, file_size_bytes, width_px, height_px, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.clientId,
        mediaType,
        title || req.file.originalname,
        req.file.filename,
        fileUrl,
        req.file.mimetype,
        req.file.size,
        width_px ? parseInt(width_px) : null,
        height_px ? parseInt(height_px) : null,
        duration_ms ? parseInt(duration_ms) : null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM media_assets WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar mídia' });
  }
});

// GET /api/media — listar
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM media_assets WHERE client_id = ? ORDER BY created_at DESC',
      [req.clientId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar mídias' });
  }
});

// PATCH /api/media/:id — atualizar
router.patch('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, is_active } = req.body;

  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(id, req.clientId);
  try {
    const [result] = await pool.query(
      `UPDATE media_assets SET ${fields.join(', ')} WHERE id = ? AND client_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mídia não encontrada' });
    const [rows] = await pool.query('SELECT * FROM media_assets WHERE id = ?', [id]);
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar mídia' });
  }
});

// DELETE /api/media/:id
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM media_assets WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mídia não encontrada' });
    return res.json({ message: 'Mídia removida' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao remover mídia' });
  }
});

module.exports = router;
