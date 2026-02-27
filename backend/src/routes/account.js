const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/account
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, document, display_name, is_active, created_at FROM clients WHERE id = ?',
      [req.clientId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar conta' });
  }
});

// PATCH /api/account — atualizar nome
router.patch('/', auth, async (req, res) => {
  const { display_name } = req.body;
  if (!display_name) return res.status(400).json({ error: 'display_name é obrigatório' });

  try {
    await pool.query(
      'UPDATE clients SET display_name = ? WHERE id = ?',
      [display_name, req.clientId]
    );
    const [rows] = await pool.query(
      'SELECT id, document, display_name, is_active, created_at FROM clients WHERE id = ?',
      [req.clientId]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

// POST /api/account/change-password
router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });

  if (new_password.length < 6)
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });

  try {
    const [rows] = await pool.query(
      'SELECT password_hash FROM clients WHERE id = ?',
      [req.clientId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE clients SET password_hash = ? WHERE id = ?', [hash, req.clientId]);

    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
