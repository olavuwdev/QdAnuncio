const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/db');

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 10 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { document, password } = req.body;

  if (!document || !password) {
    return res.status(400).json({ error: 'CPF/CNPJ e senha são obrigatórios' });
  }

  const doc = document.replace(/\D/g, '');
  if (doc.length !== 11 && doc.length !== 14) {
    return res.status(400).json({ error: 'CPF/CNPJ inválido' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, document, display_name, password_hash, is_active FROM clients WHERE document = ?',
      [doc]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const client = rows[0];

    if (!client.is_active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    const match = await bcrypt.compare(password, client.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { clientId: client.id, document: client.document },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      client: {
        id: client.id,
        document: client.document,
        displayName: client.display_name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout  (stateless JWT — apenas informativo)
router.post('/logout', (req, res) => {
  return res.json({ message: 'Logout realizado' });
});

module.exports = router;
