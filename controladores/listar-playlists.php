<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('GET');
$cliente = autenticar();
$clientId = $cliente['clientId'];

try {
    $stmt = $pdo->prepare('SELECT * FROM playlists WHERE client_id = ? ORDER BY created_at DESC');
    $stmt->execute([$clientId]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    json_error('Erro ao buscar playlists', 500);
}
