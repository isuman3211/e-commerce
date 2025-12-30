document.addEventListener('DOMContentLoaded', async function () {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Access Denied: Admins Only');
        window.location.href = 'index.html';
        return;
    }
    await loadStats();
    await loadProducts();

    document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
});

async function loadStats() {
    try {
        const response = await fetch('api/admin.php', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('stat-users').textContent = data.stats.total_users;
            document.getElementById('stat-revenue').textContent = parseFloat(data.stats.total_revenue).toFixed(2) + ' Birr';
            document.getElementById('stat-items').textContent = data.stats.items_sold;
            const logsContainer = document.getElementById('logs-container');
            if (data.logs.length > 0) {
                logsContainer.innerHTML = data.logs.map(log => `<div>${log}</div>`).join('');
            } else {
                logsContainer.innerHTML = '<div>No logs available</div>';
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        alert('Failed to load dashboard data: ' + error.message);
    }
}

async function loadProducts() {
    try {
        const response = await fetch('api/products.php');
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('product-list');
            if (data.products.length === 0) {
                container.innerHTML = '<p>No products found.</p>';
                return;
            }

            container.innerHTML = data.products.map(product => `
                <div class="product-item">
                    <div>
                        <strong>${product.name}</strong> - ${product.price} Birr
                        <br><small>${product.description || 'No description'}</small>
                    </div>
                    <button onclick="deleteProduct(${product.id})">Delete</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        document.getElementById('product-list').innerHTML = '<p>Error loading products</p>';
    }
}

async function handleAddProduct(event) {
    event.preventDefault();

    const product = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        description: document.getElementById('product-description').value,
        image: document.getElementById('product-image').value,
        category: document.getElementById('product-category').value || 'General'
    };

    try {
        const response = await fetch('api/products.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        const data = await response.json();

        if (data.success) {
            alert('Product added successfully!');
            document.getElementById('add-product-form').reset();
            await loadProducts();
        } else {
            alert('Failed to add product: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`api/products.php?id=${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            alert('Product deleted successfully!');
            await loadProducts();
        } else {
            alert('Failed to delete product: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    fetch('logout.php').then(() => {
        window.location.href = 'index.html';
    });
}
