const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/playlists
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM playlists WHERE client_id = ? ORDER BY created_at DESC',
      [req.clientId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar playlists' });
  }
});

// POST /api/playlists
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  try {
    const [result] = await pool.query(
      'INSERT INTO playlists (client_id, name) VALUES (?, ?)',
      [req.clientId, name]
    );
    const [rows] = await pool.query('SELECT * FROM playlists WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar playlist' });
  }
});

// PATCH /api/playlists/:id/activate — ativa uma playlist e desativa as demais
router.patch('/:id/activate', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE playlists SET is_active = 0 WHERE client_id = ?',
      [req.clientId]
    );
    const [result] = await pool.query(
      'UPDATE playlists SET is_active = 1 WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    return res.json({ message: 'Playlist ativada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao ativar playlist' });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM playlist_items WHERE playlist_id = ?', [id]);
    const [result] = await pool.query(
      'DELETE FROM playlists WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    return res.json({ message: 'Playlist removida' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao remover playlist' });
  }
});

// GET /api/playlists/:id/items
router.get('/:id/items', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [playlist] = await pool.query(
      'SELECT id FROM playlists WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (playlist.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });

    const [rows] = await pool.query(
      `SELECT pi.*, ma.media_type, ma.title, ma.file_url, ma.mime_type,
              ma.width_px, ma.height_px, ma.duration_ms AS video_duration_ms
       FROM playlist_items pi
       JOIN media_assets ma ON ma.id = pi.media_id
       WHERE pi.playlist_id = ?
       ORDER BY pi.sort_order ASC`,
      [id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

// POST /api/playlists/:id/items
router.post('/:id/items', auth, async (req, res) => {
  const { id } = req.params;
  const { media_id, sort_order, image_duration_ms } = req.body;
  if (!media_id) return res.status(400).json({ error: 'media_id é obrigatório' });

  try {
    const [playlist] = await pool.query(
      'SELECT id FROM playlists WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (playlist.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });

    const [media] = await pool.query(
      'SELECT id FROM media_assets WHERE id = ? AND client_id = ?',
      [media_id, req.clientId]
    );
    if (media.length === 0) return res.status(404).json({ error: 'Mídia não encontrada' });

    let order = sort_order;
    if (order === undefined) {
      const [maxRow] = await pool.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS maxOrd FROM playlist_items WHERE playlist_id = ?',
        [id]
      );
      order = maxRow[0].maxOrd + 1;
    }

    const [result] = await pool.query(
      'INSERT INTO playlist_items (playlist_id, media_id, sort_order, image_duration_ms) VALUES (?, ?, ?, ?)',
      [id, media_id, order, image_duration_ms || null]
    );
    const [rows] = await pool.query('SELECT * FROM playlist_items WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao adicionar item' });
  }
});

// PATCH /api/playlists/:id/items/:itemId
router.patch('/:id/items/:itemId', auth, async (req, res) => {
  const { id, itemId } = req.params;
  const { sort_order, image_duration_ms, is_active } = req.body;

  const fields = [];
  const values = [];

  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (image_duration_ms !== undefined) { fields.push('image_duration_ms = ?'); values.push(image_duration_ms); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(itemId, id);
  try {
    const [result] = await pool.query(
      `UPDATE playlist_items SET ${fields.join(', ')} WHERE id = ? AND playlist_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item não encontrado' });
    const [rows] = await pool.query('SELECT * FROM playlist_items WHERE id = ?', [itemId]);
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE /api/playlists/:id/items/:itemId
router.delete('/:id/items/:itemId', auth, async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?',
      [itemId, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item não encontrado' });
    return res.json({ message: 'Item removido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao remover item' });
  }
});

// PUT /api/playlists/:id/items/reorder — reordenar todos os itens
router.put('/:id/items/reorder', auth, async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // [{ id, sort_order }]

  if (!Array.isArray(items)) return res.status(400).json({ error: 'items deve ser um array' });

  try {
    const [playlist] = await pool.query(
      'SELECT id FROM playlists WHERE id = ? AND client_id = ?',
      [id, req.clientId]
    );
    if (playlist.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });

    for (const item of items) {
      await pool.query(
        'UPDATE playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?',
        [item.sort_order, item.id, id]
      );
    }
    return res.json({ message: 'Ordem atualizada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao reordenar' });
  }
});

module.exports = router;
