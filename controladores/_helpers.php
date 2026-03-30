<?php

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error($message, $status = 400) {
    json_response(['error' => $message], $status);
}

function get_json_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_method($method) {
    $method = strtoupper($method);
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        http_response_code(204);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        json_error('Método não permitido', 405);
    }
}

function require_methods($methods) {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        http_response_code(204);
        exit;
    }
    $methods = array_map('strtoupper', $methods);
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods)) {
        json_error('Método não permitido', 405);
    }
}

function generate_uuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
