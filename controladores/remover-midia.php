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
    $stmt = $pdo->prepare('DELETE FROM media_assets WHERE id = ? AND client_id = ?');
    $stmt->execute([$id, $clientId]);

    if ($stmt->rowCount() === 0) json_error('Mídia não encontrada', 404);

    json_response(['message' => 'Mídia removida']);
} catch (Exception $e) {
    json_error('Erro ao remover mídia', 500);
}
