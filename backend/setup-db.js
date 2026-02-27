/**
 * Executa o setup.sql no banco de dados e opcionalmente cria um cliente inicial.
 * Uso: node setup-db.js
 * Para criar cliente: node setup-db.js --create-client
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
};

async function runSetup() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Conectado ao banco');

  const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
  await conn.query(sql);
  console.log('✅ Tabelas criadas/verificadas com sucesso');

  const createClient = process.argv.includes('--create-client');
  if (createClient) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(r => rl.question(q, r));

    const doc = (await ask('CPF/CNPJ (somente números): ')).trim().replace(/\D/g, '');
    const name = (await ask('Nome fantasia: ')).trim();
    const pass = (await ask('Senha: ')).trim();
    rl.close();

    const hash = await bcrypt.hash(pass, 12);
    try {
      const [r] = await conn.query(
        'INSERT INTO clients (document, display_name, password_hash) VALUES (?, ?, ?)',
        [doc, name, hash]
      );
      const clientId = r.insertId;
      await conn.query('INSERT INTO client_settings (client_id) VALUES (?)', [clientId]);
      await conn.query('INSERT INTO playlists (client_id, name, is_active) VALUES (?, ?, 1)', [clientId, 'Principal']);
      console.log(`✅ Cliente criado! ID: ${clientId}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.error('❌ CPF/CNPJ já cadastrado');
      } else {
        throw err;
      }
    }
  }

  await conn.end();
  console.log('🎉 Setup concluído!');
}

runSetup().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
