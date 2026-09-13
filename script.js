// =============================================================
//  CONFIGURATION — EDIT THESE VALUES
// =============================================================
const CONFIG = {
    shopName: 'S.T. Craft Cottage',
    // Replace these with the verified coordinates of the shop or dispatch point.
    shopLat: 22.5726,
    shopLng: 88.3639,
    deliveryRadiusKm: 1.0,
    routingService: 'https://router.project-osrm.org/route/v1/driving',
    whatsappNumber: '919674724587',
    currency: '₹',
    
    products: [
        // { id: 1, name: 'Terracotta Diya Set', icon: '🪔', desc: 'Hand-painted clay diyas for a warm festive glow', price: 249, category: 'clay' },
        // { id: 2, name: 'Indigo Thread Earrings', icon: '🔵', desc: 'Lightweight fabric earrings with a handmade finish', price: 299, category: 'fabric' },
        { id: 3, name: 'Pink Blossom Necklace & Earring Set', icon: '📿', images: [
            'assets/images/Jewellery/pink-flower.webp',
            'assets/images/Jewellery/pink-flower1.webp',
            'assets/images/Jewellery/pink-flower2.webp'
        ], desc: 'A cheerful floral necklace and matching earrings with colorful beads — easy to style and lovely for gifting', price: 449, unit: 'set', category: 'jewellery' },
        { id: 4, name: 'Sugandh Trio', icon: '🕯️', images: [
            'assets/images/candles/small-glass-rose2.webp',
            'assets/images/candles/small-glass-rose1.webp',
            'assets/images/candles/small-glass-rose.webp'
        ], desc: 'Choose Mogra, Jasmine, Sandalwood or unscented, then select your glass quantity and available colour.', variants: [
            { id: 'mogra-1', name: 'Mogra · 1 glass', price: 149, unit: 'piece' },
            { id: 'mogra-2', name: 'Mogra · 2 glasses', price: 279, unit: 'pack' },
            { id: 'mogra-3', name: 'Mogra · 3 glasses', price: 399, unit: 'pack' },
            { id: 'jasmine-1', name: 'Jasmine · 1 glass', price: 149, unit: 'piece' },
            { id: 'jasmine-2', name: 'Jasmine · 2 glasses', price: 279, unit: 'pack' },
            { id: 'jasmine-3', name: 'Jasmine · 3 glasses', price: 399, unit: 'pack' },
            { id: 'sandalwood-1', name: 'Sandalwood · 1 glass', price: 149, unit: 'piece' },
            { id: 'sandalwood-2', name: 'Sandalwood · 2 glasses', price: 279, unit: 'pack' },
            { id: 'sandalwood-3', name: 'Sandalwood · 3 glasses', price: 399, unit: 'pack' },
            { id: 'unscented-1', name: 'Unscented · 1 glass', price: 129, unit: 'piece' },
            { id: 'unscented-2', name: 'Unscented · 2 glasses', price: 239, unit: 'pack' },
            { id: 'unscented-3', name: 'Unscented · 3 glasses', price: 339, unit: 'pack' }
        ], category: 'candles' },
        { id: 5, name: 'Aura Waves Twisted Candle', icon: '🕯️', images: [
            'assets/images/candles/aura_waves_white-blue.webp',
            'assets/images/candles/aura_waves_white-pink-yellow.webp'
        ], colors: ['White & Blue', 'White, Pink & Yellow'], colorImages: {
            'White & Blue': 'assets/images/candles/aura_waves_white-blue.webp',
            'White, Pink & Yellow': 'assets/images/candles/aura_waves_white-pink-yellow.webp'
        }, desc: 'A sculptural twisted candle with soft wave details, available in two colourways for shelves, tables and thoughtful gifts.', price: 249, unit: 'piece', category: 'candles' },
        // { id: 6, name: 'Oxidised Jhumka Pair', icon: '✨', desc: 'Classic oxidised silver finish for everyday styling', price: 399, category: 'oxidised' },
        // { id: 7, name: 'Gopal Dress Set', icon: '🧵', desc: 'Colorful hand-finished fabric outfit for Gopal', price: 499, category: 'gopal-dress' },
        // { id: 8, name: 'Marigold Toran', icon: '🌻', desc: 'Festive artificial flower toran for your doorway', price: 699, category: 'flowers' },
    ]
};

// =============================================================
//  STATE
// =============================================================
const state = {
    cart: [],
    location: null,
    distance: null,
    gpsAccuracy: null,
    distanceMethod: null,
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

async function getRoadDistanceKm(location) {
    const coordinates = `${CONFIG.shopLng},${CONFIG.shopLat};${location.lng},${location.lat}`;
    const response = await fetch(`${CONFIG.routingService}/${coordinates}?overview=false`, {
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
    const data = await response.json();
    const distanceMeters = data.routes?.[0]?.distance;
    if (!Number.isFinite(distanceMeters)) throw new Error('No driving route found');
    return distanceMeters / 1000;
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
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            },
            (err) => {
                reject(err);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0
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
        state.gpsAccuracy = Number.isFinite(loc.accuracy) ? loc.accuracy : null;
        
        // Prefer real road distance; use straight-line distance only if routing is unavailable.
        let dist;
        try {
            dist = await getRoadDistanceKm(loc);
            state.distanceMethod = 'road';
        } catch (routingError) {
            console.warn('Road distance unavailable, using GPS estimate:', routingError);
            dist = haversine(loc.lat, loc.lng, CONFIG.shopLat, CONFIG.shopLng);
            state.distanceMethod = 'estimate';
        }
        state.distance = dist;
        // Only promise free delivery when GPS uncertainty stays fully inside the radius.
        const accuracyKm = state.gpsAccuracy ? state.gpsAccuracy / 1000 : 0;
        state.isWithinRadius = dist + accuracyKm <= CONFIG.deliveryRadiusKm;
        state.locationChecked = true;

        if (document.getElementById('cartLocateBtn')) {
            document.getElementById('cartLocateBtn').innerHTML = '<i class="fas fa-check"></i> Location Checked';
            document.getElementById('cartLocateBtn').disabled = true;
            document.getElementById('cartLocateBtn').style.opacity = '0.7';
        }

        // Update UI
        if (locationStatus) {
            if (state.isWithinRadius) {
                locationStatus.innerHTML = `<span class="highlight">✅</span> You're within ${CONFIG.deliveryRadiusKm} km — free delivery applies`;
            } else {
                locationStatus.innerHTML = `<span class="highlight">📍</span> ${dist.toFixed(2)} km by ${state.distanceMethod === 'road' ? 'road' : 'GPS estimate'} — outside delivery zone`;
            }
        }
        
        if (locationSub) {
            if (state.isWithinRadius) {
                locationSub.textContent = `${state.distanceMethod === 'road' ? 'Driving distance' : 'Estimated GPS distance'}: ${dist.toFixed(2)} km${state.gpsAccuracy ? ` (GPS accuracy ±${Math.round(state.gpsAccuracy)} m)` : ''}. Final delivery availability is confirmed with your order.`;
            } else {
                locationSub.textContent = `Free delivery applies only within ${CONFIG.deliveryRadiusKm} km. ${state.distanceMethod === 'road' ? 'Driving distance calculated from the route.' : 'GPS distance is approximate.'} Final availability is confirmed with your order.`;
            }
        }
        
        if (distanceBadge) {
            if (state.isWithinRadius) {
                distanceBadge.className = 'distance-badge';
                distanceBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${dist.toFixed(2)} km · ${state.distanceMethod === 'road' ? 'Road · Free' : 'Estimate · Free'}`;
            } else {
                distanceBadge.className = 'distance-badge far';
                distanceBadge.innerHTML = `<i class="fas fa-xmark-circle"></i> ${dist.toFixed(2)} km · ${state.distanceMethod === 'road' ? 'Road · No delivery' : 'Estimate · No delivery'}`;
            }
        }

        showToast(
            state.isWithinRadius 
                ? `✅ Driving distance is ${dist.toFixed(2)} km. Free delivery applies within ${CONFIG.deliveryRadiusKm} km.`
                : `📍 Driving distance is ${dist.toFixed(2)} km. Free delivery applies only within ${CONFIG.deliveryRadiusKm} km.`,
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
        showToast('Location was not shared. You can still place an order with the standard delivery charge.', 'error');
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
function addToCart(productId, variantIndex = 0, selectedColor = '') {
    const product = CONFIG.products.find(p => p.id === productId);
    if (!product) return;
    const variant = product.variants?.[variantIndex];
    const colorKey = selectedColor || 'default';
    const cartKey = `${product.id}:${variant?.id || 'base'}:${colorKey}`;
    const cartItem = {
        ...product,
        ...(variant || {}),
        productId: product.id,
        variantKey: cartKey,
        selectedColor,
        productName: product.name,
        qty: 1
    };

    const existing = state.cart.find(item => (item.variantKey || `${item.id}:base:default`) === cartKey);
    if (existing) {
        existing.qty += 1;
    } else {
        state.cart.push(cartItem);
    }
    
    saveCart();
    updateCartUI();
    updateWhatsAppButton();
    showToast(`✅ Added ${product.name}${variant ? ` (${variant.name})` : ''} to cart`, 'success', 2500);

    // Keep the add control in sync with the quantity for this variant.
    const btn = document.querySelector(`.btn-add[data-id="${productId}"]`);
    if (btn) {
        btn.classList.add('in-cart');
        btn.innerHTML = `<i class="fas fa-plus"></i> Add one more <small>(${existing ? existing.qty : 1} in basket)</small>`;
    }
}

function removeFromCart(cartKey) {
    state.cart = state.cart.filter(item => (item.variantKey || `${item.id}:base:default`) !== cartKey);
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
    localStorage.setItem('stCraftCottageCart', JSON.stringify(state.cart));
}

function loadCart() {
    const saved = localStorage.getItem('stCraftCottageCart');
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
        const deliveryCharge = 0;
        cartTotalAmount.textContent = `${CONFIG.currency}${totalPrice + deliveryCharge}`;
    }
    
    const cartDelivery = document.getElementById('cartDelivery');
    if (cartDelivery) {
        cartDelivery.textContent = 'Free within 1 km*';
    }

    // Update cart items on cart page
    const cartItemsContainer = document.getElementById('cartPageItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (cartItemsContainer) {
        if (state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-basket-shopping"></i>
                    <p>Your cart is waiting for something handmade.</p>
                    <a href="products.html" class="btn-primary">
                        <i class="fas fa-store"></i> Browse the collection
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
                        <span class="name">${item.productName || item.name}${item.variantKey && item.name !== item.productName ? `<small>${item.name}${item.selectedColor ? ` · ${item.selectedColor}` : ''}</small>` : ''}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="item-price">${CONFIG.currency}${item.price * item.qty}</span>
                        <button class="btn-remove" data-id="${item.variantKey || `${item.id}:base`}" title="Remove">
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
                    removeFromCart(btn.dataset.id);
                });
            });
        }
    }
}

function updateWhatsAppButton() {
    const btn = document.getElementById('whatsappBtn');
    if (!btn) return;
    
    const hasItems = state.cart.length > 0;
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
    const deliveryCharge = 0;
    
    const name = document.getElementById('orderName')?.value || '';
    const phone = document.getElementById('orderPhone')?.value || '';
    const address = document.getElementById('orderAddress')?.value || '';
    const notes = document.getElementById('orderNotes')?.value || '';

    let msg = `🧵 *${CONFIG.shopName}* — New Order\n\n`;
    
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
        msg += `  • ${i.icon} ${i.productName || i.name}${i.variantKey && i.name !== i.productName ? ` (${i.name}${i.selectedColor ? `, ${i.selectedColor}` : ''})` : ''} × ${i.qty} = ${CONFIG.currency}${i.price * i.qty}\n`;
    });
    
    msg += `\n💰 *Subtotal:* ${CONFIG.currency}${total}\n`;
    msg += `🚚 *Delivery:* Free within 1 km (address confirmation required)\n`;
    msg += `🧾 *Total Amount:* ${CONFIG.currency}${total + deliveryCharge}\n`;
    /* Location feature temporarily disabled
    msg += `📍 *Distance:* ${state.distance ? state.distance.toFixed(2) : 'Unknown'}km `;
    msg += state.isWithinRadius ? `(within ${CONFIG.deliveryRadiusKm}km) ✅` : `(outside zone) ❌`;
    
    if (state.location) {
        msg += `\n📌 *GPS Location:* https://maps.google.com/?q=${state.location.lat},${state.location.lng}`;
    }
    */
    
    msg += `\n\n🤎 Please confirm my handmade order.`;
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
    
    container.innerHTML = products.map(p => {
        const images = p.images || (p.image ? [p.image] : []);
        const media = images.length
            ? `<div class="product-gallery">
                <img class="icon product-image" src="${images[0]}" alt="${p.name}" loading="lazy">
                ${images.length > 1 ? `<div class="product-thumbnails" aria-label="More images of ${p.name}">
                    ${images.map((image, index) => `<button class="product-thumbnail${index === 0 ? ' active' : ''}" type="button" data-image="${image}" aria-label="View image ${index + 1}">
                        <img src="${image}" alt="" loading="lazy">
                    </button>`).join('')}
                </div>` : ''}
            </div>`
            : `<span class="icon">${p.icon}</span>`;

        const variantOptions = (p.variants?.length || p.colors?.length)
            ? `${p.variants?.length ? `<div class="variant-grid">
                 <div><label class="variant-label" for="scent-${p.id}">Scent</label>
                 <select class="product-scent" id="scent-${p.id}">
                     ${[...new Set(p.variants.map(variant => variant.name.split(' · ')[0]))].map(scent => `<option value="${scent}">${scent}</option>`).join('')}
                 </select></div>
                 <div><label class="variant-label" for="size-${p.id}">Size</label>
                 <select class="product-size" id="size-${p.id}">
                     ${[...new Set(p.variants.map(variant => variant.name.split(' · ')[1]))].map(size => `<option value="${size}">${size}</option>`).join('')}
                   </select></div>
                   </div>` : ''}
               ${p.colors?.length ? `<label class="variant-label" for="color-${p.id}">Colour</label>
               <select class="product-color" id="color-${p.id}">
                   ${p.colors.map(color => `<option value="${color}">${color}</option>`).join('')}
               </select>` : ''}`
            : '';

        return `
        <div class="product-card" data-id="${p.id}">
            ${media}
            <h3>${p.name}</h3>
            <p class="desc">${p.desc}</p>
            <div class="variant-area">${variantOptions}</div>
            <div class="price product-price">${CONFIG.currency}${p.variants?.[0]?.price || p.price} <small>/ ${p.variants?.[0]?.unit || p.unit || 'unit'}</small></div>
            <button class="btn-add" data-id="${p.id}">
                <i class="fas fa-plus"></i> Add to Cart
            </button>
        </div>
    `;
    }).join('');

    container.querySelectorAll('.product-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', () => {
            const gallery = thumbnail.closest('.product-gallery');
            const mainImage = gallery.querySelector('.product-image');
            mainImage.src = thumbnail.dataset.image;
            gallery.querySelectorAll('.product-thumbnail').forEach(item => item.classList.remove('active'));
            thumbnail.classList.add('active');
        });
    });

    container.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const card = btn.closest('.product-card');
            const variantIndex = getSelectedVariantIndex(card, CONFIG.products.find(item => item.id === id));
            const colorSelect = card.querySelector('.product-color');
            addToCart(id, variantIndex, colorSelect ? colorSelect.value : '');
        });
    });

    container.querySelectorAll('.product-scent, .product-size, .product-color').forEach(select => {
        select.addEventListener('change', () => updateVariantCard(select.closest('.product-card')));
    });
}


function getSelectedVariantIndex(card, product) {
    if (!product.variants?.length) return 0;
    const scent = card.querySelector('.product-scent')?.value;
    const size = card.querySelector('.product-size')?.value;
    const variantIndex = product.variants.findIndex(variant => variant.name === `${scent} · ${size}`);
    return variantIndex >= 0 ? variantIndex : 0;
}

function updateVariantCard(card) {
    const product = CONFIG.products.find(item => item.id === parseInt(card.dataset.id));
    if (!product) return;
    const variant = product.variants?.[getSelectedVariantIndex(card, product)];
    const price = variant?.price || product.price;
    const unit = variant?.unit || product.unit || 'unit';
    card.querySelector('.product-price').innerHTML = `${CONFIG.currency}${price} <small>/ ${unit}</small>`;
    const color = card.querySelector('.product-color')?.value || '';
    updateColorImage(card, product, color);
    const cartKey = `${product.id}:${variant?.id || 'base'}:${color || 'default'}`;
    const cartItem = state.cart.find(item => item.variantKey === cartKey);
    const addButton = card.querySelector('.btn-add');
    addButton.classList.toggle('in-cart', Boolean(cartItem));
    addButton.innerHTML = cartItem
        ? `<i class="fas fa-plus"></i> Add one more <small>(${cartItem.qty} in basket)</small>`
        : '<i class="fas fa-plus"></i> Add to Cart';
}

function updateColorImage(card, product, color) {
    const image = product.colorImages?.[color];
    if (!image) return;
    const mainImage = card.querySelector('.product-image');
    if (mainImage) mainImage.src = image;
    card.querySelectorAll('.product-thumbnail').forEach(thumbnail => {
        thumbnail.classList.toggle('active', thumbnail.dataset.image === image);
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
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
        const categories = [...new Set(CONFIG.products.map(product => product.category))];
        filterBar.innerHTML = `
            <button class="filter-btn active" data-filter="all">All</button>
            ${categories.map(category => `
                <button class="filter-btn" data-filter="${category}">${formatCategoryName(category)}</button>
            `).join('')}
        `;
    }

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

function formatCategoryName(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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

function updateCatalogStats() {
    const productCount = document.getElementById('productCount');
    const categoryCount = document.getElementById('categoryCount');

    if (productCount) productCount.textContent = CONFIG.products.length;
    if (categoryCount) {
        categoryCount.textContent = new Set(CONFIG.products.map(product => product.category)).size;
    }
}

// =============================================================
//  INITIALIZATION
// =============================================================
function init() {
    // Load cart from localStorage
    loadCart();
    updateCatalogStats();
    
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
        showToast('🤎 Welcome to S.T. Craft Cottage. Browse our handmade collection.', 'info', 5000);
    }, 500);
}

// =============================================================
//  START
// =============================================================
document.addEventListener('DOMContentLoaded', init);