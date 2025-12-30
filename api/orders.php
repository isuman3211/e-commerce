<?php
// api/orders.php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once '../config/config.php';
header('Content-Type: application/json');

// $pdo is available globally

try {
    if (!isLoggedIn()) {
        throw new Exception('Unauthorized', 401);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method Not Allowed', 405);
    }

    $userId = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);

    // 1. Get Cart Itemsjson_decode(file_get_contents('php://input'), true);

    // 1. Get Cart Items
    $stmt = $pdo->prepare("SELECT ci.product_id, ci.quantity, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = :u");
    $stmt->execute(['u' => $userId]);
    $cartItems = $stmt->fetchAll();

    if (empty($cartItems)) {
        throw new Exception('Cart is empty', 400);
    }

    // 2. Calculate Total
    $totalAmount = 0;
    foreach ($cartItems as $item) {
        $totalAmount += $item['price'] * $item['quantity'];
    }

    // 3. Create Order
    $paymentMethod = $input['payment_method'] ?? 'Unknown';
    $shippingAddress = $input['shipping_address'] ?? '';

    $stmt = $pdo->prepare("INSERT INTO orders (user_id, total_amount, payment_method, shipping_address) VALUES (:u, :t, :p, :s)");
    $stmt->execute([
        'u' => $userId,
        't' => $totalAmount,
        'p' => $paymentMethod,
        's' => $shippingAddress
    ]);
    $orderId = $pdo->lastInsertId();

    // 4. Create Order Items
    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (:o, :p, :q, :price)");
    foreach ($cartItems as $item) {
        $stmtItem->execute([
            'o' => $orderId,
            'p' => $item['product_id'],
            'q' => $item['quantity'],
            'price' => $item['price']
        ]);
    }

    // 5. Clear Cart
    $stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = :u");
    $stmt->execute(['u' => $userId]);

    echo json_encode([
        'success' => true,
        'message' => 'Order placed successfully',
        'orderId' => $orderId
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>