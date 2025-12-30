<?php
// api/products.php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once '../config/config.php';
header('Content-Type: application/json');

// $pdo is available globally

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        if ($search) {
            // Search query
            $stmt = $pdo->prepare("
                SELECT * FROM products 
                WHERE name LIKE :s OR description LIKE :s 
                LIMIT 50
            ");
            $searchTerm = "%$search%";
            $stmt->execute(['s' => $searchTerm]);
            $products = $stmt->fetchAll();
        } else {
            // Default: Fetch all (or limit to recent)
            $stmt = $pdo->query("SELECT * FROM products LIMIT 50");
            $products = $stmt->fetchAll();
        }

        echo json_encode(['success' => true, 'products' => $products]);

    } elseif ($method === 'POST') {
        // Admin Only - Add Product
        if (!isLoggedIn() || ($_SESSION['role'] ?? '') !== 'admin') {
            throw new Exception('Access Denied: Admins Only', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $name = sanitizeInput($input['name'] ?? '');
        $price = $input['price'] ?? 0;
        $description = sanitizeInput($input['description'] ?? '');
        $image = sanitizeInput($input['image'] ?? '');
        $category = sanitizeInput($input['category'] ?? 'General');

        if (!$name || $price <= 0) {
            throw new Exception('Name and valid price are required', 400);
        }

        $stmt = $pdo->prepare("INSERT INTO products (name, price, description, image, category) VALUES (:n, :p, :d, :i, :c)");
        $stmt->execute(['n' => $name, 'p' => $price, 'd' => $description, 'i' => $image, 'c' => $category]);

        echo json_encode(['success' => true, 'message' => 'Product added', 'product_id' => $pdo->lastInsertId()]);

    } elseif ($method === 'DELETE') {
        // Admin Only - Delete Product
        if (!isLoggedIn() || ($_SESSION['role'] ?? '') !== 'admin') {
            throw new Exception('Access Denied: Admins Only', 403);
        }

        $productId = $_GET['id'] ?? 0;
        if (!$productId) {
            throw new Exception('Product ID required', 400);
        }

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => $productId]);

        echo json_encode(['success' => true, 'message' => 'Product deleted']);

    } else {
        throw new Exception('Method Not Allowed', 405);
    }

} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Server Error']);
}
?>