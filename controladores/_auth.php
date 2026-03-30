<?php

define('JWT_SECRET', 'qdanuncio_jwt_secret_2026_change_in_prod');
define('JWT_EXPIRES_HOURS', 8);

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode($payload, $secret = JWT_SECRET) {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['exp'] = $payload['exp'] ?? time() + (JWT_EXPIRES_HOURS * 3600);
    $pay = base64url_encode(json_encode($payload));
    $sig = base64url_encode(hash_hmac('sha256', "$header.$pay", $secret, true));
    return "$header.$pay.$sig";
}

function jwt_decode($token, $secret = JWT_SECRET) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $sig] = $parts;

    $valid_sig = base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if (!hash_equals($valid_sig, $sig)) return null;

    $data = json_decode(base64url_decode($payload), true);
    if (!$data) return null;

    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
}

function autenticar() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header) {
        json_error('Token não fornecido', 401);
    }

    $token = str_starts_with($header, 'Bearer ') ? substr($header, 7) : $header;
    $payload = jwt_decode($token);

    if (!$payload || !isset($payload['clientId'])) {
        json_error('Token inválido ou expirado', 401);
    }

    return $payload;
}
