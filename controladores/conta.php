<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_methods(['GET', 'PATCH']);
$cliente = autenticar();
$clientId = $cliente['clientId'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare('SELECT id, document, display_name, is_active, created_at FROM clients WHERE id = ?');
        $stmt->execute([$clientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) json_error('Cliente não encontrado', 404);
        json_response($row);
    } catch (Exception $e) {
        json_error('Erro ao buscar conta', 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $body = get_json_body();
    $display_name = $body['display_name'] ?? '';
    if (!$display_name) json_error('display_name é obrigatório');

    try {
        $stmt = $pdo->prepare('UPDATE clients SET display_name = ? WHERE id = ?');
        $stmt->execute([$display_name, $clientId]);

        $stmt = $pdo->prepare('SELECT id, document, display_name, is_active, created_at FROM clients WHERE id = ?');
        $stmt->execute([$clientId]);
        json_response($stmt->fetch(PDO::FETCH_ASSOC));
    } catch (Exception $e) {
        json_error('Erro ao atualizar conta', 500);
    }
}
