<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('PATCH');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$body = get_json_body();
$fields = [];
$values = [];

$allowed_transitions = ['FADE', 'SLIDE', 'ZOOM'];

if (isset($body['transition_type'])) {
    if (!in_array($body['transition_type'], $allowed_transitions)) {
        json_error('transition_type inválido');
    }
    $fields[] = 'transition_type = ?';
    $values[] = $body['transition_type'];
}
if (isset($body['transition_duration_ms'])) { $fields[] = 'transition_duration_ms = ?'; $values[] = $body['transition_duration_ms']; }
if (isset($body['default_image_duration_ms'])) { $fields[] = 'default_image_duration_ms = ?'; $values[] = $body['default_image_duration_ms']; }
if (isset($body['mute_videos'])) { $fields[] = 'mute_videos = ?'; $values[] = $body['mute_videos'] ? 1 : 0; }
if (isset($body['fullscreen_mode'])) { $fields[] = 'fullscreen_mode = ?'; $values[] = $body['fullscreen_mode'] ? 1 : 0; }

if (empty($fields)) json_error('Nada para atualizar');

$values[] = $clientId;

try {
    $stmt = $pdo->prepare('SELECT id FROM client_settings WHERE client_id = ?');
    $stmt->execute([$clientId]);
    if (!$stmt->fetch()) {
        $pdo->prepare('INSERT INTO client_settings (client_id) VALUES (?)')->execute([$clientId]);
    }

    $sql = 'UPDATE client_settings SET ' . implode(', ', $fields) . ' WHERE client_id = ?';
    $pdo->prepare($sql)->execute($values);

    $stmt = $pdo->prepare('SELECT * FROM client_settings WHERE client_id = ?');
    $stmt->execute([$clientId]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    json_error('Erro ao atualizar configurações', 500);
}
