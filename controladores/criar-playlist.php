<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('POST');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$body = get_json_body();
$name = $body['name'] ?? '';
if (!$name) json_error('Nome é obrigatório');

try {
    $stmt = $pdo->prepare('INSERT INTO playlists (client_id, name) VALUES (?, ?)');
    $stmt->execute([$clientId, $name]);

    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM playlists WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC), 201);
} catch (Exception $e) {
    json_error('Erro ao criar playlist', 500);
}
