<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('DELETE');
$cliente = autenticar();

$playlistId = $_GET['id'] ?? null;
$itemId = $_GET['item_id'] ?? null;
if (!$playlistId || !$itemId) json_error('ID da playlist e item_id são obrigatórios');

try {
    $stmt = $pdo->prepare('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?');
    $stmt->execute([$itemId, $playlistId]);

    if ($stmt->rowCount() === 0) json_error('Item não encontrado', 404);

    json_response(['message' => 'Item removido']);
} catch (Exception $e) {
    json_error('Erro ao remover item', 500);
}
