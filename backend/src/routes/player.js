const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/player/active — retorna settings + itens da playlist ativa
router.get('/active', auth, async (req, res) => {
  try {
    const [settingsRows] = await pool.query(
      'SELECT * FROM client_settings WHERE client_id = ?',
      [req.clientId]
    );
    const settings = settingsRows[0] || {
      transition_type: 'FADE',
      transition_duration_ms: 600,
      default_image_duration_ms: 7000,
      mute_videos: 1,
      fullscreen_mode: 1,
    };

    const [items] = await pool.query(
      `SELECT
         ma.id AS media_id,
         ma.media_type,
         ma.title,
         ma.file_url,
         ma.mime_type,
         ma.width_px,
         ma.height_px,
         ma.duration_ms AS video_duration_ms,
         pi.id AS item_id,
         pi.sort_order,
         CASE
           WHEN ma.media_type = 'IMAGE'
             THEN COALESCE(pi.image_duration_ms, cs.default_image_duration_ms)
           ELSE NULL
         END AS image_duration_ms_effective
       FROM playlists p
       JOIN playlist_items pi ON pi.playlist_id = p.id
       JOIN media_assets ma ON ma.id = pi.media_id
       JOIN client_settings cs ON cs.client_id = p.client_id
       WHERE p.client_id = ?
         AND p.is_active = 1
         AND pi.is_active = 1
         AND ma.is_active = 1
       ORDER BY pi.sort_order ASC`,
      [req.clientId]
    );

    return res.json({ settings, items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar playlist ativa' });
  }
});

module.exports = router;
