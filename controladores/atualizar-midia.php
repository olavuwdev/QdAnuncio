<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('PATCH');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$id = $_GET['id'] ?? null;
if (!$id) json_error('ID obrigatório');

$body = get_json_body();
$fields = [];
$values = [];

if (isset($body['title'])) { $fields[] = 'title = ?'; $values[] = $body['title']; }
if (isset($body['is_active'])) { $fields[] = 'is_active = ?'; $values[] = $body['is_active'] ? 1 : 0; }

if (empty($fields)) json_error('Nada para atualizar');

$values[] = $id;
$values[] = $clientId;

try {
    $sql = 'UPDATE media_assets SET ' . implode(', ', $fields) . ' WHERE id = ? AND client_id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) json_error('Mídia não encontrada', 404);

    $stmt = $pdo->prepare('SELECT * FROM media_assets WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    json_error('Erro ao atualizar mídia', 500);
}
