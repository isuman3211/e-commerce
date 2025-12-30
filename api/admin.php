<?php
// api/admin.php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once '../config/config.php';
header('Content-Type: application/json');

try {
    // 1. Auth Check - Must be logged in & admin
    if (!isLoggedIn()) {
        throw new Exception('Unauthorized', 401);
    }

    if (($_SESSION['role'] ?? '') !== 'admin') {
        throw new Exception('Access Denied: Admins Only', 403);
    }

    // 2. Fetch Stats
    $stats = [];

    // Total Users
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $stats['total_users'] = $stmt->fetchColumn();

    // Total Revenue
    $stmt = $pdo->query("SELECT SUM(total_amount) FROM orders");
    $stats['total_revenue'] = $stmt->fetchColumn() ?: 0;

    // Items Sold
    $stmt = $pdo->query("SELECT SUM(quantity) FROM order_items");
    $stats['items_sold'] = $stmt->fetchColumn() ?: 0;

    // 3. Fetch Logs (Last 50 lines)
    $logFile = __DIR__ . '/debug_auth.log';
    $logs = [];
    if (file_exists($logFile)) {
        $lines = file($logFile);
        $logs = array_slice($lines, -50);
        $logs = array_map('trim', $logs);
    } else {
        $logs = ["Log file not found at $logFile"];
    }

    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'logs' => $logs
    ]);

} catch (Exception $e) {
    // Return 200 OK with success:false to avoid Apache error pages
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server Error']);
}
?>