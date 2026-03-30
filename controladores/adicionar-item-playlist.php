<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('POST');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$playlistId = $_GET['id'] ?? null;
if (!$playlistId) json_error('ID da playlist obrigatório');

$body = get_json_body();
$media_id = $body['media_id'] ?? null;
if (!$media_id) json_error('media_id é obrigatório');

try {
    $stmt = $pdo->prepare('SELECT id FROM playlists WHERE id = ? AND client_id = ?');
    $stmt->execute([$playlistId, $clientId]);
    if (!$stmt->fetch()) json_error('Playlist não encontrada', 404);

    $stmt = $pdo->prepare('SELECT id FROM media_assets WHERE id = ? AND client_id = ?');
    $stmt->execute([$media_id, $clientId]);
    if (!$stmt->fetch()) json_error('Mídia não encontrada', 404);

    $sort_order = $body['sort_order'] ?? null;
    if ($sort_order === null) {
        $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) AS maxOrd FROM playlist_items WHERE playlist_id = ?');
        $stmt->execute([$playlistId]);
        $sort_order = $stmt->fetch(PDO::FETCH_ASSOC)['maxOrd'] + 1;
    }

    $image_duration_ms = $body['image_duration_ms'] ?? null;

    $stmt = $pdo->prepare('INSERT INTO playlist_items (playlist_id, media_id, sort_order, image_duration_ms) VALUES (?, ?, ?, ?)');
    $stmt->execute([$playlistId, $media_id, $sort_order, $image_duration_ms]);

    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM playlist_items WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC), 201);
} catch (Exception $e) {
    json_error('Erro ao adicionar item', 500);
}
