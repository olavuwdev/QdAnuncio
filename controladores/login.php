<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('POST');

$body = get_json_body();
$document = $body['document'] ?? '';
$password = $body['password'] ?? '';

if (!$document || !$password) {
    json_error('CPF/CNPJ e senha são obrigatórios');
}

$doc = preg_replace('/\D/', '', $document);
if (strlen($doc) !== 11 && strlen($doc) !== 14) {
    json_error('CPF/CNPJ inválido');
}

try {
    $stmt = $pdo->prepare('SELECT id, document, display_name, password_hash, is_active FROM clients WHERE document = ?');
    $stmt->execute([$doc]);
    $client = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$client) {
        json_error('Credenciais inválidas', 401);
    }

    if (!$client['is_active']) {
        json_error('Conta desativada', 403);
    }

    if (!password_verify($password, $client['password_hash'])) {
        json_error('Credenciais inválidas', 401);
    }

    $token = jwt_encode([
        'clientId' => (int)$client['id'],
        'document' => $client['document'],
    ]);

    json_response([
        'token' => $token,
        'client' => [
            'id'          => (int)$client['id'],
            'document'    => $client['document'],
            'displayName' => $client['display_name'],
        ],
    ]);
} catch (Exception $e) {
    json_error('Erro interno do servidor', 500);
}
