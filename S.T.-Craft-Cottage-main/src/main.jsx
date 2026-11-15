import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import products from '../products.json';
import '../style.css';

const SHOP_NAME = 'S.T. Craft Cottage';
const WHATSAPP_NUMBER = '919674724587';
const CURRENCY = '₹';
const CART_STORAGE_KEY = 'stCraftCottageCart';

function readCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(savedCart)) return [];
    return savedCart
      .filter(item => item && typeof item === 'object' && Number.isFinite(Number(item.price)) && Number(item.price) >= 0 && Number.isFinite(Number(item.qty)) && Number(item.qty) > 0)
      .map(item => ({ ...item, price: Number(item.price), qty: Math.floor(Number(item.qty)) }))
      .filter(item => item.qty > 0);
  } catch (error) {
    console.warn('Could not read the saved basket:', error);
    return [];
  }
}

function getVariantInfo(product) {
  const variants = product.variants || [];
  const names = variants.map(variant => String(variant.name || ''));
  const groups = {};

  variants.forEach(variant => {
    const [primary, secondary = ''] = String(variant.name || '').split(' · ');
    (groups[primary || variant.name || 'Default'] ||= []);
    if (secondary) groups[primary || variant.name || 'Default'].push(secondary);
  });

  let fieldLabel = null;
  if (names.length && names.every(name => !name.includes(' · '))) {
    fieldLabel = /(mogra|jasmine|sandalwood|unscented|scented|rose|lavender|vanilla|lemongrass|amber|floral|fragrance)/i.test(names.join(' ')) ? 'Scented' : 'Quantity';
  } else if (names.some(name => name.includes(' · '))) {
    const secondaryValues = [...new Set(names.map(name => name.split(' · ')[1] || ''))];
    const hasShapeLikeValues = secondaryValues.some(value => value && !/\d/.test(value) && !/(glass|candle|piece|pack|set|count)/i.test(value));
    fieldLabel = hasShapeLikeValues ? 'Shape' : 'Size';
  }

  return { fieldLabel, groups, primaryValues: Object.keys(groups) };
}

function getSelectedVariant(product, primary, secondary) {
  const variants = product.variants || [];
  if (!variants.length) return null;

  let index = -1;
  if (primary && secondary) {
    index = variants.findIndex(variant => variant.name === `${primary} · ${secondary}`);
  } else if (primary) {
    index = variants.findIndex(variant => variant.name === primary || variant.name.startsWith(`${primary} · `));
  } else if (secondary) {
    index = variants.findIndex(variant => variant.name === secondary);
  }

  return variants[index >= 0 ? index : 0];
}

function formatCategory(category) {
  return String(category || '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function useScrollReveal() {
  const ref = React.useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      element.classList.add('is-visible');
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add('is-visible');
        observer.unobserve(element);
      }
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function useHeroParallax() {
  const ref = React.useRef(null);

  useEffect(() => {
    const image = ref.current;
    if (!image) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return undefined;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = image.closest('.hero')?.getBoundingClientRect();
        if (!bounds) return;

        const centerOffset = window.innerHeight / 2 - bounds.top - bounds.height / 2;
        const offset = Math.max(-24, Math.min(24, centerOffset * 0.035));
        image.style.setProperty('--hero-parallax-y', `${offset.toFixed(1)}px`);
      });
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      image.style.removeProperty('--hero-parallax-y');
    };
  }, []);

  return ref;
}

function getRouteFromPath(pathname) {
  const page = pathname.split('/').pop();
  return ({
    'products.html': 'products',
    'cart.html': 'cart',
    'contact.html': 'contact',
    'privacy.html': 'privacy',
    'terms.html': 'terms',
    'delivery-returns.html': 'delivery'
  })[page] || 'home';
}

async function animateProductToCart(sourceElement) {
  const sourceImage = sourceElement.closest('.product-card')?.querySelector('.product-image');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!sourceImage || prefersReducedMotion) return;

  const flight = document.createElement('img');
  flight.src = sourceImage.currentSrc || sourceImage.src;
  flight.alt = '';
  flight.setAttribute('aria-hidden', 'true');
  flight.className = 'cart-flight-image';
  try {
    await flight.decode();
  } catch (error) {
    console.warn('Could not load the product image for the basket animation:', error);
    return;
  }
  if (!sourceElement.isConnected) return;

  const target = [...document.querySelectorAll('.mobile-cart-shortcut .nav-cart-icon, .nav-links .nav-cart-link .nav-cart-icon')]
    .find(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  if (!target) return;

  const sourceBounds = sourceImage.getBoundingClientRect();
  const targetBounds = target.getBoundingClientRect();
  if (!sourceBounds.width || !sourceBounds.height || !targetBounds.width || !targetBounds.height) return;

  flight.style.transformOrigin = 'top left';
  flight.style.objectFit = getComputedStyle(sourceImage).objectFit;
  flight.style.borderRadius = getComputedStyle(sourceImage).borderRadius;
  flight.style.left = `${sourceBounds.left}px`;
  flight.style.top = `${sourceBounds.top}px`;
  flight.style.width = `${sourceBounds.width}px`;
  flight.style.height = `${sourceBounds.height}px`;
  document.body.append(flight);

  const scale = Math.min(targetBounds.width / sourceBounds.width, targetBounds.height / sourceBounds.height, 0.45);
  const deltaX = targetBounds.left + targetBounds.width / 2 - sourceBounds.left - sourceBounds.width * scale / 2;
  const deltaY = targetBounds.top + targetBounds.height / 2 - sourceBounds.top - sourceBounds.height * scale / 2;
  const controlX = deltaX * 0.52;
  const controlY = deltaY * 0.52 - Math.min(42, Math.abs(deltaX) * 0.08);
  const animation = flight.animate([
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, borderRadius: getComputedStyle(sourceImage).borderRadius, offset: 0 },
    { transform: `translate(${controlX}px, ${controlY}px) scale(0.76) rotate(-5deg)`, opacity: 0.92, borderRadius: '24%', offset: 0.58 },
    { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scale}) rotate(0deg)`, opacity: 0.22, borderRadius: '50%', offset: 1 }
  ], { duration: 620, easing: 'cubic-bezier(0.22, 0.75, 0.2, 1)', fill: 'forwards' });
  animation.onfinish = () => {
    flight.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)' }
    );
  };
  animation.oncancel = () => flight.remove();
}

function App() {
  const [route, setRoute] = useState(() => getRouteFromPath(window.location.pathname));
  const [locationVersion, setLocationVersion] = useState(0);
  const [cart, setCart] = useState(readCart);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toasts, setToasts] = useState([]);
  const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))], [products]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Could not save the basket to this browser:', error);
    }
  }, [cart]);

  useEffect(() => {
    const titles = {
      home: 'Thoughtful Creations for Every Special Moment — S.T. Craft Cottage',
      products: 'Shop Puja & Festival Finds — S.T. Craft Cottage',
      cart: 'Your Basket — S.T. Craft Cottage',
      contact: 'Contact — S.T. Craft Cottage',
      privacy: 'Privacy Notice — S.T. Craft Cottage',
      terms: 'Shopping Terms — S.T. Craft Cottage',
      delivery: 'Delivery & Returns — S.T. Craft Cottage'
    };
    document.title = titles[route];

    const onScroll = () => document.querySelector('.header')?.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    onScroll();
    const welcomeTimer = window.setTimeout(() => showToast('🤎 Welcome to S.T. Craft Cottage. Browse our handmade collection.', 'info', 5000), 500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(welcomeTimer);
    };
  }, [route]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
      setLocationVersion(version => version + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!window.location.hash) {
        window.scrollTo(0, 0);
        return;
      }

      const targetId = decodeURIComponent(window.location.hash.slice(1));
      document.getElementById(targetId)?.scrollIntoView();
    });

    return () => cancelAnimationFrame(frame);
  }, [route, locationVersion]);

  function navigateHeaderLink(event) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || event.currentTarget.target === '_blank'
    ) return;

    const destination = new URL(event.currentTarget.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    event.preventDefault();
    window.history.pushState({}, '', destination);
    setRoute(getRouteFromPath(destination.pathname));
    setLocationVersion(version => version + 1);
  }

  function showToast(message, type = 'info', duration = 4000) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), duration);
  }

  function addToCart(product, variant, selectedColor, sourceElement) {
    const color = selectedColor || '';
    const cartKey = `${product.id}:${variant?.id || 'base'}:${color || 'default'}`;
    if (sourceElement) animateProductToCart(sourceElement);
    setCart(current => {
      const existing = current.find(item => item.variantKey === cartKey);
      if (existing) {
        return current.map(item => item.variantKey === cartKey ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, {
        ...product,
        ...(variant || {}),
        productId: product.id,
        variantKey: cartKey,
        selectedColor: color,
        productName: product.name,
        qty: 1
      }];
    });
    showToast(`✅ Added ${product.name}${variant ? ` (${variant.name})` : ''} to cart`, 'success', 2500);
  }

  function removeFromCart(cartKey) {
    const updatedCart = cart.filter(item => (item.variantKey || `${item.id}:base:default`) !== cartKey);
    setCart(updatedCart);
    showToast('🗑️ Item removed from cart', 'info', 2000);
  }

  function adjustCartItem(cartKey, amount) {
    setCart(current => current
      .map(item => (item.variantKey || `${item.id}:base:default`) === cartKey ? { ...item, qty: item.qty + amount } : item)
      .filter(item => item.qty > 0));
  }

  function clearCart() {
    if (!cart.length) return;
    setCart([]);
    showToast('🗑️ Cart cleared', 'info', 2000);
  }

  function placeOrder(details) {
    if (!cart.length) {
      showToast('Your basket is empty. Add an item before placing an order.', 'error', 4000);
      return;
    }
    const phoneDigits = details.phone.replace(/\D/g, '');
    const needsAddress = details.fulfillment !== 'pickup';
    if (!details.name.trim() || (needsAddress && !details.address.trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      showToast(`Please enter your name${needsAddress ? ' and delivery address' : ''}, plus a valid phone number (7–15 digits).`, 'error', 4000);
      return;
    }

    const formatPrice = amount => new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let message = `${SHOP_NAME}\nORDER REQUEST (NOT YET CONFIRMED)\n\n`;
    message += `CUSTOMER DETAILS\nName: ${details.name.trim()}\nPhone: ${details.phone.trim()}\n`;
    if (needsAddress) {
      message += `Fulfilment: Local delivery requested (availability and fee to be confirmed)\nAddress: ${details.address.trim()}\n`;
    } else {
      message += 'Fulfilment: Customer pickup requested (please confirm pickup details)\n';
    }
    if (details.notes.trim()) message += `Notes: ${details.notes.trim()}\n`;
    message += '\nORDER ITEMS\n';
    cart.forEach((item, index) => {
      const variantText = item.variantKey && item.name !== item.productName
        ? ` - ${item.name}${item.selectedColor && !item.name.includes(item.selectedColor) ? `, ${item.selectedColor}` : ''}`
        : '';
      const itemName = `${item.productName || item.name}${variantText}`;
      const unitPrice = formatPrice(item.price);
      const lineTotal = formatPrice(item.price * item.qty);
      message += `${index + 1}. ${itemName}\n   ${item.qty} x ${unitPrice} = ${lineTotal}\n`;
    });
    message += `\nITEMS SUBTOTAL: ${formatPrice(subtotal)}\n`;
    if (needsAddress) {
      message += 'Delivery fee: Not included; please confirm delivery availability and the fee for this address.\n';
      message += '\nPlease confirm item availability, delivery fee, and the final amount before payment. This message is an order request, not a confirmed order.';
    } else {
      message += 'Pickup arrangements: Please confirm pickup details with the shop.\n';
      message += '\nPlease confirm item availability and the final amount before payment. This message is an order request, not a confirmed order.';
    }
    return createWhatsAppDraft(message);
  }

  function sendContactMessage(details) {
    const phoneDigits = details.phone.replace(/\D/g, '');
    if (!details.name.trim() || !details.email.trim() || !details.message.trim() || phoneDigits.length < 7 || phoneDigits.length > 15) {
      showToast('Enter your name, email, message, and a valid phone number (7–15 digits).', 'error', 4000);
      return null;
    }
    const message = `📧 *New Message from ${SHOP_NAME}*\n\n👤 Name: ${details.name}\n📧 Email: ${details.email}\n📱 Phone: ${details.phone}\n\n📝 Message:\n${details.message}`;
    return createWhatsAppDraft(message);
  }

  function createWhatsAppDraft(message) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('The WhatsApp draft is ready. Review it and tap Send; use the link below if a new tab did not open.', 'info', 6500);
    return url;
  }

  return (
    <>
      <Header route={route} categories={categories} cartCount={cartCount} onNavigate={navigateHeaderLink} />
      {route === 'home' && <HomePage products={products} cart={cart} addToCart={addToCart} />}
      {route === 'products' && (
        <ProductsPage
          products={products}
          cart={cart}
          addToCart={addToCart}
          categories={categories}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
      )}
      {route === 'cart' && <CartPage cart={cart} removeFromCart={removeFromCart} adjustCartItem={adjustCartItem} clearCart={clearCart} placeOrder={placeOrder} />}
      {route === 'contact' && <ContactPage sendContactMessage={sendContactMessage} />}
      {['privacy', 'terms', 'delivery'].includes(route) && <StorePolicyPage type={route} />}
      <Footer />
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`} />
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}

function Header({ route, categories, cartCount, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const aboutActive = route === 'home' && window.location.hash === '#our-promise';
  const handleNavigation = event => {
    setMenuOpen(false);
    event.currentTarget.closest('.nav-category-menu')?.removeAttribute('open');
    onNavigate(event);
  };
  const links = [
    ['home', 'index.html', 'Home'],
    ['products', 'products.html', 'Products']
  ];

  return (
    <header className="header">
      <div className="container">
        <a href="index.html" className="logo" aria-label="S.T. Craft Cottage home" onClick={handleNavigation}>
          <img src="assets/images/brand-logo.png" alt="S.T. Craft Cottage" />
          <span className="logo-lockup">
            <span className="logo-name">S.T. Craft Cottage</span>
            <span className="logo-tagline">Handmade with love</span>
          </span>
        </a>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
          {links.map(([key, href, label]) => (
            <a
              href={href}
              className={route === key && !(key === 'home' && aboutActive) ? 'active' : ''}
              aria-current={route === key && !(key === 'home' && aboutActive) ? 'page' : undefined}
              key={key}
              onClick={handleNavigation}
            >
              {label}
            </a>
          ))}
          <details className="nav-category-menu">
            <summary>Shop by Category <i className="fas fa-chevron-down" aria-hidden="true" /></summary>
            <div className="nav-category-dropdown">
              {categories.map(category => (
                <a key={category} href={`products.html#collection-${category}`} onClick={handleNavigation}>{formatCategory(category)}</a>
              ))}
            </div>
          </details>
          <a href="index.html#our-promise" className={aboutActive ? 'active' : ''} aria-current={aboutActive ? 'location' : undefined} onClick={handleNavigation}>About</a>
          <a href="contact.html" className={route === 'contact' ? 'active' : ''} aria-current={route === 'contact' ? 'page' : undefined} onClick={handleNavigation}>Contact</a>
          <a
            href="cart.html"
            className={`nav-cart-link${route === 'cart' ? ' active' : ''}`}
            aria-label={`Basket${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ', empty'}`}
            aria-current={route === 'cart' ? 'page' : undefined}
            onClick={handleNavigation}
          >
            <span className="nav-cart-icon" aria-hidden="true"><i className="fas fa-cart-shopping" /></span>
            <span>Basket</span>
            {cartCount > 0 && <span className="nav-cart-count" key={cartCount} aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>}
          </a>
          <a href="products.html#catalog-sections" className="nav-cta" onClick={handleNavigation}><i className="fas fa-shopping-bag" aria-hidden="true" /> Order Now</a>
        </nav>
        <a
          href="cart.html"
          className="mobile-cart-shortcut"
          aria-label={`Open basket${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ', empty'}`}
          onClick={handleNavigation}
        >
          <span className="nav-cart-icon" aria-hidden="true"><i className="fas fa-cart-shopping" /></span>
          {cartCount > 0 && <span className="nav-cart-count" key={cartCount} aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>}
        </a>
        <button
          className={`hamburger${menuOpen ? ' active' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}

function ProductCard({ product, cart, addToCart, index = 0 }) {
  const revealRef = useScrollReveal();
  const variantInfo = useMemo(() => getVariantInfo(product), [product]);
  const [primary, setPrimary] = useState(variantInfo.primaryValues[0] || '');
  const [secondary, setSecondary] = useState(variantInfo.groups[variantInfo.primaryValues[0]]?.[0] || '');
  const [color, setColor] = useState(product.colors?.[0] || '');
  const [image, setImage] = useState((product.images || (product.image ? [product.image] : []))[0] || '');
  const images = product.images || (product.image ? [product.image] : []);
  const selectedVariant = getSelectedVariant(product, primary, secondary);
  const price = selectedVariant?.price ?? product.price;
  const unit = selectedVariant?.unit || product.unit || 'unit';
  const cartKey = `${product.id}:${selectedVariant?.id || 'base'}:${color || 'default'}`;
  const cartItem = cart.find(item => item.variantKey === cartKey);
  const primaryLabel = variantInfo.fieldLabel === 'Quantity' || variantInfo.fieldLabel === 'Scented'
    ? variantInfo.fieldLabel
    : /(small|large|big|standard|medium|duo|mini|pillar|glass|cup)/i.test(primary) ? 'Size' : 'Scent';

  function changePrimary(value) {
    setPrimary(value);
    setSecondary(variantInfo.groups[value]?.[0] || '');
  }

  function chooseImage(nextImage) {
    setImage(nextImage);
    const linkedColor = Object.keys(product.colorImages || {}).find(itemColor => product.colorImages[itemColor] === nextImage);
    if (linkedColor) setColor(linkedColor);
  }

  return (
    <article
      ref={revealRef}
      className="product-card scroll-reveal"
      data-category={product.category}
      style={{ '--card-index': index }}
    >
      {images.length > 0 ? (
        <div className="product-gallery">
          <img className="icon product-image" src={image} alt={product.name} loading="lazy" />
          <div className="product-thumbnails" aria-label={images.length > 1 ? `${product.name} images` : undefined}>
            {images.length > 1 ? images.map((productImage, index) => (
                <button
                  className={`product-thumbnail${image === productImage ? ' active' : ''}`}
                  type="button"
                  key={productImage}
                  onClick={() => chooseImage(productImage)}
                  aria-label={`Show image ${index + 1} of ${product.name}`}
                  aria-pressed={image === productImage}
                >
                  <img src={productImage} alt="" loading="lazy" />
                </button>
              )) : <span aria-hidden="true" />}
          </div>
        </div>
      ) : <span className="icon" aria-hidden="true">{product.icon}</span>}
      <span className="product-category-label">
        <i className={`fas ${product.category === 'jewellery' ? 'fa-gem' : 'fa-fire-flame-curved'}`} />
        {formatCategory(product.category)}
      </span>
      <h3>{product.name}</h3>
      <p className="desc">{product.desc}</p>
      <div className="variant-area">
        {(product.variants?.length > 0 || product.colors?.length > 0) && (
          <>
            {variantInfo.primaryValues.length > 0 && (
              <div className="variant-grid">
                <div>
                  <label className="variant-label" htmlFor={`primary-${product.id}`}>{primaryLabel}</label>
                  <select className="product-variant product-scent" id={`primary-${product.id}`} value={primary} onChange={event => changePrimary(event.target.value)}>
                    {variantInfo.primaryValues.map(value => <option value={value} key={value}>{value}</option>)}
                  </select>
                </div>
                {variantInfo.fieldLabel && variantInfo.fieldLabel !== 'Quantity' && variantInfo.fieldLabel !== 'Scented' && (
                  <div>
                    <label className="variant-label" htmlFor={`secondary-${product.id}`}>{variantInfo.fieldLabel}</label>
                    <select className="product-variant product-size" id={`secondary-${product.id}`} value={secondary} onChange={event => setSecondary(event.target.value)}>
                      {(variantInfo.groups[primary] || []).map(value => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            {product.colors?.length > 0 && (
              <div>
                <label className="variant-label" htmlFor={`color-${product.id}`}>Colour</label>
                <select className="product-color" id={`color-${product.id}`} value={color} onChange={event => {
                  const nextColor = event.target.value;
                  setColor(nextColor);
                  if (product.colorImages?.[nextColor]) setImage(product.colorImages[nextColor]);
                }}>
                  {product.colors.map(itemColor => <option value={itemColor} key={itemColor}>{itemColor}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>
      <div className="price product-price">{CURRENCY}{price} <small>/ {unit}</small></div>
      <button className={`btn-add${cartItem ? ' in-cart' : ''}`} type="button" onClick={event => addToCart(product, selectedVariant, color, event.currentTarget)}>
        <i className="fas fa-plus" /> {cartItem ? <>Add one more <small>({cartItem.qty} in basket)</small></> : 'Add to Cart'}
      </button>
    </article>
  );
}

function ProductGrid({ products, cart, addToCart }) {
  if (!products.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No products found in this category.</p>;
  return <div className="product-grid">{products.map((product, index) => (
    <ProductCard key={`${product.id}-${product.name}-${index}`} product={product} cart={cart} addToCart={addToCart} index={index % 6} />
  ))}</div>;
}

function HomePage({ products, cart, addToCart }) {
  const categories = new Set(products.map(product => product.category));
  const productsRevealRef = useScrollReveal();
  const featuresRevealRef = useScrollReveal();
  const occasionRevealRef = useScrollReveal();
  const heroImageRef = useHeroParallax();
  return (
    <main>
      <section className="hero reference-hero" id="hero">
        <div className="reference-hero-decoration reference-hero-decoration-left" aria-hidden="true">
          <BotanicalSprig />
        </div>
        <div className="reference-hero-decoration reference-hero-decoration-right" aria-hidden="true">
          <BotanicalSprig />
        </div>
        <div className="reference-hero-decoration reference-hero-decoration-bottom-left" aria-hidden="true">
          <BotanicalSprig />
        </div>
        <svg className="reference-hero-outline-flower" viewBox="0 0 90 130" aria-hidden="true" focusable="false">
          <path d="M45 124c2-24-2-42 1-60m0 34c-17-10-27-24-29-42 18 6 29 18 30 41m-2-15c-4-20 3-34 19-43 7 18 2 33-17 47m-7-4C25 80 12 70 8 55c15 0 26 8 32 23m9-18c1-18 10-30 25-35 2 16-6 28-25 35m-4 65c-8-12-18-19-32-22" />
          <path d="M45 41c-13-9-15-20-7-31 10 7 13 17 7 31Zm1 0c1-15 9-23 22-21-1 13-8 20-22 21Zm-2 1c-14-3-20-12-16-25 13 4 19 12 16 25Z" />
        </svg>
        <span className="reference-hero-flower reference-hero-flower-top" aria-hidden="true">✿</span>
        <span className="reference-hero-flower reference-hero-flower-bottom" aria-hidden="true">✿</span>
        <div className="container">
          <div className="reference-hero-grid">
            <div className="reference-hero-content">
              <span className="reference-hero-eyebrow"><i /> HANDMADE <b>•</b> HOME DÉCOR <b>•</b> CANDLES <b>•</b> JEWELLERY <i /></span>
              <h1><span className="reference-heading-line">Thoughtful Creations</span><span className="reference-heading-line reference-heading-highlight">for Every Special Moment.</span><b aria-hidden="true">♡</b></h1>
              <p>Handcrafted candles, elegant jewellery and unique home décor pieces — made with love to bring warmth, beauty and positivity to your everyday life.</p>
              <div className="reference-hero-buttons">
                <a href="products.html" className="btn-primary"><i className="fas fa-shopping-bag" aria-hidden="true" /> Explore Our Collection <i className="fas fa-arrow-right" aria-hidden="true" /></a>
                <a href="#our-promise" className="btn-secondary"><i className="fas fa-heart" aria-hidden="true" /> Perfect for Gifting</a>
              </div>
            </div>
            <div className="reference-hero-art">
              <div className="reference-photo-halo" aria-hidden="true" />
              <div className="reference-photo-frame">
                <img ref={heroImageRef} className="reference-hero-photo" src="assets/images/candles/aura_waves_white-pink-yellow.webp" alt="Handmade pastel candles styled with flowers in warm, natural light" fetchPriority="high" />
                <div className="reference-jewellery-card">
                  <img src="assets/images/Jewellery/pink-flower.webp" alt="" loading="eager" />
                </div>
                <div className="reference-photo-note">Handmade<br />with Love ♡</div>
                <span className="reference-photo-spark" aria-hidden="true">✧</span>
              </div>
              <div className="reference-hero-ribbon"><i className="fas fa-leaf" aria-hidden="true" /><span>Small Details <b>♡</b> Big Joys</span></div>
            </div>
            <div className="reference-hero-stats">
              <div className="reference-stat"><span className="reference-stat-icon"><i className="fas fa-leaf" aria-hidden="true" /></span><span><h3>100%</h3><p>Natural &amp; Safe</p></span></div>
              <div className="reference-stat"><span className="reference-stat-icon"><i className="fas fa-hand-sparkles" aria-hidden="true" /></span><span><h3>Handcrafted</h3><p>with Care</p></span></div>
              <div className="reference-stat"><span className="reference-stat-icon"><i className="fas fa-gift" aria-hidden="true" /></span><span><h3>Unique</h3><p>Gift Options</p></span></div>
              <div className="reference-stat"><span className="reference-stat-icon"><i className="far fa-gem" aria-hidden="true" /></span><span><h3>Premium</h3><p>Jewellery Collection</p></span></div>
            </div>
          </div>
        </div>
      </section>
      <section ref={productsRevealRef} className="products scroll-reveal" id="products">
        <div className="container">
          <div className="section-header">
            <h2><i className="fas fa-star" /> A little joy for every occasion</h2>
            <p>Discover handmade pieces for puja, festive styling and thoughtful gifting.</p>
            <a href="products.html" className="view-all-btn">View All Products <i className="fas fa-arrow-right" /></a>
          </div>
          <div className="catalog-sections">
            {[...categories].map((category, index) => (
              <CategorySection
                key={category}
                category={category}
                products={products.filter(product => product.category === category)}
                cart={cart}
                addToCart={addToCart}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
      <section ref={featuresRevealRef} className="features scroll-reveal" id="our-promise">
        <div className="container">
          <div className="section-header"><h2><i className="fas fa-heart" /> A thoughtful cottage promise</h2></div>
          <div className="features-grid">
            <Feature icon="fa-hand-sparkles" title="Made with care">Small-batch handmade pieces selected for the moments you want to make special.</Feature>
            <Feature icon="fa-om" title="For puja & celebration">Thoughtful candles and keepsakes for home rituals, festive tables and heartfelt gifts.</Feature>
            <Feature icon="fa-box-open" title="Personal order confirmation">Ask us about availability, delivery and custom gifting before you confirm.</Feature>
            <Feature icon="fa-whatsapp" title="Talk to a real person">Review your basket and send your order enquiry directly on WhatsApp.</Feature>
          </div>
        </div>
      </section>
      <section ref={occasionRevealRef} className="occasion-callout scroll-reveal">
        <div className="container">
          <p className="hero-eyebrow">CELEBRATE YOUR WAY</p>
          <h2>Looking for something special for your puja or celebration?</h2>
          <p>Tell us what you have in mind. We’ll help you explore the collection and confirm what’s available.</p>
          <a href="contact.html" className="btn-primary"><i className="fas fa-comment-dots" /> Ask about a custom order</a>
        </div>
      </section>
    </main>
  );
}

function BotanicalSprig() {
  return (
    <svg viewBox="0 0 120 160" focusable="false">
      <path className="sprig-stem" d="M12 151C45 116 67 76 101 12" />
      <path className="sprig-leaf" d="M50 89C28 92 17 80 18 62c20 0 32 10 32 27Z" />
      <path className="sprig-leaf" d="M55 81C53 59 64 47 83 43c3 20-7 33-27 38Z" />
      <path className="sprig-leaf" d="M34 113C14 116 4 105 5 89c18 0 29 9 29 24Z" />
      <path className="sprig-leaf" d="M70 57C68 37 79 25 97 22c3 18-6 30-25 35Z" />
      <path className="sprig-leaf" d="M20 137C4 137-3 127 1 114c15 2 23 10 19 23Z" />
      <path className="sprig-leaf" d="M85 31C84 15 93 5 108 2c2 15-5 25-21 29Z" />
    </svg>
  );
}

function Feature({ icon, title, children }) {
  const revealRef = useScrollReveal();
  return <div ref={revealRef} className="feature-card scroll-reveal"><i className={`fas ${icon}`} /><h3>{title}</h3><p>{children}</p></div>;
}

function PageHeader({ icon, title, children }) {
  const revealRef = useScrollReveal();
  return <section ref={revealRef} className="page-header scroll-reveal"><div className="container"><h1><i className={`fas ${icon}`} /> {title}</h1><p>{children}</p></div></section>;
}

function CategorySection({ category, products, cart, addToCart, index }) {
  const revealRef = useScrollReveal();
  const categoryDescriptions = {
    jewellery: 'Hand-finished details made to bring a little colour to every day.',
    candles: 'Small-batch candles made to soften your space and brighten the moment.'
  };

  return (
    <section ref={revealRef} id={`collection-${category}`} className="catalog-category scroll-reveal" data-category={category}>
      <div className="catalog-category-heading">
        <span className="catalog-category-kicker">THE {String(index + 1).padStart(2, '0')} COLLECTION</span>
        <div className="catalog-category-title-row">
          <div>
            <h2><i className={`fas ${category === 'jewellery' ? 'fa-gem' : 'fa-fire-flame-curved'}`} /> {formatCategory(category)}</h2>
            <p>{categoryDescriptions[category] || `Thoughtful handmade ${formatCategory(category).toLowerCase()} from our cottage.`}</p>
          </div>
          <span className="catalog-category-count">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</span>
        </div>
      </div>
      <ProductGrid products={products} cart={cart} addToCart={addToCart} />
    </section>
  );
}

function ProductsPage({ products, cart, addToCart, categories, activeFilter, setActiveFilter }) {
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingProducts = products.filter(product => !normalizedQuery || [product.name, product.desc, product.category].some(value => String(value || '').toLowerCase().includes(normalizedQuery)));
  const visibleCategories = (activeFilter === 'all' ? categories : [activeFilter]).filter(category => matchingProducts.some(product => product.category === category));
  return (
    <main>
      <PageHeader icon="fa-store" title="Puja, festival & handmade finds">Thoughtful candles, adornments and handmade finds for puja corners, celebrations and heartfelt gifting.</PageHeader>
      <section className="products-page">
        <div className="container">
          <label className="catalog-search-label" htmlFor="product-search">Find something special</label>
          <input id="product-search" className="catalog-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search products or collections" />
          <div className="filter-bar" aria-label="Filter products by category">
            <button className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`} type="button" onClick={() => setActiveFilter('all')}>All</button>
            {categories.map(category => (
              <button className={`filter-btn${activeFilter === category ? ' active' : ''}`} type="button" key={category} onClick={() => setActiveFilter(category)}>
                {formatCategory(category)}
              </button>
            ))}
          </div>
          <div id="catalog-sections" className="catalog-sections">
            {visibleCategories.map(category => {
              const categoryProducts = matchingProducts.filter(product => product.category === category);
              return categoryProducts.length > 0 && (
                <CategorySection
                  key={category}
                  category={category}
                  products={categoryProducts}
                  cart={cart}
                  addToCart={addToCart}
                  index={categories.indexOf(category)}
                />
              );
            })}
          </div>
          {!matchingProducts.length && <p className="catalog-empty">No products match that search. Try another name or collection.</p>}
        </div>
      </section>
    </main>
  );
}

function CartPage({ cart, removeFromCart, adjustCartItem, clearCart, placeOrder }) {
  const [details, setDetails] = useState({ name: '', phone: '', address: '', notes: '', fulfillment: 'delivery' });
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const updateDetails = event => setDetails(current => ({ ...current, [event.target.name]: event.target.value }));
  return (
    <main className="cart-page">
      <section className="cart-hero">
        <div className="container cart-hero-inner">
          <div className="cart-hero-title">
            <i className="fas fa-bag-shopping" aria-hidden="true" />
            <h1>Your Basket</h1>
          </div>
          <p>Review your items and send an order request to the shop.</p>
        </div>
      </section>
      <section className="cart-section">
        <div className="container">
          <form className="cart-layout-form" onSubmit={event => { event.preventDefault(); setWhatsAppDraft(placeOrder(details) || ''); }}>
            <div className="cart-container">
              <section className="cart-review-card" aria-labelledby="cart-review-heading">
                <header className="cart-card-heading">
                  <span className="cart-heading-icon"><i className="fas fa-basket-shopping" aria-hidden="true" /></span>
                  <div>
                    <h2 id="cart-review-heading">Order Review</h2>
                    <p>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your basket</p>
                  </div>
                  {cart.length > 0 && (
                    <button className="cart-clear-button" type="button" onClick={clearCart}>
                      <i className="fas fa-trash-can" aria-hidden="true" /> Clear Basket
                    </button>
                  )}
                </header>
                <div className="cart-items">
                  {!cart.length ? (
                    <div className="cart-empty">
                      <i className="fas fa-basket-shopping" aria-hidden="true" />
                      <p>Your basket is waiting for something handmade.</p>
                      <a href="products.html" className="btn-primary"><i className="fas fa-store" aria-hidden="true" /> Browse the collection</a>
                    </div>
                  ) : cart.map(item => {
                    const cartKey = item.variantKey || `${item.id}:base:default`;
                    const image = item.images?.[0] || item.image;
                    return (
                      <article className="cart-item" key={cartKey}>
                        <div className="cart-item-product">
                          {image
                            ? <img className="cart-item-image" src={image} alt={item.productName || item.name} />
                            : <span className="cart-item-image cart-item-image-fallback" aria-hidden="true">{item.icon || <i className="fas fa-gift" />}</span>}
                          <div className="cart-item-copy">
                            <h3>{item.productName || item.name}</h3>
                            {item.variantKey && item.name !== item.productName && <p>{item.name}{item.selectedColor ? ` · ${item.selectedColor}` : ''}</p>}
                            <strong className="cart-item-unit-price">{CURRENCY}{item.price} <small>/ {item.unit || 'unit'}</small></strong>
                          </div>
                        </div>
                        <div className="cart-item-controls">
                          <div className="cart-quantity-control" aria-label={`Quantity of ${item.productName || item.name}`}>
                            <button type="button" aria-label={`Remove one ${item.productName || item.name}`} onClick={() => adjustCartItem(cartKey, -1)}><i className="fas fa-minus" aria-hidden="true" /></button>
                            <span aria-live="polite">{item.qty}</span>
                            <button type="button" aria-label={`Add one ${item.productName || item.name}`} onClick={() => adjustCartItem(cartKey, 1)}><i className="fas fa-plus" aria-hidden="true" /></button>
                          </div>
                          <strong className="cart-item-line-price">{CURRENCY}{item.price * item.qty}</strong>
                          <button className="btn-remove" type="button" onClick={() => removeFromCart(cartKey)} title="Remove item" aria-label={`Remove ${item.productName || item.name}`}>
                            <i className="fas fa-trash-can" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {cart.length > 0 && (
                <div className="cart-checkout-column">
                  <section className="cart-delivery-card" aria-labelledby="delivery-heading">
                    <header className="cart-delivery-heading">
                      <span className="cart-delivery-icon"><i className="fas fa-truck-fast" aria-hidden="true" /></span>
                      <div><h2 id="delivery-heading">Your details</h2><p>Choose pickup or local delivery</p></div>
                    </header>
                    <div className="cart-delivery-fields">
                    <div className="form-group cart-form-group">
                      <label htmlFor="orderName"><i className="fas fa-user" aria-hidden="true" /><span>Full Name <b>*</b></span></label>
                      <input id="orderName" name="name" autoComplete="name" maxLength="120" value={details.name} onChange={updateDetails} placeholder="Your Name" required />
                    </div>
                    <div className="form-group cart-form-group">
                      <label htmlFor="orderPhone"><i className="fas fa-phone" aria-hidden="true" /><span>Phone Number <b>*</b></span></label>
                      <input id="orderPhone" name="phone" type="tel" autoComplete="tel" pattern="[0-9 +()-]{7,20}" title="Enter a phone number with 7 to 20 digits, spaces, or +()- characters." value={details.phone} onChange={updateDetails} placeholder="WhatsApp Number" required />
                    </div>
                    <fieldset className="fulfillment-choice">
                      <legend>How would you like to receive your order?</legend>
                      <label className={details.fulfillment === 'delivery' ? 'selected' : ''}>
                        <input type="radio" name="fulfillment" value="delivery" checked={details.fulfillment === 'delivery'} onChange={updateDetails} />
                        <i className="fas fa-truck-fast" aria-hidden="true" />
                        <span><strong>Local delivery</strong><small>Bansdroni area; fee and availability confirmed in WhatsApp</small></span>
                      </label>
                      <label className={details.fulfillment === 'pickup' ? 'selected' : ''}>
                        <input type="radio" name="fulfillment" value="pickup" checked={details.fulfillment === 'pickup'} onChange={updateDetails} />
                        <i className="fas fa-store" aria-hidden="true" />
                        <span><strong>Customer pickup</strong><small>Arrange pickup details with the shop</small></span>
                      </label>
                    </fieldset>
                    <div className="form-group cart-form-group">
                      <label htmlFor="orderAddress"><i className="fas fa-house" aria-hidden="true" /><span>{details.fulfillment === 'pickup' ? 'Address' : <>Full Delivery Address <b>*</b></>}</span></label>
                      <textarea id="orderAddress" name="address" autoComplete="street-address" maxLength="500" rows="2" value={details.address} onChange={updateDetails} placeholder={details.fulfillment === 'pickup' ? 'Not needed for pickup' : 'House No, Street, Landmark'} required={details.fulfillment === 'delivery'} disabled={details.fulfillment === 'pickup'} />
                    </div>
                    <div className="form-group cart-form-group cart-notes-group">
                      <label htmlFor="orderNotes"><i className="fas fa-pen" aria-hidden="true" /><span>Special Instructions <small>(Optional)</small></span></label>
                      <input id="orderNotes" name="notes" value={details.notes} onChange={updateDetails} placeholder="Any gifting or delivery notes?" />
                    </div>
                      <label className="policy-consent">
                        <input type="checkbox" required />
                        <span>I have read the <a href="privacy.html" target="_blank" rel="noopener noreferrer">Privacy Notice</a>. My details will only be shared with the shop if I review and send the WhatsApp message.</span>
                      </label>
                    </div>
                  </section>
                  <aside className="cart-order-note">
                    <i className="fas fa-circle-info" aria-hidden="true" />
                    <div><strong>Order request only</strong><p>We’ll confirm availability and delivery charges before payment. Sending a WhatsApp draft does not place or confirm your order.</p></div>
                  </aside>
                  <section className="cart-total-card" aria-label="Order total">
                    <div className="cart-total-amount"><span>Items subtotal</span><strong>{CURRENCY}{total}</strong><small>Delivery not included</small></div>
                    <button className="cart-proceed-button" type="submit"><i className="fab fa-whatsapp" aria-hidden="true" /> Continue to WhatsApp <i className="fas fa-arrow-right" aria-hidden="true" /></button>
                  </section>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <>
                <p className="delivery-note">No payment is collected on this page. The shop will confirm availability, delivery or pickup details, applicable charges and the final amount in WhatsApp.</p>
                {whatsAppDraft && <p className="whatsapp-draft-link" role="status">Your order draft is ready but not sent. <a href={whatsAppDraft} target="_blank" rel="noopener noreferrer">Open it in WhatsApp</a>, review it and tap Send.</p>}
              </>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

function ContactPage({ sendContactMessage }) {
  const [details, setDetails] = useState({ name: '', email: '', phone: '', message: '' });
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  function submit(event) {
    event.preventDefault();
    const draft = sendContactMessage(details);
    if (draft) setWhatsAppDraft(draft);
  }
  return (
    <main>
      <PageHeader icon="fa-envelope" title="Get in Touch">Have a custom idea, gifting question or product request? Let’s make something lovely.</PageHeader>
      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-form">
              <h2>Send a Message</h2>
              <form onSubmit={submit}>
                <div className="form-group"><label htmlFor="contactName">Full Name</label><input id="contactName" autoComplete="name" maxLength="120" value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} placeholder="Your full name" required /></div>
                <div className="form-group"><label htmlFor="contactEmail">Email Address</label><input id="contactEmail" type="email" autoComplete="email" maxLength="254" value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} placeholder="your@email.com" required /></div>
                <div className="form-group"><label htmlFor="contactPhone">Phone Number</label><input id="contactPhone" type="tel" autoComplete="tel" pattern="[0-9 +()-]{7,20}" title="Enter a phone number with 7 to 20 digits, spaces, or +()- characters." value={details.phone} onChange={event => setDetails({ ...details, phone: event.target.value })} placeholder="+91 96747 24587" required /></div>
                <div className="form-group"><label htmlFor="contactMessage">Message</label><textarea id="contactMessage" rows="5" maxLength="1000" value={details.message} onChange={event => setDetails({ ...details, message: event.target.value })} placeholder="Your message..." required /></div>
                <label className="policy-consent">
                  <input type="checkbox" required />
                  <span>I have read the <a href="privacy.html" target="_blank" rel="noopener noreferrer">Privacy Notice</a>. My details will only be shared if I review and send the WhatsApp message.</span>
                </label>
                <button type="submit" className="btn-primary"><i className="fab fa-whatsapp" /> Continue in WhatsApp to send</button>
                {whatsAppDraft && <p className="whatsapp-draft-link" role="status">Your message is still a draft. <a href={whatsAppDraft} target="_blank" rel="noopener noreferrer">Open it in WhatsApp</a> and tap Send.</p>}
              </form>
            </div>
            <div className="contact-info">
              <h2>Get in Touch</h2>
              <InfoItem icon="fa-map-marker-alt" title="Address">1/42A, Vivekananda Park, Pirpukur, Kolkata 700070</InfoItem>
              <InfoItem icon="fa-phone" title="Phone">+91 96747 24587<br />+91 70032 19312</InfoItem>
              <InfoItem icon="fa-envelope" title="Email">hello@stcraftcottage.com</InfoItem>
              <InfoItem icon="fa-whatsapp" title="WhatsApp">+91 96747 24587</InfoItem>
              <a className="btn-whatsapp contact-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp" /> Chat with us on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoItem({ icon, title, children }) {
  return <div className="info-item"><i className={`fas ${icon}`} /><div><h4>{title}</h4><p>{children}</p></div></div>;
}

function StorePolicyPage({ type }) {
  const pages = {
    privacy: {
      icon: 'fa-shield-halved',
      title: 'Privacy Notice',
      intro: 'How this storefront handles information when you browse, contact us, or prepare an order.',
      sections: [
        ['Who operates this shop', <p>S.T. Craft Cottage is operated by Shamanto Roy and Tumpa Biswas as individuals. It is currently not a registered company and no GSTIN is currently provided on this website. Public contact: <a href="mailto:hello@stcraftcottage.com">hello@stcraftcottage.com</a> or <a href="tel:+917003219312">+91 70032 19312</a>. Address: 1/42A, Vivekananda Park, Pirpukur, Kolkata 700070.</p>],
        ['Information and why it is used', <p>If you prepare an order, the form asks for your name, phone number, delivery address and optional notes so the shop can respond to your request. The contact form asks for your name, email, phone number and message so we can reply. The basket is stored in your browser’s local storage on your device; it is not an order submission to the shop.</p>],
        ['WhatsApp and your choice to send', <p>Submitting either form opens a pre-filled WhatsApp message. It is a draft: the shop does not receive the form contents unless you choose to review and send it in WhatsApp. If you send it, WhatsApp processes the message under its own terms and privacy policy, and the shop can access it in the shop’s WhatsApp account. Do not include information you do not want to share.</p>],
        ['Retention and deletion', <p>This static website has no shop-side order database or customer account. Sent messages may remain in WhatsApp chats and backups according to the service, account and device settings. We cannot promise a fixed deletion date or delete data held by WhatsApp. You may ask the shop to delete information it controls; legal, safety or transaction records may need to be retained where required by law.</p>],
        ['Website hosting and external resources', <p>The website is hosted as a static site. The page loads fonts from Google Fonts and icons from Cloudflare’s CDN; your browser connects to those providers to retrieve the resources, and they may receive technical connection data such as your IP address. WhatsApp is an independent service. Review each provider’s current privacy information for its own processing.</p>],
        ['Your requests and contact', <p>You may contact Tumpa Biswas at <a href="mailto:hello@stcraftcottage.com">hello@stcraftcottage.com</a> or call <a href="tel:+917003219312">+91 70032 19312</a> to request access, correction or deletion of information the shop controls, or to withdraw a request before sending it. You may also contact the shop on <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>. We will assess and respond to requests subject to applicable law. Withdrawal does not undo processing already completed or affect data held by WhatsApp.</p>]
      ]
    },
    terms: {
      icon: 'fa-file-lines',
      title: 'Shopping Terms',
      intro: 'Please review these current ordering details before sending an enquiry.',
      sections: [
        ['Seller and contact', <p>S.T. Craft Cottage is operated by Shamanto Roy and Tumpa Biswas as individuals, and is currently not a registered company. No GSTIN is currently provided on this website. Contact <a href="mailto:hello@stcraftcottage.com">hello@stcraftcottage.com</a> or <a href="tel:+917003219312">+91 70032 19312</a>. Address: 1/42A, Vivekananda Park, Pirpukur, Kolkata 700070.</p>],
        ['Product details and prices', <p>Product images and descriptions are provided to help you choose; handmade items can have small variations. The amount shown in the basket is the items subtotal only. Delivery charges are not included. Applicable tax, final price, product availability and any product-specific details must be confirmed with the shop before payment. No payment is collected on this website.</p>],
        ['Order requests and confirmation', <p>Sending a WhatsApp message is an enquiry/order request, not acceptance or confirmation of an order. The shop must confirm stock, delivery availability, charges and the final amount. An order is only confirmed after the shop has replied and you have agreed to the confirmed details.</p>],
        ['Changes and cancellation', <p>Please request cancellation as soon as possible. A cancellation can be requested before preparation or making begins; once work has started, contact the shop to discuss what is possible. This does not limit rights that cannot be excluded under applicable law.</p>],
        ['Customer responsibilities', <p>Please check product options, delivery address and phone number before sending your request. Keep payment details private and only pay using a method and amount confirmed directly with the shop.</p>],
        ['Applicable rights', <p>These notes do not exclude or reduce any consumer or privacy rights that apply under law. If any term conflicts with a mandatory legal right, that legal right prevails.</p>]
      ]
    },
    delivery: {
      icon: 'fa-truck-fast',
      title: 'Delivery, Cancellation & Returns',
      intro: 'Delivery is currently arranged directly with the shop; confirm the details before paying.',
      sections: [
        ['Pickup and delivery', <p>Customer pickup can be arranged directly with the shop. The current local delivery area is Bansdroni, subject to confirmation. The shop and customer will agree delivery availability, timing and any delivery charge individually before an order is confirmed. Do not assume delivery outside this area is available.</p>],
        ['Inspection on delivery', <p>For local delivery, you may open and inspect the package when it is handed over. If it appears damaged or contains the wrong item, tell the delivery person and contact the shop promptly with the order details and clear photos. If you discover an issue later or cannot inspect at delivery, contact the shop as soon as reasonably possible. The shop will review the issue and discuss an appropriate remedy, including replacement where available. This process does not remove any remedy required by law.</p>],
        ['Change of mind and returns', <p>Because products are handmade and prepared in small quantities, the shop’s current policy is not to accept change-of-mind returns after an order is confirmed. This does not apply to a damaged, defective, incorrect or misdescribed item, and does not limit any return, refund or other right that cannot legally be excluded.</p>],
        ['Cancellation', <p>You may request cancellation before preparation or making begins. Contact the shop promptly; a request is not complete until the shop confirms it. If work has already started, contact the shop to discuss available options and any rights under applicable law.</p>],
        ['Before payment', <p>Wait for the shop to confirm item availability, delivery area, delivery charge, tax treatment and the final amount. No payment is taken through this website.</p>],
        ['Contact', <p>For delivery or item issues, contact <a href="mailto:hello@stcraftcottage.com">hello@stcraftcottage.com</a>, call <a href="tel:+917003219312">+91 70032 19312</a>, or use the shop’s <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>. Include your name, order conversation details and photos where relevant.</p>]
      ]
    }
  };
  const page = pages[type] || pages.terms;
  return (
    <main className="policy-page">
      <PageHeader icon={page.icon} title={page.title}>{page.intro}</PageHeader>
      <section className="policy-content">
        <div className="container">
          <p className="policy-status"><i className="fas fa-circle-info" aria-hidden="true" /> Store information last reviewed November 16, 2026. These pages describe the current process; they are not a certification of legal compliance. Applicable law prevails.</p>
          <article className="policy-card">
            {page.sections.map(([heading, content]) => <section key={heading}><h2>{heading}</h2>{content}</section>)}
          </article>
          <p className="policy-related">Also see: <a href="privacy.html">Privacy Notice</a> · <a href="terms.html">Shopping Terms</a> · <a href="delivery-returns.html">Delivery, Cancellation & Returns</a></p>
        </div>
      </section>
    </main>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-wave" aria-hidden="true" />
      <div className="container footer-container">
        <div className="footer-grid">
          <section className="footer-brand" aria-label="About S.T. Craft Cottage">
            <a className="footer-brand-lockup" href="index.html" aria-label="S.T. Craft Cottage home">
              <img src="assets/images/brand-logo.png" alt="" />
              <span><strong>S.T. Craft Cottage</strong><em>Handmade with love ♡</em></span>
            </a>
            <p>Thoughtful handmade crafts, thoughtfully created with love and care.</p>
            <a className="footer-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" aria-hidden="true" /> Chat with us on WhatsApp
            </a>
          </section>
          <nav className="footer-links" aria-label="Quick links">
            <h2><i className="fas fa-leaf" aria-hidden="true" /> Quick Links</h2>
            <ul>
              <li><a href="index.html"><i className="fas fa-chevron-right" aria-hidden="true" /> Home</a></li>
              <li><a href="products.html"><i className="fas fa-chevron-right" aria-hidden="true" /> Products</a></li>
              <li><a href="products.html#collection-jewellery"><i className="fas fa-chevron-right" aria-hidden="true" /> Shop by Category</a></li>
              <li><a href="index.html#our-promise"><i className="fas fa-chevron-right" aria-hidden="true" /> About Us</a></li>
              <li><a href="contact.html"><i className="fas fa-chevron-right" aria-hidden="true" /> Contact</a></li>
            </ul>
          </nav>
          <section className="footer-links footer-contact" aria-label="Contact information">
            <h2><i className="fas fa-phone" aria-hidden="true" /> Contact Us</h2>
            <ul>
              <li><a href="tel:+919674724587"><i className="fas fa-phone" aria-hidden="true" /> +91 96747 24587</a></li>
              <li><a href="tel:+917003219312"><i className="fas fa-phone" aria-hidden="true" /> +91 70032 19312</a></li>
              <li><a href="mailto:hello@stcraftcottage.com"><i className="fas fa-envelope" aria-hidden="true" /> hello@stcraftcottage.com</a></li>
              <li><span><i className="fas fa-location-dot" aria-hidden="true" /> 1/42A, Vivekananda Park, Pirpukur, Kolkata 700070</span></li>
            </ul>
          </section>
          <div className="footer-craft" aria-label="Crafting happiness">
            <div className="footer-craft-seal" aria-hidden="true">
              <span className="footer-craft-spark footer-craft-spark-left">✦</span>
              <i className="fas fa-heart" />
              <span className="footer-craft-spark footer-craft-spark-right">✦</span>
            </div>
            <p>Made by hand,<br /><span>shared with heart.</span></p>
            <div className="footer-craft-rule" aria-hidden="true"><i /><i /><i /></div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {year} S.T. Craft Cottage. All rights reserved.</p>
          <span className="footer-bottom-heart" aria-hidden="true">♡</span>
          <p>Craft · Create · Celebrate</p>
          <p>Made with <i className="fas fa-heart" aria-hidden="true" /> in India</p>
          <nav className="footer-legal-links" aria-label="Store policies">
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Shopping Terms</a>
            <a href="delivery-returns.html">Delivery & Returns</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
