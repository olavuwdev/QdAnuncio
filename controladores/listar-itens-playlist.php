<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('GET');
$cliente = autenticar();
$clientId = $cliente['clientId'];

$id = $_GET['id'] ?? null;
if (!$id) json_error('ID obrigatório');

try {
    $stmt = $pdo->prepare('SELECT id FROM playlists WHERE id = ? AND client_id = ?');
    $stmt->execute([$id, $clientId]);
    if (!$stmt->fetch()) json_error('Playlist não encontrada', 404);

    $stmt = $pdo->prepare(
        'SELECT pi.*, ma.media_type, ma.title, ma.file_url, ma.mime_type,
                ma.width_px, ma.height_px, ma.duration_ms AS video_duration_ms
         FROM playlist_items pi
         JOIN media_assets ma ON ma.id = pi.media_id
         WHERE pi.playlist_id = ?
         ORDER BY pi.sort_order ASC'
    );
    $stmt->execute([$id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    json_error('Erro ao buscar itens', 500);
}
