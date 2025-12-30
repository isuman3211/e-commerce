<?php
// api/auth.php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once '../config/config.php';

// Debug Logger
function logDebug($msg)
{
    try {
        file_put_contents(__DIR__ . '/debug_auth.log', date('[Y-m-d H:i:s] ') . $msg . PHP_EOL, FILE_APPEND);
    } catch (Throwable $t) {
        // Ignored
    }
}

logDebug("Request: " . $_SERVER['REQUEST_METHOD'] . " " . ($_GET['action'] ?? 'none'));

header('Content-Type: application/json');

// $pdo is now available globally from config.php

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method Not Allowed', 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input', 400);
    }

    $action = $_GET['action'] ?? '';

    if ($action === 'login') {
        $username = sanitizeInput($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            throw new Exception('Username and password are required', 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :u OR email = :u LIMIT 1");
        $stmt->execute(['u' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid username or password', 401);
        }

        loginUser($user);

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'role' => $user['role']
            ],
            'token' => session_id()
        ]);

    } elseif ($action === 'register') {
        $full_name = sanitizeInput($input['full_name'] ?? '');
        $username = sanitizeInput($input['username'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (!$full_name || !$username || !$email || !$password) {
            throw new Exception('All fields are required', 400);
        }

        if (strlen($password) < PASSWORD_MIN_LENGTH) {
            throw new Exception('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters', 400);
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
        $stmt->execute(['u' => $username, 'e' => $email]);
        if ($stmt->fetch()) {
            throw new Exception('Username or email already exists', 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, full_name, password_hash, role) VALUES (:u, :e, :f, :p, 'user')");
        $stmt->execute(['u' => $username, 'e' => $email, 'f' => $full_name, 'p' => $hash]);

        $userId = $pdo->lastInsertId();

        $user = [
            'id' => $userId,
            'username' => $username,
            'full_name' => $full_name,
            'role' => 'user'
        ];
        loginUser($user);

        echo json_encode([
            'success' => true,
            'user' => $user,
            'token' => session_id()
        ]);

    } else {
        throw new Exception('Invalid action', 400);
    }

} catch (Exception $e) {
    logDebug("Exception: " . $e->getMessage());
    // Return 200 to prevent Apache from replacing the body with default error page
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    logDebug("Throwable: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server Error']);
}
?>