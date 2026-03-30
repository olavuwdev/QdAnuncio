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
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        $settings = [
            'transition_type' => 'FADE',
            'transition_duration_ms' => 600,
            'default_image_duration_ms' => 7000,
            'mute_videos' => 1,
            'fullscreen_mode' => 1,
        ];
    }

    $stmt = $pdo->prepare(
        "SELECT
           ma.id AS media_id,
           ma.media_type,
           ma.title,
           ma.file_url,
           ma.mime_type,
           ma.width_px,
           ma.height_px,
           ma.duration_ms AS video_duration_ms,
           pi.id AS item_id,
           pi.sort_order,
           CASE
             WHEN ma.media_type = 'IMAGE'
               THEN COALESCE(pi.image_duration_ms, cs.default_image_duration_ms)
             ELSE NULL
           END AS image_duration_ms_effective
         FROM playlists p
         JOIN playlist_items pi ON pi.playlist_id = p.id
         JOIN media_assets ma ON ma.id = pi.media_id
         JOIN client_settings cs ON cs.client_id = p.client_id
         WHERE p.client_id = ?
           AND p.is_active = 1
           AND pi.is_active = 1
           AND ma.is_active = 1
         ORDER BY pi.sort_order ASC"
    );
    $stmt->execute([$clientId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(['settings' => $settings, 'items' => $items]);
} catch (Exception $e) {
    json_error('Erro ao buscar playlist ativa', 500);
}
