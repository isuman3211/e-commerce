<?php
// Simulate POST request for registration
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api/auth.php?action=register';
$_GET['action'] = 'register';

// Unique user for testing
$unique = uniqid();
$inputJSON = json_encode([
    "full_name" => "Test User $unique",
    "username" => "testuser_$unique",
    "email" => "test_$unique@example.com",
    "password" => "password123"
]);

// Mock input stream
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

// We need to bypass the actual file_get_contents in the target file
// Since we can't easily mock built-ins effectively without extensions, 
// I will reproduce the logic here by including config and running the code block.

require_once 'config/config.php';

echo "--- TESTING REGISTRATION ---\n";
try {
    // 1. Check Config/Connection
    if (!$pdo) {
        echo "ERROR: \$pdo is not defined.\n";
        exit;
    }
    echo "DB Connection: OK\n";

    // 2. Simulate Input Decoding
    $input = json_decode($inputJSON, true);

    // 3. Logic from api/auth.php (Register block)
    $full_name = sanitizeInput($input['full_name'] ?? '');
    $username = sanitizeInput($input['username'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        throw new Exception('Password too short');
    }

    // Check duplicates
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
    $stmt->execute(['u' => $username, 'e' => $email]);
    if ($stmt->fetch()) {
        echo "Error: Duplicate user found (Expected for existing, but this is new unique)\n";
    }

    // Insert
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