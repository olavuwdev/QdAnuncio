<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('PUT');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$playlistId = $_GET['id'] ?? null;
if (!$playlistId) json_error('ID da playlist obrigatório');

$body = get_json_body();
$items = $body['items'] ?? null;
if (!is_array($items)) json_error('items deve ser um array');

try {
    $stmt = $pdo->prepare('SELECT id FROM playlists WHERE id = ? AND client_id = ?');
    $stmt->execute([$playlistId, $clientId]);
    if (!$stmt->fetch()) json_error('Playlist não encontrada', 404);

    $update = $pdo->prepare('UPDATE playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?');
    foreach ($items as $item) {
        $update->execute([$item['sort_order'], $item['id'], $playlistId]);
    }

    json_response(['message' => 'Ordem atualizada']);
} catch (Exception $e) {
    json_error('Erro ao reordenar', 500);
}
