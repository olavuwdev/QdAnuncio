<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('DELETE');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$id = $_GET['id'] ?? null;
if (!$id) json_error('ID obrigatório');

try {
    $pdo->prepare('DELETE FROM playlist_items WHERE playlist_id = ?')->execute([$id]);

    $stmt = $pdo->prepare('DELETE FROM playlists WHERE id = ? AND client_id = ?');
    $stmt->execute([$id, $clientId]);

    if ($stmt->rowCount() === 0) json_error('Playlist não encontrada', 404);

    json_response(['message' => 'Playlist removida']);
} catch (Exception $e) {
    json_error('Erro ao remover playlist', 500);
}
