<?php
require_once 'config/config.php';

try {
    $stmt = $pdo->query("SELECT * FROM products LIMIT 1");
    $row = $stmt->fetch();
    echo "Columns: " . implode(", ", array_keys($row ?? [])) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>