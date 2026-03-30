<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('GET');
$cliente = autenticar();
$clientId = $cliente['clientId'];

try {
    $stmt = $pdo->prepare('SELECT * FROM client_settings WHERE client_id = ?');
    $stmt->execute([$clientId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $pdo->prepare('INSERT INTO client_settings (client_id) VALUES (?)')->execute([$clientId]);
        $stmt->execute([$clientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    json_response($row);
} catch (Exception $e) {
    json_error('Erro ao buscar configurações', 500);
}
