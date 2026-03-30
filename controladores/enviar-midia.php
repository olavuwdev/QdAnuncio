<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

require_method('POST');
$cliente = autenticar();
$clientId = $cliente['clientId'];

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    json_error('Arquivo obrigatório');
}

$file = $_FILES['file'];
$allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];

if (!in_array($file['type'], $allowed)) {
    json_error('Tipo de arquivo não permitido');
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$newName = bin2hex(random_bytes(16)) . '.' . $ext;
$dest = __DIR__ . '/../uploads/' . $newName;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('Erro ao salvar arquivo', 500);
}

$isVideo = str_starts_with($file['type'], 'video/');
$mediaType = $isVideo ? 'VIDEO' : 'IMAGE';
$fileUrl = '/uploads/' . $newName;
$title = $_POST['title'] ?? $file['name'];
$width_px = isset($_POST['width_px']) ? (int)$_POST['width_px'] : null;
$height_px = isset($_POST['height_px']) ? (int)$_POST['height_px'] : null;
$duration_ms = isset($_POST['duration_ms']) ? (int)$_POST['duration_ms'] : null;

try {
    $stmt = $pdo->prepare(
        'INSERT INTO media_assets (client_id, media_type, title, file_name, file_url, mime_type, file_size_bytes, width_px, height_px, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $clientId, $mediaType, $title, $newName, $fileUrl,
        $file['type'], $file['size'], $width_px, $height_px, $duration_ms,
    ]);

    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM media_assets WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch(PDO::FETCH_ASSOC), 201);
} catch (Exception $e) {
    json_error('Erro ao salvar mídia', 500);
}
