<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api/auth.php?action=register';
$_GET['action'] = 'register';
$unique = uniqid();
$inputJSON = json_encode([
    "full_name" => "Test User $unique",
    "username" => "testuser_$unique",
    "email" => "test_$unique@example.com",
    "password" => "password123"
]);
class InputStream
{
    public static $input;
}
InputStream::$input = $inputJSON;

function mock_file_get_contents($filename)
{
    if ($filename === 'php://input') {
        return InputStream::$input;
    }
    return \file_get_contents($filename);
}

require_once 'config/config.php';

echo "--- TESTING REGISTRATION ---\n";
try {
    if (!$pdo) {
        echo "ERROR: \$pdo is not defined.\n";
        exit;
    }
    echo "DB Connection: OK\n";

    $input = json_decode($inputJSON, true);
    $full_name = sanitizeInput($input['full_name'] ?? '');
    $username = sanitizeInput($input['username'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        throw new Exception('Password too short');
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
    $stmt->execute(['u' => $username, 'e' => $email]);
    if ($stmt->fetch()) {
        echo "Error: Duplicate user found (Expected for existing, but this is new unique)\n";
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, email, full_name, password_hash, role) VALUES (:u, :e, :f, :p, 'user')");

    if ($stmt->execute(['u' => $username, 'e' => $email, 'f' => $full_name, 'p' => $hash])) {
        echo "SUCCESS: User inserted with ID: " . $pdo->lastInsertId() . "\n";
    } else {
        echo "FAILURE: Execute returned false.\n";
        print_r($stmt->errorInfo());
    }

} catch (Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
echo "--- END TEST ---\n";
?>
