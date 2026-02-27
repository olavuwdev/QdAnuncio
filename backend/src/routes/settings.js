const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM client_settings WHERE client_id = ?',
      [req.clientId]
    );
    if (rows.length === 0) {
      // cria configuração padrão se não existir
      await pool.query('INSERT INTO client_settings (client_id) VALUES (?)', [req.clientId]);
      const [newRows] = await pool.query('SELECT * FROM client_settings WHERE client_id = ?', [req.clientId]);
      return res.json(newRows[0]);
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PATCH /api/settings
router.patch('/', auth, async (req, res) => {
  const {
    transition_type,
    transition_duration_ms,
    default_image_duration_ms,
    mute_videos,
    fullscreen_mode,
  } = req.body;

  const fields = [];
  const values = [];

  const allowed_transitions = ['FADE', 'SLIDE', 'ZOOM'];
  if (transition_type !== undefined) {
    if (!allowed_transitions.includes(transition_type))
      return res.status(400).json({ error: 'transition_type inválido' });
    fields.push('transition_type = ?'); values.push(transition_type);
  }
  if (transition_duration_ms !== undefined) { fields.push('transition_duration_ms = ?'); values.push(transition_duration_ms); }
  if (default_image_duration_ms !== undefined) { fields.push('default_image_duration_ms = ?'); values.push(default_image_duration_ms); }
  if (mute_videos !== undefined) { fields.push('mute_videos = ?'); values.push(mute_videos ? 1 : 0); }
  if (fullscreen_mode !== undefined) { fields.push('fullscreen_mode = ?'); values.push(fullscreen_mode ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.clientId);
  try {
    const [existing] = await pool.query('SELECT id FROM client_settings WHERE client_id = ?', [req.clientId]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO client_settings (client_id) VALUES (?)', [req.clientId]);
    }
    await pool.query(
      `UPDATE client_settings SET ${fields.join(', ')} WHERE client_id = ?`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM client_settings WHERE client_id = ?', [req.clientId]);
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

module.exports = router;
