<?php
$DB_HOST = 'mysql.ordenaaqui.com.br';
$DB_PORT = 3306;
$DB_NAME = 'ordenaaqui11';
$DB_USER = 'ordenaaqui11';
$DB_PASS = 'StudyOlavo1';

$pdo = new PDO(
    "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
    $DB_USER, $DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
