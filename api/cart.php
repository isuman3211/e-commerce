<?php
// api/cart.php
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

    $userId = $_SESSION['user_id'];
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = :uid
        ");
        $stmt->execute(['uid' => $userId]);
        $items = $stmt->fetchAll();

        echo json_encode(['success' => true, 'cartItems' => $items]);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productId = $input['product_id'] ?? 0;
        $quantity = $input['quantity'] ?? 1;

        if (!$productId)
            throw new Exception('Invalid product ID', 400);

        $stmt = $pdo->prepare("SELECT id, quantity FROM cart_items WHERE user_id = :u AND product_id = :p");
        $stmt->execute(['u' => $userId, 'p' => $productId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $newQty = $existing['quantity'] + $quantity;
            $stmt = $pdo->prepare("UPDATE cart_items SET quantity = :q WHERE id = :id");
            $stmt->execute(['q' => $newQty, 'id' => $existing['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (:u, :p, :q)");
            $stmt->execute(['u' => $userId, 'p' => $productId, 'q' => $quantity]);
        }
        echo json_encode(['success' => true, 'message' => 'Item added']);

    } elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $itemId = $input['item_id'] ?? 0;
        $quantity = $input['quantity'] ?? 1;

        if (!$itemId)
            throw new Exception('Invalid item ID', 400);

        $stmt = $pdo->prepare("UPDATE cart_items SET quantity = :q WHERE id = :id AND user_id = :u");
        $stmt->execute(['q' => $quantity, 'id' => $itemId, 'u' => $userId]);
        echo json_encode(['success' => true, 'message' => 'Quantity updated']);

    } elseif ($method === 'DELETE') {
        $itemId = $_GET['item_id'] ?? 0;
        if (!$itemId)
            throw new Exception('Invalid item ID', 400);

        $stmt = $pdo->prepare("DELETE FROM cart_items WHERE id = :id AND user_id = :u");
        $stmt->execute(['id' => $itemId, 'u' => $userId]);
        echo json_encode(['success' => true, 'message' => 'Item removed']);

    } else {
        throw new Exception('Method Not Allowed', 405);
    }

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error']);
}
?>