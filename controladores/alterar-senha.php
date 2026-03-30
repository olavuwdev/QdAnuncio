<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('POST');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$body = get_json_body();
$current_password = $body['current_password'] ?? '';
$new_password = $body['new_password'] ?? '';

if (!$current_password || !$new_password) {
    json_error('Senha atual e nova senha são obrigatórias');
}

if (strlen($new_password) < 6) {
    json_error('Nova senha deve ter pelo menos 6 caracteres');
}

try {
    $stmt = $pdo->prepare('SELECT password_hash FROM clients WHERE id = ?');
    $stmt->execute([$clientId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) json_error('Cliente não encontrado', 404);

    if (!password_verify($current_password, $row['password_hash'])) {
        json_error('Senha atual incorreta', 401);
    }

    $hash = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('UPDATE clients SET password_hash = ? WHERE id = ?');
    $stmt->execute([$hash, $clientId]);

    json_response(['message' => 'Senha alterada com sucesso']);
} catch (Exception $e) {
    json_error('Erro ao alterar senha', 500);
}
