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

function App() {
  const page = window.location.pathname.split('/').pop();
  const route = page === 'products.html' ? 'products' : page === 'cart.html' ? 'cart' : page === 'contact.html' ? 'contact' : 'home';
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
      contact: 'Contact — S.T. Craft Cottage'
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

  function showToast(message, type = 'info', duration = 4000) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), duration);
  }

  function addToCart(product, variant, selectedColor) {
    const color = selectedColor || '';
    const cartKey = `${product.id}:${variant?.id || 'base'}:${color || 'default'}`;
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
    setCart(current => current.filter(item => (item.variantKey || `${item.id}:base:default`) !== cartKey));
    showToast('🗑️ Item removed from cart', 'info', 2000);
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
    if (!details.name.trim() || !details.address.trim() || phoneDigits.length < 7 || phoneDigits.length > 15) {
      showToast('Enter your name, address, and a valid phone number (7–15 digits) before placing an order.', 'error', 4000);
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let message = `🧵 *${SHOP_NAME}* — New Order\n\n`;
    message += `👤 *Customer Details:*\nName: ${details.name}\nPhone: ${details.phone}\nAddress: ${details.address}\n`;
    if (details.notes) message += `Notes: ${details.notes}\n`;
    message += '\n📋 *Items:*\n';
    cart.forEach(item => {
      const variantText = item.variantKey && item.name !== item.productName
        ? ` (${item.name}${item.selectedColor ? `, ${item.selectedColor}` : ''})`
        : '';
      message += `  • ${item.icon} ${item.productName || item.name}${variantText} × ${item.qty} = ${CURRENCY}${item.price * item.qty}\n`;
    });
    message += `\n💰 *Subtotal:* ${CURRENCY}${total}\n`;
    message += '🚚 *Delivery:* Please confirm eligibility and any delivery fee for my address.\n';
    message += `🧾 *Estimated total:* ${CURRENCY}${total}\n\n🤎 Please confirm availability, delivery and the final total before payment.`;
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
      <Header route={route} categories={categories} />
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
      {route === 'cart' && <CartPage cart={cart} removeFromCart={removeFromCart} clearCart={clearCart} placeOrder={placeOrder} />}
      {route === 'contact' && <ContactPage sendContactMessage={sendContactMessage} />}
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

function Header({ route, categories }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['home', 'index.html', 'Home'],
    ['products', 'products.html', 'Products']
  ];

  return (
    <header className="header">
      <div className="container">
        <a href="index.html" className="logo" aria-label="S.T. Craft Cottage home">
          <img src="assets/images/brand-logo.png" alt="S.T. Craft Cottage" />
        </a>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
          {links.map(([key, href, label]) => (
            <a href={href} className={route === key ? 'active' : ''} key={key} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <details className="nav-category-menu">
            <summary>Shop by Category <i className="fas fa-chevron-down" aria-hidden="true" /></summary>
            <div className="nav-category-dropdown">
              {categories.map(category => (
                <a key={category} href={`products.html#collection-${category}`} onClick={() => setMenuOpen(false)}>{formatCategory(category)}</a>
              ))}
            </div>
          </details>
          <a href="index.html#our-promise" onClick={() => setMenuOpen(false)}>About</a>
          <a href="contact.html" className={route === 'contact' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Contact</a>
          <a href="products.html" className="nav-cta" onClick={() => setMenuOpen(false)}><i className="fas fa-shopping-bag" aria-hidden="true" /> Order Now</a>
        </nav>
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
      <button className={`btn-add${cartItem ? ' in-cart' : ''}`} type="button" onClick={() => addToCart(product, selectedVariant, color)}>
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
          <div className="catalog-sections">
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

function CartPage({ cart, removeFromCart, clearCart, placeOrder }) {
  const [details, setDetails] = useState({ name: '', phone: '', address: '', notes: '' });
  const [whatsAppDraft, setWhatsAppDraft] = useState('');
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const updateDetails = event => setDetails(current => ({ ...current, [event.target.name]: event.target.value }));
  return (
    <main>
      <PageHeader icon="fa-shopping-basket" title="Your basket">Review your handmade finds before placing your order.</PageHeader>
      <section className="cart-section">
        <div className="container">
          <div className="cart-container">
            <div className="cart-left">
              <h2 className="cart-review-title"><i className="fas fa-list-check" /> Order review</h2>
              <div className="cart-items">
                {!cart.length ? (
                  <div className="cart-empty">
                    <i className="fas fa-basket-shopping" />
                    <p>Your basket is waiting for something handmade.</p>
                    <a href="products.html" className="btn-primary"><i className="fas fa-store" /> Browse the collection</a>
                  </div>
                ) : cart.map(item => (
                  <div className="cart-item" key={item.variantKey || `${item.id}:${item.name}`}>
                    <div className="item-info">
                      <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                      <span className="qty">{item.qty}</span>
                      <span className="name">
                        {item.productName || item.name}
                        {item.variantKey && item.name !== item.productName && <small>{item.name}{item.selectedColor ? ` · ${item.selectedColor}` : ''}</small>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="item-price">{CURRENCY}{item.price * item.qty}</span>
                      <button className="btn-remove" type="button" onClick={() => removeFromCart(item.variantKey || `${item.id}:base:default`)} title="Remove item" aria-label={`Remove ${item.productName || item.name}`}>
                        <i className="fas fa-trash-can" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="cart-right">
                <form className="checkout-form" onSubmit={event => { event.preventDefault(); setWhatsAppDraft(placeOrder(details) || ''); }}>
                  <h3><i className="fas fa-truck-fast" /> Delivery details</h3>
                  <div className="form-group"><label htmlFor="orderName">Full Name *</label><input id="orderName" name="name" autoComplete="name" maxLength="120" value={details.name} onChange={updateDetails} placeholder="Your Name" required /></div>
                  <div className="form-group"><label htmlFor="orderPhone">Phone Number *</label><input id="orderPhone" name="phone" type="tel" autoComplete="tel" pattern="[0-9 +()-]{7,20}" title="Enter a phone number with 7 to 20 digits, spaces, or +()- characters." value={details.phone} onChange={updateDetails} placeholder="WhatsApp Number" required /></div>
                  <div className="form-group"><label htmlFor="orderAddress">Full Delivery Address *</label><textarea id="orderAddress" name="address" autoComplete="street-address" maxLength="500" rows="3" value={details.address} onChange={updateDetails} placeholder="House No, Street, Landmark" required /></div>
                  <div className="form-group"><label htmlFor="orderNotes">Special Instructions (Optional)</label><input id="orderNotes" name="notes" value={details.notes} onChange={updateDetails} placeholder="e.g. Leave at door" /></div>
                  <div className="cart-summary">
                    <div className="summary-row"><span>Estimated subtotal</span><span>{CURRENCY}{total}</span></div>
                    <div className="summary-row"><span>Delivery</span><span>Confirm in WhatsApp</span></div>
                    <div className="summary-row total"><span>Estimated total</span><span>{CURRENCY}{total}</span></div>
                    <div className="cart-actions">
                      <p className="delivery-note">* Delivery eligibility, product availability and the final price are confirmed by the shop in WhatsApp. No online payment is collected here.</p>
                      <button className="btn-secondary" type="button" onClick={clearCart} style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
                        <i className="fas fa-trash" /> Clear Cart
                      </button>
                      <button className="btn-whatsapp" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                        <i className="fab fa-whatsapp" /> Order via WhatsApp
                      </button>
                      {whatsAppDraft && <p className="whatsapp-draft-link" role="status">Not sent yet. <a href={whatsAppDraft} target="_blank" rel="noopener noreferrer">Open the order draft in WhatsApp</a>, review it and tap Send.</p>}
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
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

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand"><h3><i className="fas fa-leaf" /> S.T. Craft Cottage</h3><p>Thoughtful handmade finds for puja, festivals, gifting and everyday moments.</p></div>
          <div className="footer-links"><h4>Quick Links</h4><ul><li><a href="index.html">Home</a></li><li><a href="products.html">Products</a></li><li><a href="cart.html">Cart</a></li><li><a href="contact.html">Contact</a></li></ul></div>
          <div className="footer-links"><h4>Contact</h4><ul><li><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp" /> WhatsApp</a></li><li><a href="tel:+919674724587"><i className="fas fa-phone" /> +91 96747 24587</a></li><li><a href="tel:+917003219312"><i className="fas fa-phone" /> +91 70032 19312</a></li><li><a href="mailto:hello@stcraftcottage.com"><i className="fas fa-envelope" /> hello@stcraftcottage.com</a></li></ul></div>
        </div>
        <div className="footer-bottom">&copy; 2026 S.T. Craft Cottage — Made with <i className="fas fa-heart" style={{ color: '#E8B84B' }} /> by hand.</div>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
