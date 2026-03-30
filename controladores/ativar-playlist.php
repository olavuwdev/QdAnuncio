<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('PATCH');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$id = $_GET['id'] ?? null;
if (!$id) json_error('ID obrigatório');

try {
    $pdo->prepare('UPDATE playlists SET is_active = 0 WHERE client_id = ?')->execute([$clientId]);

    $stmt = $pdo->prepare('UPDATE playlists SET is_active = 1 WHERE id = ? AND client_id = ?');
    $stmt->execute([$id, $clientId]);

    if ($stmt->rowCount() === 0) json_error('Playlist não encontrada', 404);

    json_response(['message' => 'Playlist ativada']);
} catch (Exception $e) {
    json_error('Erro ao ativar playlist', 500);
}
