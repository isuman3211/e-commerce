<?php
date_default_timezone_set('Africa/Addis_Ababa');

$host = 'localhost';
$dbname = 'etho';
$username = 'root';
$password = 'isuman@3';
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'use_strict_mode' => true,
        'cookie_samesite' => 'Lax',
        'cookie_lifetime' => 0,
    ]);
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    die(json_encode([
        'success' => false,
        'message' => "ERROR: Could not connect to Database. " . $e->getMessage()
    ]));
}

define('PASSWORD_MIN_LENGTH', 6);

function isLoggedIn(): bool
{
    return isset($_SESSION['user_id']);
}

function sanitizeInput(string $data): string
{
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function loginUser(array $user): void
{
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role'] = $user['role'];
}

function logoutUser(): void
{
    session_unset();
    session_destroy();
}
?>
