let cart = [];
let authToken = localStorage.getItem('authToken');
let currentUser = null;
document.addEventListener('DOMContentLoaded', function () {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    updateCartCount();
    initializeEventListeners();
    initializeAuth();
    loadCartFromServer();
});
function initializeEventListeners() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
        });
    }
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openCart();
        });
    }

    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCart);
    }
    window.addEventListener('click', function (e) {
        const modal = document.getElementById('cart-modal');
        if (e.target === modal) {
            closeCart();
        }
    });
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function () {
            const name = this.getAttribute('data-name');
            const price = parseFloat(this.getAttribute('data-price'));
            const category = this.getAttribute('data-category');
            const productId = this.getAttribute('data-product-id');
            addToCart(name, price, category, productId);
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    initializeSearch();
}

function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => performSearch(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch(searchInput.value);
        });
    }
}

async function performSearch(query) {
    if (!query.trim()) return;

    try {
        const response = await fetch(`api/products.php?search=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            displaySearchResults(data.products, query);
        } else {
            showNotification('Search failed: ' + data.message);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.');
    }
}

function displaySearchResults(products, query) {
    const storesSection = document.getElementById('stores');
    const container = storesSection.querySelector('.container');
    const title = container.querySelector('.section-title');
    title.innerHTML = `Search Results for "${query}" <button onclick="window.location.reload()" style="font-size: 0.8rem; padding: 5px 10px; cursor: pointer; border:none; background:#eee; border-radius:4px; margin-left:10px;">Clear</button>`;
    let html = '';
    if (products.length === 0) {
        html = '<p style="text-align:center; grid-column: 1/-1;">No products found.</p>';
    } else {
        products.forEach(p => {
            html += `
                <div class="store-card">
                    <div class="store-icon"><img src="${p.image || 'default.jpg'}" alt="${p.name}"></div>
                    <h2 style="background-color:wheat;color: black;font-family: fantasy;">${p.name}</h2>
                    <p style="font-style: italic;color: blue; flex-grow: 1;">${p.description || ''}</p>
                    <p class="price">${p.price} Birr</p>
                    <button class="btn-secondary add-to-cart" 
                        data-name="${p.name}" 
                        data-price="${p.price}" 
                        data-product-id="${p.id}"
                        onclick="addToCart('${p.name}', ${p.price}, 'General', ${p.id})">
                        Add to Cart
                    </button>
                </div>
            `;
        });
    }
    let grid = container.querySelector('.store-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.className = 'store-grid';
        container.appendChild(grid);
    }
    grid.innerHTML = html;
    storesSection.scrollIntoView({ behavior: 'smooth' });
}
async function loadCartFromServer() {
    if (!authToken) {
        cart = [];
        updateCartCount();
        return;
    }

    try {
        const response = await fetch('api/cart.php', {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            cart = data.cartItems || [];
            updateCartCount();
        }
    } catch (error) {
        console.error('Failed to load cart:', error);
        cart = [];
        updateCartCount();
    }
}

async function addToCart(name, price, category, productId) {
    if (!authToken) {
        showNotification('🔐 Please create an account or login first to add items to your cart');
        showRegister();
        return;
    }
    if (!productId) {
        const productMap = {
            'iPhone 15 Pro': 1,
            'MacBook Pro 14': 4,
            'AirPods Pro': 7
        };
        productId = productMap[name] || 1;
    }

    try {
        const response = await fetch('api/cart.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (response.ok) {
            showNotification(`${name} added to cart!`);
            loadCartFromServer();
        } else {
            const error = await response.json();
            showNotification('Failed to add to cart: ' + error.message);
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Failed to add to cart');
    }
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = 'block';
    displayCart();
}

function closeCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = 'none';
}

function displayCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    if (!authToken) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Please login to view your cart</p>';
        cartTotal.textContent = '0';
        return;
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Your cart is empty</p>';
        cartTotal.textContent = '0';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.price} Birr × ${item.quantity} = ${itemTotal} Birr</p>
                </div>
                <div>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" style="margin-right: 5px; padding: 5px 10px; cursor: pointer;">-</button>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})" style="margin-right: 10px; padding: 5px 10px; cursor: pointer;">+</button>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotal.textContent = total.toFixed(2);
}
async function removeFromCart(cartItemId) {
    if (!authToken) {
        showNotification('Please login to manage cart');
        return;
    }

    try {
        const response = await fetch(`api/cart.php?item_id=${cartItemId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Item removed from cart');
                // Remove item from local cart array
                cart = cart.filter(item => item.id !== cartItemId);
                updateCartCount();
                displayCart();
            } else {
                showNotification('Failed to remove item: ' + (data.message || 'Unknown error'));
            }
        } else {
            const error = await response.json();
            showNotification('Failed to remove item: ' + (error.message || 'Server error'));
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
        showNotification('Failed to remove item: Network error');
    }
}

async function updateQuantity(cartItemId, newQuantity) {
    if (!authToken) {
        showNotification('Please login to manage cart');
        return;
    }

    if (newQuantity <= 0) {
        removeFromCart(cartItemId);
        return;
    }

    try {
        const response = await fetch('api/cart.php', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                item_id: cartItemId,
                quantity: newQuantity
            })
        });

        if (response.ok) {
            loadCartFromServer();
        } else {
            const error = await response.json();
            showNotification('Failed to update quantity: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Update quantity error:', error);
        showNotification('Failed to update quantity');
    }
}

async function checkout() {
    if (!authToken) {
        showNotification('Please login to checkout');
        showLogin();
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    showPaymentModal(total);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

function initializeAuth() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', showLogin);
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', showRegister);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    updateAuthUI();
    showWelcomeMessageIfNeeded();
}

function showWelcomeMessageIfNeeded() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === 'new') {
        setTimeout(() => {
            showNotification('🎉 Welcome to ጮርሞ ሞል! You can now shop, add items to cart, and place orders. Start exploring our products!');
        }, 1000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userWelcome = document.getElementById('user-welcome');
    const username = document.getElementById('username');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userWelcome) userWelcome.style.display = 'block';
        if (username) {
            const displayName = currentUser.full_name || currentUser.name || currentUser.username;
            if (currentUser.role === 'admin') {
                username.textContent = `${displayName} 👑`;
            } else if (currentUser.role === 'editor') {
                username.textContent = `${displayName} ✏️`;
            } else {
                username.textContent = displayName;
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userWelcome) userWelcome.style.display = 'none';
    }
}

function showLogin() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeLogin() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showNotification('Please enter both username/email and password');
        return;
    }

    try {
        const response = await fetch('api/auth.php?action=login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        let data = null;
        const responseText = await response.text();

        if (!responseText) {
            throw new Error('Server returned empty response. Please check if server is running.');
        }

        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            console.error('Response text:', responseText);
            showNotification('Server Error: ' + responseText.substring(0, 100));
            throw new Error('Server returned invalid response format.');
        }
        if (response.ok) {
            if (data.success === true || data.user) {
                if (!data.user || !data.token) {
                    throw new Error('Invalid login response structure from server');
                }
                currentUser = data.user;
                authToken = data.token;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                localStorage.setItem('authToken', data.token);

                updateAuthUI();
                closeLogin();
                if (data.user.role === 'admin') {
                    showNotification(`Welcome back, Admin ${data.user.full_name}! 👑 You have admin privileges.`);
                } else if (data.user.role === 'editor') {
                    showNotification(`Welcome back, Editor ${data.user.full_name}! ✏️ You have editor privileges.`);
                } else {
                    showNotification(`Welcome back, ${data.user.full_name}! 🎉`);
                }

                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
                loadCartFromServer();
            } else {
                throw new Error(data.message || data.error || 'Login failed');
            }
        } else {
            let errorMessage = 'Login failed';

            if (data && (data.message || data.error)) {
                errorMessage = data.message || data.error;
            } else {
                switch (response.status) {
                    case 401:
                        errorMessage = 'Invalid username/email or password';
                        break;
                    case 400:
                        errorMessage = 'Please check your username/email and password';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later';
                        break;
                    default:
                        errorMessage = `Server error (${response.status}). Please try again`;
                }
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Network error: Cannot connect to server. Please check if the server is running.');
        } else {
            showNotification('Login failed: ' + error.message);
        }
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    cart = [];
    fetch('logout.php').then(() => {
        window.location.href = 'index.html';
    });
}
window.addEventListener('click', function (e) {
    const modal = document.getElementById('login-modal');
    if (e.target === modal) {
        closeLogin();
    }
});
let selectedPaymentMethod = null;

function showPaymentModal(total) {
    const modal = document.getElementById('payment-modal');
    const paymentItems = document.getElementById('payment-items');
    const paymentTotal = document.getElementById('payment-total-amount');

    if (!modal) {
        showNotification('Payment modal not found');
        return;
    }
    let itemsHtml = '';
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        itemsHtml += `
            <div class="payment-item">
                <span class="item-name">${item.name}</span>
                <span class="item-details">${item.quantity} × ${item.price} Birr = ${itemTotal} Birr</span>
            </div>
        `;
    });

    paymentItems.innerHTML = itemsHtml;
    paymentTotal.textContent = total.toFixed(2);
    resetPaymentForm();

    modal.style.display = 'block';
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'none';
        resetPaymentForm();
    }
}
function resetPaymentForm() {
    selectedPaymentMethod = null;
    const radios = document.querySelectorAll('input[name="payment"]');
    radios.forEach(radio => radio.checked = false);
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.style.display = 'none';
    }
    const confirmBtn = document.getElementById('confirm-payment-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
    const phoneInput = document.getElementById('phone-number');
    const addressInput = document.getElementById('shipping-address');
    const notesInput = document.getElementById('order-notes');

    if (phoneInput) phoneInput.value = '';
    if (addressInput) addressInput.value = '';
    if (notesInput) notesInput.value = '';
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    const radio = document.getElementById(method);
    if (radio) {
        radio.checked = true;
    }
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.style.display = 'block';
    }
    const phoneLabel = document.querySelector('label[for="phone-number"]');
    if (phoneLabel) {
        if (method === 'cbebirr') {
            phoneLabel.textContent = 'CBE Birr Phone Number';
            document.getElementById('phone-number').placeholder = 'Enter your CBE Birr registered phone number';
        } else if (method === 'telebirr') {
            phoneLabel.textContent = 'Telebirr Phone Number';
            document.getElementById('phone-number').placeholder = 'Enter your Telebirr registered phone number';
        }
    }
    validatePaymentForm();
}

function validatePaymentForm() {
    const phoneInput = document.getElementById('phone-number');
    const addressInput = document.getElementById('shipping-address');
    const confirmBtn = document.getElementById('confirm-payment-btn');

    if (phoneInput && addressInput && confirmBtn) {
        const isValid = selectedPaymentMethod &&
            phoneInput.value.trim() !== '' &&
            addressInput.value.trim() !== '';

        confirmBtn.disabled = !isValid;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const phoneInput = document.getElementById('phone-number');
    const addressInput = document.getElementById('shipping-address');

    if (phoneInput) {
        phoneInput.addEventListener('input', validatePaymentForm);
    }

    if (addressInput) {
        addressInput.addEventListener('input', validatePaymentForm);
    }
});

async function confirmPayment() {
    if (!selectedPaymentMethod) {
        showNotification('Please select a payment method');
        return;
    }

    const phoneNumber = document.getElementById('phone-number').value.trim();
    const shippingAddress = document.getElementById('shipping-address').value.trim();
    const orderNotes = document.getElementById('order-notes').value.trim();

    if (!phoneNumber || !shippingAddress) {
        showNotification('Please fill in all required fields');
        return;
    }

    if (!authToken) {
        showNotification('Please login to complete payment');
        return;
    }

    try {
        showNotification('Processing your payment...');
        const paymentMethodText = selectedPaymentMethod === 'cbebirr' ? 'CBE Birr' : 'Telebirr';

        const response = await fetch('api/orders.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                payment_method: `${paymentMethodText} - ${phoneNumber}`,
                shipping_address: shippingAddress,
                notes: orderNotes || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Payment failed');
        }
 showPaymentSuccess(data.orderId, selectedPaymentMethod);

        cart = [];
        updateCartCount();
        closePaymentModal();
        closeCart();
        loadCartFromServer();

    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed: ' + error.message);
    }
}

function showPaymentSuccess(orderId, paymentMethod) {
    const methodName = paymentMethod === 'cbebirr' ? 'CBE Birr' : 'Telebirr';
    const successModal = document.createElement('div');
    successModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 4000;
    `;

    successModal.innerHTML = `
        <div style="
            background: white;
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            margin: 2rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="color: #22c55e; margin-bottom: 1rem;">Payment Successful!</h2>
            <p style="margin-bottom: 1rem; color: #666;">
                Your order has been placed successfully using ${methodName}.
            </p>
            <p style="margin-bottom: 2rem; font-weight: bold; color: #333;">
                Order ID: #${orderId}
            </p>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 10px; margin-bottom: 2rem;">
                <p style="margin: 0; font-size: 0.9rem; color: #666;">
                    You will receive a ${methodName} payment request shortly. 
                    Please complete the payment to confirm your order.
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: linear-gradient(135deg, #22c55e, #16a34a);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 500;
            ">
                Continue Shopping
            </button>
        </div>
    `;

    document.body.appendChild(successModal);
    setTimeout(() => {
        if (successModal.parentNode) {
            document.body.removeChild(successModal);
        }
    }, 10000);
}
window.addEventListener('click', function (e) {
    const modal = document.getElementById('payment-modal');
    if (e.target === modal) {
        closePaymentModal();
    }
});
const productDetails = {
    'iphone15pro': {
        name: 'Apple iPhone 15 Pro 5G',
        fullDescription: 'Apple iPhone 15 Pro 5G SmartPhone 6.1\'\' A17Pro Bionic Chip iOS17 48MP All Colours in Good Condition Original used phone',
        price: '45,000 Birr',
        rating: 5.0,
        images: {
            front: 'iphone.jpg',
            back: 'back.jpeg'
        },
        specs: {
            'RAM': '16GB',
            'Storage': '256GB',
            'Display': '6.1"',
            'Camera': '48MP',
            'Processor': 'A17 Pro Bionic',
            'OS': 'iOS 17',
            'Network': '5G',
            'Condition': 'Original Used'
        },
        features: ['5G', 'A17 Pro', 'iOS 17', 'Original', '48MP Camera', 'Face ID']
    },


    'macbookpro14': {
        name: 'MacBook Pro 14"',
        fullDescription: 'Apple MacBook Pro 14-inch with M3 chip delivers exceptional performance for creative professionals. Features Liquid Retina XDR display and up to 22 hours battery life.',
        price: '85,000 Birr',
        rating: 4.9,
        images: {
            front: 'MacBook Pro 14.jpeg',
            back: 'mackback.jpeg'
        },
        specs: {
            'Display': '14.2" Liquid Retina XDR',
            'Processor': 'Apple M3 Chip',
            'Memory': '16GB RAM',
            'Storage': '512GB SSD',
            'Battery Life': 'Up to 18-22 Hours',
            'Operating System': 'macOS',
            'Ports': 'Thunderbolt/USB-C, HDMI, SD Card',
            'Build': 'Premium Aluminum Body',
            'Security': 'Touch ID Fingerprint Sensor'
        },
        features: ['M3 Chip', 'Liquid Retina XDR', '22Hr Battery', 'Touch ID', 'Thunderbolt', 'Creative Pro']
    },


    'airpodspro': {
        name: 'AirPods Pro',
        fullDescription: 'Apple AirPods Pro with Active Noise Cancellation, Transparency mode, and spatial audio for an immersive listening experience.',
        price: '12,000 Birr',
        rating: 4.8,
        images: {
            front: 'AirPods Pro.jpeg',
            back: 'pro back.jpeg'
        },
        specs: {
            'Type': 'Wireless Earbuds',
            'Noise Cancellation': 'Active Noise Cancellation',
            'Battery Life': 'Up to 6 Hours (30 Hours with Case)',
            'Connectivity': 'Bluetooth 5.3',
            'Features': 'Spatial Audio, Transparency Mode',
            'Charging': 'Lightning/Wireless Charging Case',
            'Water Resistance': 'IPX4',
            'Compatibility': 'iPhone, iPad, Mac'
        },
        features: ['Active Noise Cancellation', 'Spatial Audio', 'Transparency Mode', 'Wireless Charging', 'IPX4']
    },
    'formalsuit': {
        name: 'Men\'s Formal Suit',
        fullDescription: 'Premium quality formal suit perfect for business meetings, weddings, and special occasions. Made from high-quality fabric with excellent tailoring and modern fit.',
        price: '8,500 Birr',
        rating: 4.6,
        images: {
            front: 'Formal Suit.jpeg',
            back: 'Formal Suitback.jpeg'
        },
        specs: {
            'Material': '70% Wool, 30% Polyester',
            'Fit': 'Slim Fit',
            'Colors Available': 'Black, Navy, Charcoal',
            'Sizes': 'S, M, L, XL, XXL',
            'Jacket Style': 'Two-Button',
            'Pants': 'Flat Front',
            'Care': 'Dry Clean Only',
            'Origin': 'Premium Quality'
        },
        features: ['Slim Fit', 'Premium Fabric', 'Two-Button', 'Professional', 'Dry Clean', 'Multiple Sizes']
    },
    
    'eveningdress': {
        name: 'Women\'s Evening Dress',
        fullDescription: 'Elegant evening dress perfect for special occasions, parties, and formal events. Beautiful design with premium fabric and excellent fit.',
        price: '6,800 Birr',
        rating: 4.7,
        images: {
            front: 'Evening Dress.jpeg',
            back: 'Evening Dress.jpeg'
        },
        specs: {
            'Material': 'Polyester Blend',
            'Style': 'A-Line',
            'Length': 'Midi Length',
            'Sleeves': 'Sleeveless',
            'Colors': 'Black, Navy, Burgundy',
            'Sizes': 'XS, S, M, L, XL',
            'Occasion': 'Formal Events',
            'Care': 'Hand Wash'
        },
        features: ['Elegant Design', 'A-Line Cut', 'Formal Wear', 'Premium Fabric', 'Multiple Colors', 'Special Occasion']
    },


    'kidstshirt': {
        name: 'Kids T-Shirt',
        fullDescription: 'Comfortable and colorful t-shirt for kids. Made from soft cotton fabric, perfect for daily wear and play.',
        price: '450 Birr',
        rating: 4.5,
        images: {
            front: 'Kids T-Shirt.jpeg',
            back: 'Kids T-Shirt.jpeg'
        },
        specs: {
            'Material': '100% Cotton',
            'Fit': 'Regular Fit',
            'Sleeves': 'Short Sleeve',
            'Colors': 'Multiple Colors',
            'Sizes': '2-12 Years',
            'Style': 'Casual',
            'Care': 'Machine Washable',
            'Design': 'Fun Prints'
        },
        features: ['100% Cotton', 'Soft Fabric', 'Fun Designs', 'Machine Wash', 'Kids Sizes', 'Comfortable']
    },

     'electricguitar': {
        name: 'Electric Guitar',
        fullDescription: 'High-quality electric guitar with versatile sound options. Perfect for rock, blues, and contemporary music styles.',
        price: '12,000 Birr',
        rating: 4.6,
        images: {
            front: 'Electric Guitar.jpeg',
            back: 'Electric Guitar.jpeg'
        },
        specs: {
            'Type': 'Electric Guitar',
            'Body': 'Solid Body',
            'Pickups': 'Humbucker',
            'Neck': 'Maple',
            'Fretboard': 'Rosewood',
            'Frets': '22 Frets',
            'Bridge': 'Fixed Bridge',
            'Controls': 'Volume & Tone'
        },
        features: ['Solid Body', 'Humbucker Pickups', 'Versatile Sound', 'Professional', '22 Frets', 'Rock & Blues']
    },
'keyboardsynth': {
        name: 'Keyboard Synthesizer',
        fullDescription: 'Versatile keyboard synthesizer with multiple sounds and effects. Great for music production and live performance.',
        price: '18,500 Birr',
        rating: 4.4,
        images: {
            front: 'Keyboard Synthesizer.jpeg',
            back: 'Keyboard Synthesizer.jpeg'
        },
        specs: {
            'Keys': '61 Keys',
            'Sounds': '200+ Voices',
            'Rhythms': '100+ Styles',
            'Effects': 'Multiple Effects',
            'Recording': 'Built-in Recorder',
            'Connectivity': 'USB, Audio Out',
            'Display': 'LED Display',
            'Power': 'AC/Battery'
        },
        features: ['61 Keys', '200+ Sounds', 'Built-in Recorder', 'Multiple Effects', 'USB Connectivity', 'Portable']
    },

    'saxophone': {
        name: 'Saxophone',
        fullDescription: 'Alto saxophone with rich, warm tone perfect for jazz, classical, and contemporary music. Professional quality instrument.',
        price: '22,000 Birr',
        rating: 4.7,
        images: {
            front: 'Saxophone.jpeg',
            back: 'Saxophone.jpeg'
        },
        specs: {
            'Type': 'Alto Saxophone',
            'Key': 'Eb (E-flat)',
            'Material': 'Brass',
            'Finish': 'Gold Lacquer',
            'Keys': 'High F# Key',
            'Pads': 'Leather Pads',
            'Mouthpiece': 'Included',
            'Case': 'Hard Case'
        },
        features: ['Alto Sax', 'Eb Key', 'Gold Lacquer', 'High F# Key', 'Leather Pads', 'Professional Quality']
    },

    'drumset': {
        name: 'Drum Set',
        fullDescription: 'Complete 5-piece drum set perfect for beginners and intermediate drummers. Includes all necessary hardware and cymbals.',
        price: '35,000 Birr',
        rating: 4.5,
        images: {
            front: 'Drum Set.jpeg',
            back: 'Drum Set.jpeg'
        },
        specs: {
            'Configuration': '5-Piece Set',
            'Bass Drum': '22" x 16"',
            'Snare Drum': '14" x 5.5"',
            'Tom Toms': '10", 12", 16"',
            'Hardware': 'Complete Hardware',
            'Cymbals': 'Hi-Hat, Crash, Ride',
            'Finish': 'Gloss Finish',
            'Level': 'Beginner/Intermediate'
        },
        features: ['5-Piece Set', 'Complete Hardware', 'Cymbals Included', 'Gloss Finish', 'Ready to Play', 'Great Value']
    },

    'cajon': {
        name: 'Cajon',
        fullDescription: 'Versatile cajon drum perfect for acoustic performances and percussion ensembles. Excellent sound and build quality.',
        price: '4,800 Birr',
        rating: 4.2,
        images: {
            front: 'Cajon.jpeg',
            back: 'Cajon.jpeg'
        },
        specs: {
            'Dimensions': '30cm x 30cm x 48cm',
            'Material': 'Birch Plywood',
            'Snares': 'Internal Snares',
            'Finish': 'Satin Finish',
            'Sound': 'Deep Bass & Crisp Snare',
            'Playing': 'Hand Percussion',
            'Style': 'Flamenco/Modern',
            'Weight': 'Lightweight'
        },
        features: ['Birch Plywood', 'Internal Snares', 'Satin Finish', 'Versatile Sound', 'Lightweight', 'Modern Style']
    },
    'versaceeros': {
        name: 'Versace Eros',
        fullDescription: 'Passionate and seductive fragrance inspired by Greek mythology. Bold and masculine scent for confident men.',
        price: '11,200 Birr',
        rating: 4.6,
        images: {
            front: 'vip.jpeg',
            back: 'vip.jpeg'
        },
        specs: {
            'Brand': 'Versace',
            'Type': 'Eau de Toilette',
            'Size': '100ml',
            'Fragrance Family': 'Oriental Fougère',
            'Top Notes': 'Mint, Apple, Lemon',
            'Heart Notes': 'Tonka Bean, Geranium',
            'Base Notes': 'Vanilla, Cedar, Oak Moss',
            'Longevity': '7-9 Hours'
        },
        features: ['Designer Brand', 'Seductive Scent', 'Oriental Notes', 'Bold Fragrance', 'Long Lasting', 'Masculine']
    },
    'guccibloom': {
        name: 'Gucci Bloom',
        fullDescription: 'Feminine and floral fragrance celebrating the authenticity and vitality of women. Beautiful and elegant scent.',
        price: '13,500 Birr',
        rating: 4.5,
        images: {
            front: 'sunsilk.jpeg',
            back: 'sunsilk.jpeg'
        },
        specs: {
            'Brand': 'Gucci',
            'Type': 'Eau de Parfum',
            'Size': '100ml',
            'Fragrance Family': 'Floral',
            'Top Notes': 'Natural Tuberose',
            'Heart Notes': 'Jasmine, Rangoon Creeper',
            'Base Notes': 'Sandalwood',
            'Longevity': '6-8 Hours'
        },
        features: ['Luxury Brand', 'Floral Scent', 'Feminine', 'Natural Ingredients', 'Elegant', 'Modern']
    },

    'shampoconditioner': {
        name: 'Shampoo & Conditioner Set',
        fullDescription: 'Professional hair care set with nourishing shampoo and conditioner. Perfect for all hair types with natural ingredients.',
        price: '850 Birr',
        rating: 4.2,
        images: {
            front: 'shampo.jpeg',
            back: 'shampo.jpeg'
        },
        specs: {
            'Type': 'Hair Care Set',
            'Shampoo Size': '400ml',
            'Conditioner Size': '400ml',
            'Hair Type': 'All Hair Types',
            'Ingredients': 'Natural Extracts',
            'Benefits': 'Nourishing & Strengthening',
            'Sulfate': 'Sulfate-Free',
            'Paraben': 'Paraben-Free'
        },
        features: ['Natural Ingredients', 'Sulfate-Free', 'All Hair Types', 'Nourishing', 'Professional Quality', 'Value Set']
    }
};

function showProductDetails(productId) {
    const product = productDetails[productId];

    if (!product) {
        showNotification('Product details not available');
        return;
    }

    const modal = document.getElementById('product-details-modal');
    const container = document.getElementById('product-details-container');

    if (!modal || !container) {
        showNotification('Product details modal not found');
        return;
    }
    const generateStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }
        if (hasHalfStar) {
            stars += '☆';
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            stars += '☆';
        }
        return stars;
    };

    const generateSpecs = (specs) => {
        return Object.entries(specs).map(([key, value]) =>
            `<div class="spec-item">
                <span class="spec-label">${key}:</span>
                <span class="spec-value">${value}</span>
            </div>`
        ).join('');
    };

    const generateFeatures = (features) => {
        return features.map(feature =>
            `<span class="feature-badge">${feature}</span>`
        ).join('');
    };

    container.innerHTML = `
        <div class="product-detail-header">
            <div class="product-images">
                <div class="main-image">
                    <img src="${product.images.front}" alt="${product.name}" id="main-product-image">
                </div>
                <div class="image-thumbnails">
                    <img src="${product.images.front}" alt="Front view" class="thumbnail active" onclick="switchImage('${product.images.front}')">
                    <img src="${product.images.back}" alt="Back view" class="thumbnail" onclick="switchImage('${product.images.back}')">
                </div>
            </div>
            
            <div class="product-info">
                <h2 class="product-title">${product.name}</h2>
                <div class="product-rating-detail">
                    <span class="stars">${generateStars(product.rating)}</span>
                    <span class="rating-number">${product.rating}/5</span>
                </div>
                <div class="product-price-detail">${product.price}</div>
                <div class="product-description">${product.fullDescription}</div>
                
                <div class="product-features">
                    <h4>Key Features:</h4>
                    <div class="features-container">
                        ${generateFeatures(product.features)}
                    </div>
                </div>
                
                <div class="product-actions-detail">
                    <button class="btn btn-primary add-to-cart-detail" onclick="addToCartFromDetails('${productId}', '${product.name}', ${product.price.replace(/[^0-9]/g, '')})">
                        🛒 Add to Cart
                    </button>
                    <button class="btn btn-secondary" onclick="closeProductDetails()">
                        Close
                    </button>
                </div>
            </div>
        </div>
        
        <div class="product-specifications">
            <h3>Detailed Specifications</h3>
            <div class="specs-grid">
                ${generateSpecs(product.specs)}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}
function closeProductDetails() {
    const modal = document.getElementById('product-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
function switchImage(imageSrc) {
    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (mainImage) {
        mainImage.src = imageSrc;
    }

    thumbnails.forEach(thumb => {
        thumb.classList.remove('active');
        if (thumb.src.includes(imageSrc.split('/').pop())) {
            thumb.classList.add('active');
        }
    });
}
function addToCartFromDetails(productId, productName, price) {
    addToCart(productName, price, 'electronics', productId);
}

window.addEventListener('click', function (e) {
    const modal = document.getElementById('product-details-modal');
    if (e.target === modal) {
        closeProductDetails();
    }
});
function showRegister() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeRegister() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirmPassword = document.getElementById('register-confirm').value.trim();
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address');
        return;
    }

    try {
        const response = await fetch('api/auth.php?action=register', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: name,
                username: email,
                email: email,
                password: password
            })
        });

        let data = null;
        const responseText = await response.text();

        if (!responseText) {
            throw new Error('Server returned empty response. Please check if server is running.');
        }

        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            console.error('Response text:', responseText);
            throw new Error('Server returned invalid response format. Please try again.');
        }
        if (response.ok) {
            if (data.success === true || data.user) {
                if (!data.user || !data.token) {
                    throw new Error('Invalid registration response structure from server');
                }
                currentUser = data.user;
                authToken = data.token;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                localStorage.setItem('authToken', data.token);
                updateAuthUI();
                closeRegister();
                showNotification(`Welcome to ጮርሞ ሞል, ${data.user.full_name}! 🎉 Your account has been created successfully.`);
                document.getElementById('register-name').value = '';
                document.getElementById('register-email').value = '';
                document.getElementById('register-password').value = '';
                document.getElementById('register-confirm').value = '';
                loadCartFromServer();
            } else {
                throw new Error(data.message || data.error || 'Registration failed');
            }
        } else {
            let errorMessage = 'Registration failed';

            if (data && (data.message || data.error)) {
                errorMessage = data.message || data.error;
            } else {
                switch (response.status) {
                    case 409:
                        errorMessage = 'Username or email already exists. Please try a different one.';
                        break;
                    case 400:
                        errorMessage = 'Please check your information and try again';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later';
                        break;
                    default:
                        errorMessage = `Server error (${response.status}). Please try again`;
                }
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Network error: Cannot connect to server. Please check if the server is running.');
        } else {
            const statusInfo = response ? ` (Status: ${response.status})` : '';
            showNotification('Registration failed: ' + error.message + statusInfo);
        }
    }
}
window.addEventListener('click', function (e) {
    const registerModal = document.getElementById('register-modal');
    if (e.target === registerModal) {
        closeRegister();
    }
});
