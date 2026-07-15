// =============================================================
//  CONFIGURATION — EDIT THESE VALUES
// =============================================================
const CONFIG = {
    shopName: 'Bloom Nest',
    shopLat: 22.5726,           // Kolkata latitude
    shopLng: 88.3639,           // Kolkata longitude
    deliveryRadiusKm: 5.0,      // Adjusted radius for better coverage
    whatsappNumber: '919674724587',
    currency: '₹',
    
    products: [
        { id: 1, name: 'Marigold Garland', icon: '🌼', desc: 'Fresh marigold string for temple offerings', price: 99, category: 'divine' },
        { id: 2, name: 'Rose Bouquet', icon: '🌹', desc: 'Fragrant red roses for special pujas', price: 149, category: 'fresh' },
        { id: 3, name: 'Lotus Flower', icon: '🪷', desc: 'Sacred lotus — pure & divine', price: 79, category: 'divine' },
        { id: 4, name: 'Jasmine Strand', icon: '🌸', desc: 'Sweet-scented jasmine for evening aarti', price: 89, category: 'garlands' },
        { id: 5, name: 'Mixed Bouquet', icon: '💐', desc: 'Assorted blooms for festive offerings', price: 199, category: 'bouquets' },
        { id: 6, name: 'Temple Combo', icon: '🙏', desc: 'Garland + rose + lotus — complete set', price: 299, category: 'divine' },
    ]
};

// =============================================================
//  STATE
// =============================================================
const state = {
    cart: [],
    location: null,
    distance: null,
    isWithinRadius: false,
    isLocating: false,
    locationChecked: false,
};

// =============================================================
//  DOM REFS
// =============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// =============================================================
//  TOAST SYSTEM
// =============================================================
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// =============================================================
//  HAVERSINE DISTANCE
// =============================================================
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) ** 2 + 
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
              Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =============================================================
//  LOCATION FUNCTIONS
// =============================================================
function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({ 
                    lat: pos.coords.latitude, 
                    lng: pos.coords.longitude 
                });
            },
            (err) => {
                reject(err);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 60000 
            }
        );
    });
}

async function checkLocation() {
    if (state.isLocating) return;
    state.isLocating = true;
    
    const locateBtn = document.getElementById('locateBtn');
    const distanceBadge = document.getElementById('distanceBadge');
    const locationStatus = document.getElementById('locationStatus');
    const locationSub = document.getElementById('locationSub');
    
    // Update UI to show loading
    if (locateBtn) {
        locateBtn.disabled = true;
        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    }
    if (distanceBadge) {
        distanceBadge.className = 'distance-badge checking';
        distanceBadge.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Locating...';
    }
    if (locationStatus) {
        locationStatus.innerHTML = '<span class="highlight">⏳</span> Detecting your location...';
    }

    try {
        const loc = await getLocation();
        state.location = loc;
        
        // Calculate distance
        const dist = haversine(loc.lat, loc.lng, CONFIG.shopLat, CONFIG.shopLng);
        state.distance = dist;
        state.isWithinRadius = dist <= CONFIG.deliveryRadiusKm;
        state.locationChecked = true;

        if (document.getElementById('cartLocateBtn')) {
            document.getElementById('cartLocateBtn').innerHTML = '<i class="fas fa-check"></i> Location Checked';
            document.getElementById('cartLocateBtn').disabled = true;
            document.getElementById('cartLocateBtn').style.opacity = '0.7';
        }

        // Update UI
        if (locationStatus) {
            if (state.isWithinRadius) {
                locationStatus.innerHTML = `<span class="highlight">✅</span> You're within ${CONFIG.deliveryRadiusKm}km — Free Delivery!`;
            } else {
                locationStatus.innerHTML = `<span class="highlight">📍</span> ${dist.toFixed(2)}km away — outside delivery zone`;
            }
        }
        
        if (locationSub) {
            if (state.isWithinRadius) {
                locationSub.textContent = `Distance: ${dist.toFixed(2)}km from our shop. Free delivery available!`;
            } else {
                locationSub.textContent = `Free delivery only within ${CONFIG.deliveryRadiusKm}km.`;
            }
        }
        
        if (distanceBadge) {
            if (state.isWithinRadius) {
                distanceBadge.className = 'distance-badge';
                distanceBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${dist.toFixed(2)}km · Free`;
            } else {
                distanceBadge.className = 'distance-badge far';
                distanceBadge.innerHTML = `<i class="fas fa-xmark-circle"></i> ${dist.toFixed(2)}km · No delivery`;
            }
        }

        showToast(
            state.isWithinRadius 
                ? `✅ You're within ${CONFIG.deliveryRadiusKm}km! Free delivery available.`
                : `📍 You're ${dist.toFixed(2)}km away. Free delivery only within ${CONFIG.deliveryRadiusKm}km.`,
            state.isWithinRadius ? 'success' : 'error'
        );
        
        // Update cart and WhatsApp button
        updateCartUI();
        updateWhatsAppButton();
        
    } catch (err) {
        console.error('Location error:', err);
        if (locationStatus) {
            locationStatus.innerHTML = '<span class="highlight">⚠️</span> Could not detect location';
        }
        if (locationSub) {
            locationSub.textContent = 'Please enable location access or check manually.';
        }
        if (distanceBadge) {
            distanceBadge.className = 'distance-badge far';
            distanceBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unknown';
        }
        showToast('Could not detect location. Please allow location access.', 'error');
    } finally {
        state.isLocating = false;
        if (locateBtn) {
            locateBtn.disabled = false;
            locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect Location';
        }
    }
}

// =============================================================
//  CART FUNCTIONS
// =============================================================
function addToCart(productId) {
    const product = CONFIG.products.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }
    
    saveCart();
    updateCartUI();
    updateWhatsAppButton();
    showToast(`✅ Added ${product.name} to cart`, 'success', 2500);

    // Animate button
    const btn = document.querySelector(`.btn-add[data-id="${productId}"]`);
    if (btn) {
        btn.classList.add('in-cart');
        btn.innerHTML = '<i class="fas fa-check"></i> Added';
        setTimeout(() => {
            btn.classList.remove('in-cart');
            btn.innerHTML = '<i class="fas fa-plus"></i> Add to Cart';
        }, 1500);
    }
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    updateWhatsAppButton();
    showToast('🗑️ Item removed from cart', 'info', 2000);
}

function clearCart() {
    if (state.cart.length === 0) return;
    state.cart = [];
    saveCart();
    updateCartUI();
    updateWhatsAppButton();
    showToast('🗑️ Cart cleared', 'info', 2000);
}

function saveCart() {
    localStorage.setItem('bloomNestCart', JSON.stringify(state.cart));
}

function loadCart() {
    const saved = localStorage.getItem('bloomNestCart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
        } catch(e) {
            state.cart = [];
        }
    }
}

function getTotalItems() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function getTotalPrice() {
    return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// =============================================================
//  UPDATE UI FUNCTIONS
// =============================================================
function updateCartUI() {
    const totalItems = getTotalItems();
    const totalPrice = getTotalPrice();
    
    // Update cart badges
    document.querySelectorAll('.cart-badge, #cartCount').forEach(el => {
        if (el) el.textContent = totalItems;
    });

    // Update cart totals
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) {
        cartTotalEl.textContent = `${CONFIG.currency}${totalPrice}`;
    }
    
    const cartSubtotal = document.getElementById('cartSubtotal');
    if (cartSubtotal) {
        cartSubtotal.textContent = `${CONFIG.currency}${totalPrice}`;
    }
    
    const cartTotalAmount = document.getElementById('cartTotalAmount');
    if (cartTotalAmount) {
        const deliveryCharge = state.isWithinRadius ? 0 : 50;
        cartTotalAmount.textContent = `${CONFIG.currency}${totalPrice + deliveryCharge}`;
    }
    
    const cartDelivery = document.getElementById('cartDelivery');
    if (cartDelivery) {
        cartDelivery.textContent = state.isWithinRadius ? 'Free' : `${CONFIG.currency}50`;
    }

    // Update cart items on cart page
    const cartItemsContainer = document.getElementById('cartPageItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (cartItemsContainer) {
        if (state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-basket-shopping"></i>
                    <p>Your cart is empty. Add some divine flowers!</p>
                    <a href="products.html" class="btn-primary">
                        <i class="fas fa-shopping-bag"></i> Browse Flowers
                    </a>
                </div>
            `;
            if (cartSummary) cartSummary.style.display = 'none';
            const checkoutForm = document.getElementById('checkoutForm');
            if (checkoutForm) checkoutForm.style.display = 'none';
        } else {
            cartItemsContainer.innerHTML = state.cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <div class="item-info">
                        <span style="font-size:1.4rem;">${item.icon}</span>
                        <span class="qty">${item.qty}</span>
                        <span class="name">${item.name}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="item-price">${CONFIG.currency}${item.price * item.qty}</span>
                        <button class="btn-remove" data-id="${item.id}" title="Remove">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            if (cartSummary) cartSummary.style.display = 'block';
            const checkoutForm = document.getElementById('checkoutForm');
            if (checkoutForm) checkoutForm.style.display = 'block';
            
            // Remove buttons
            cartItemsContainer.querySelectorAll('.btn-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    removeFromCart(id);
                });
            });
        }
    }
}

function updateWhatsAppButton() {
    const btn = document.getElementById('whatsappBtn');
    if (!btn) return;
    
    const hasItems = state.cart.length > 0;
    const checked = state.locationChecked;
    const within = state.isWithinRadius;

    console.log('WhatsApp Button Check:', { hasItems, checked, within }); // Debug

    // If location is checked but outside zone, block it. 
    // If not checked, allow it but they pay delivery fee.
    if (checked && !within) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-xmark-circle"></i> Outside delivery zone';
        btn.className = 'btn-whatsapp';
        return;
    }
    if (!hasItems) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-cart-plus"></i> Add items to cart';
        btn.className = 'btn-whatsapp';
        return;
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Order via WhatsApp';
    btn.className = 'btn-whatsapp';
}

// =============================================================
//  WHATSAPP ORDER
// =============================================================
function getWhatsAppMessage() {
    const items = state.cart;
    const total = getTotalPrice();
    const deliveryCharge = state.isWithinRadius ? 0 : 50;
    
    const name = document.getElementById('orderName')?.value || '';
    const phone = document.getElementById('orderPhone')?.value || '';
    const address = document.getElementById('orderAddress')?.value || '';
    const notes = document.getElementById('orderNotes')?.value || '';

    let msg = `🪷 *${CONFIG.shopName}* — New Order\n\n`;
    
    if (name) {
        msg += `👤 *Customer Details:*\n`;
        msg += `Name: ${name}\n`;
        msg += `Phone: ${phone}\n`;
        msg += `Address: ${address}\n`;
        if (notes) msg += `Notes: ${notes}\n`;
        msg += `\n`;
    }

    msg += `📋 *Items:*\n`;
    items.forEach(i => {
        msg += `  • ${i.icon} ${i.name} × ${i.qty} = ${CONFIG.currency}${i.price * i.qty}\n`;
    });
    
    msg += `\n💰 *Subtotal:* ${CONFIG.currency}${total}\n`;
    msg += `🚚 *Delivery:* ${deliveryCharge === 0 ? 'Free' : CONFIG.currency + deliveryCharge}\n`;
    msg += `🧾 *Total Amount:* ${CONFIG.currency}${total + deliveryCharge}\n`;
    /* Location feature temporarily disabled
    msg += `📍 *Distance:* ${state.distance ? state.distance.toFixed(2) : 'Unknown'}km `;
    msg += state.isWithinRadius ? `(within ${CONFIG.deliveryRadiusKm}km) ✅` : `(outside zone) ❌`;
    
    if (state.location) {
        msg += `\n📌 *GPS Location:* https://maps.google.com/?q=${state.location.lat},${state.location.lng}`;
    }
    */
    
    msg += `\n\n🙏 *Jai Shri Ram!* Please confirm my order.`;
    return encodeURIComponent(msg);
}

function placeOrder() {
    const btn = document.getElementById('whatsappBtn');
    if (!btn || btn.disabled) return;
    
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm && checkoutForm.style.display !== 'none') {
        const name = document.getElementById('orderName')?.value;
        const phone = document.getElementById('orderPhone')?.value;
        const address = document.getElementById('orderAddress')?.value;
        
        if (!name || !phone || !address) {
            showToast('⚠️ Please fill in your Name, Phone, and Address to place the order.', 'error', 4000);
            return;
        }
    }
    
    const msg = getWhatsAppMessage();
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${msg}`;
    window.open(url, '_blank');
    showToast('📱 Opening WhatsApp...', 'success', 3000);
}

// =============================================================
//  RENDER PRODUCTS
// =============================================================
function renderProducts(containerId, filter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let products = CONFIG.products;
    if (filter !== 'all') {
        products = products.filter(p => p.category === filter);
    }
    
    if (products.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);">No products found in this category.</p>`;
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div class="product-card" data-id="${p.id}">
            <span class="icon">${p.icon}</span>
            <h3>${p.name}</h3>
            <p class="desc">${p.desc}</p>
            <div class="price">${CONFIG.currency}${p.price} <small>/ unit</small></div>
            <button class="btn-add" data-id="${p.id}">
                <i class="fas fa-plus"></i> Add to Cart
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            addToCart(id);
        });
    });
}

// =============================================================
//  CONTACT FORM
// =============================================================
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName')?.value || '';
        const email = document.getElementById('contactEmail')?.value || '';
        const phone = document.getElementById('contactPhone')?.value || '';
        const message = document.getElementById('contactMessage')?.value || '';
        
        if (!name || !email || !phone || !message) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        // Send to WhatsApp
        const whatsappMsg = `📧 *New Message from ${CONFIG.shopName}*\n\n👤 Name: ${name}\n📧 Email: ${email}\n📱 Phone: ${phone}\n\n📝 Message:\n${message}`;
        const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;
        window.open(url, '_blank');
        
        showToast('📧 Message sent! We\'ll get back to you soon.', 'success', 4000);
        form.reset();
    });
}

// =============================================================
//  FILTERS
// =============================================================
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            renderProducts('allProducts', filter);
        });
    });
}

// =============================================================
//  NAV TOGGLE
// =============================================================
function initNav() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('open');
        });
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            });
        });
    }
}

// =============================================================
//  HEADER SCROLL
// =============================================================
function initScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    });
}

// =============================================================
//  INITIALIZATION
// =============================================================
function init() {
    // Load cart from localStorage
    loadCart();
    
    // Render products on all pages
    if (document.getElementById('featuredProducts')) {
        renderProducts('featuredProducts');
    }
    if (document.getElementById('allProducts')) {
        renderProducts('allProducts');
    }
    
    // Update cart UI
    updateCartUI();
    updateWhatsAppButton();
    
    // Location button
    const locateBtn = document.getElementById('locateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', checkLocation);
    }
    const cartLocateBtn = document.getElementById('cartLocateBtn');
    if (cartLocateBtn) {
        cartLocateBtn.addEventListener('click', checkLocation);
    }
    
    // WhatsApp button
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', placeOrder);
    }
    
    // Clear cart button
    const clearBtn = document.getElementById('clearCartBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCart);
    }
    
    // Filters
    initFilters();
    
    // Contact form
    initContactForm();
    
    // Navigation
    initNav();
    initScroll();
    
    /* Location auto-check disabled for now
    setTimeout(() => {
        if (!state.locationChecked) {
            checkLocation();
        }
    }, 1500);
    */
    
    // Welcome toast
    setTimeout(() => {
        showToast('🌺 Welcome to Bloom Nest! Click "Detect Location" to check delivery.', 'info', 5000);
    }, 500);
}

// =============================================================
//  START
// =============================================================
document.addEventListener('DOMContentLoaded', init);