<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('PATCH');
$cliente = autenticar();

$playlistId = $_GET['id'] ?? null;
$itemId = $_GET['item_id'] ?? null;
if (!$playlistId || !$itemId) json_error('ID da playlist e item_id são obrigatórios');

$body = get_json_body();
$fields = [];
$values = [];

if (isset($body['sort_order'])) { $fields[] = 'sort_order = ?'; $values[] = $body['sort_order']; }
if (isset($body['image_duration_ms'])) { $fields[] = 'image_duration_ms = ?'; $values[] = $body['image_duration_ms']; }
if (isset($body['is_active'])) { $fields[] = 'is_active = ?'; $values[] = $body['is_active'] ? 1 : 0; }

if (empty($fields)) json_error('Nada para atualizar');

$values[] = $itemId;
$values[] = $playlistId;

try {
    $sql = 'UPDATE playlist_items SET ' . implode(', ', $fields) . ' WHERE id = ? AND playlist_id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) json_error('Item não encontrado', 404);

    $stmt = $pdo->prepare('SELECT * FROM playlist_items WHERE id = ?');
    $stmt->execute([$itemId]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    json_error('Erro ao atualizar item', 500);
}
