import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import starterProducts from '../products.json';
import '../style.css';

const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

function normalizeProduct(product, index = 0) {
  return {
    ...product,
    id: String(product.id ?? crypto.randomUUID()),
    name: String(product.name || ''),
    category: String(product.category || 'puja-decor'),
    desc: String(product.desc || product.description || ''),
    price: Number(product.price ?? product.variants?.[0]?.price ?? 0),
    unit: String(product.unit || product.variants?.[0]?.unit || 'piece'),
    icon: String(product.icon || '🪔'),
    images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
    variants: Array.isArray(product.variants) ? product.variants.map(variant => ({ ...variant, id: String(variant.id ?? crypto.randomUUID()), price: String(variant.price ?? '') })) : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    colorImages: product.colorImages && typeof product.colorImages === 'object' ? product.colorImages : {},
    display_order: Number(product.display_order ?? index)
  };
}

function newProduct() {
  return { ...normalizeProduct({ id: crypto.randomUUID(), name: '', category: 'puja-decor', desc: '', price: '', unit: 'piece', icon: '🪔', images: [], variants: [], colors: [], colorImages: {}, display_order: 0 }), price: '' };
}

function CatalogEditor() {
  const [products, setProducts] = useState(() => starterProducts.map(normalizeProduct));
  const [form, setForm] = useState(newProduct);
  const [editingId, setEditingId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const photoPreviews = useMemo(() => new Map(photos.map(photo => [photo.path, URL.createObjectURL(photo.file)])), [photos]);

  useEffect(() => () => photoPreviews.forEach(url => URL.revokeObjectURL(url)), [photoPreviews]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter(product => [product.name, product.category].some(value => value.toLocaleLowerCase().includes(query)));
  }, [products, search]);

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setDirty(true);
  }

  function clearMessage() {
    setNotice('');
    setError('');
  }

  function startNewProduct() {
    setForm(newProduct());
    setEditingId('');
    setPhotos([]);
    setDirty(false);
    clearMessage();
  }

  function startEditing(product) {
    setForm({ ...normalizeProduct(product), variants: product.variants.map(variant => ({ ...variant })) });
    setEditingId(product.id);
    setPhotos([]);
    setDirty(false);
    clearMessage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveProduct(event) {
    event.preventDefault();
    clearMessage();
    if (!form.name.trim() || !form.category.trim() || String(form.price).trim() === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setError('Enter a product name, category, and valid non-negative price.');
      return;
    }
    const namedVariants = form.variants.filter(variant => variant.name?.trim());
    if (namedVariants.some(variant => String(variant.price ?? '').trim() === '' || !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0)) {
      setError('Each product option needs a name and valid non-negative price.');
      return;
    }
    const variants = namedVariants.map(variant => ({
      ...variant,
      name: variant.name.trim(),
      price: Number(variant.price),
      unit: String(variant.unit || form.unit || 'piece').trim()
    }));
    const colors = form.colors.map(color => color.trim()).filter(Boolean);
    const images = form.images.map(image => image.trim()).filter(Boolean);
    const updated = normalizeProduct({
      ...form,
      id: editingId || crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category.trim().toLowerCase().replace(/\s+/g, '-'),
      desc: form.desc.trim(),
      price: Number(form.price),
      unit: form.unit.trim() || 'piece',
      icon: form.icon.trim() || '🪔',
      images,
      variants,
      colors,
      colorImages: Object.fromEntries(colors.map(color => [color, form.colorImages[color]]).filter(([, image]) => image && images.includes(image))),
      display_order: Number(form.display_order) || 0
    }, products.length);

    if (products.some(product => product.id === updated.id && product.id !== editingId)) {
      setError('A product with that ID already exists. Please edit the existing item instead.');
      return;
    }
    setProducts(current => editingId
      ? current.map(product => product.id === editingId ? updated : product)
      : [...current, updated]);
    setForm(updated);
    setEditingId(updated.id);
    setPhotos(current => current.filter(photo => updated.images.includes(photo.path)));
    setDirty(true);
    setNotice(editingId ? 'Changes saved in this browser. Download the store bundle to publish them.' : 'Product added in this browser. Download the store bundle to publish it.');
  }

  function deleteProduct(product) {
    if (!window.confirm(`Remove “${product.name}” from the catalogue? Download and redeploy the store bundle to publish this change.`)) return;
    setProducts(current => current.filter(item => item.id !== product.id));
    setPhotos(current => current.filter(photo => !product.images.includes(photo.path)));
    if (editingId === product.id) startNewProduct();
    setDirty(true);
    clearMessage();
    setNotice(`${product.name} removed from the draft catalogue. Download the store bundle to publish the change.`);
  }

  async function uploadPhotos(event) {
    clearMessage();
    const files = [...event.target.files];
    if (!files.length) return;
    const pending = [];
    for (const file of files) {
      const extension = allowedImages.get(file.type);
      if (!extension) {
        setError(`${file.name}: use JPG, PNG, or WebP images.`);
        event.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name}: each image must be 5 MB or smaller.`);
        event.target.value = '';
        return;
      }
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
      const filename = `${slug}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
      pending.push({ path: `assets/images/products/${filename}`, file });
    }
    setPhotos(current => [...current, ...pending]);
    setForm(current => ({ ...current, images: [...current.images, ...pending.map(photo => photo.path)] }));
    setDirty(true);
    setNotice(`${pending.length} image${pending.length === 1 ? '' : 's'} added to the draft. Download the store bundle to include the image files.`);
    event.target.value = '';
  }

  function removePhoto(image) {
    setForm(current => ({
      ...current,
      images: current.images.filter(item => item !== image),
      colorImages: Object.fromEntries(Object.entries(current.colorImages).filter(([, mappedImage]) => mappedImage !== image))
    }));
    setPhotos(current => current.filter(photo => photo.path !== image));
    setDirty(true);
  }

  function updateVariant(index, field, value) {
    updateForm('variants', form.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant));
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    clearMessage();
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item) || !String(item.name || '').trim())) {
        throw new Error('The file must contain a JSON array of products, each with a name.');
      }
      if (dirty && !window.confirm('Replace this editor’s unsaved draft with the products in the selected JSON file?')) return;
      const imported = parsed.map(normalizeProduct);
      const ids = imported.map(product => product.id);
      if (new Set(ids).size !== ids.length) throw new Error('The file contains duplicate product IDs.');
      setProducts(imported);
      setForm(newProduct());
      setEditingId('');
      setPhotos([]);
      setDirty(true);
      setNotice(`Loaded ${imported.length} products from ${file.name}. Download the store bundle to publish the catalogue.`);
    } catch (importError) {
      setError(`Could not read the product file: ${importError.message}`);
    }
  }

  async function downloadBundle() {
    clearMessage();
    setBusy(true);
    try {
      const zip = new JSZip();
      zip.file('products.json', JSON.stringify(products, null, 2) + '\n');
      const publicFolder = zip.folder('public');
      for (const photo of photos) publicFolder.file(photo.path, photo.file);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = 'st-craft-cottage-store-update.zip';
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDirty(false);
      setNotice('Store bundle downloaded. Unzip it over the project folder, then deploy/rebuild the updated files to publish changes.');
    } catch (downloadError) {
      setError(`Could not create your store bundle: ${downloadError.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-topbar">
        <a href="index.html" className="logo" aria-label="S.T. Craft Cottage home"><img src="assets/images/brand-logo.png" alt="S.T. Craft Cottage" /></a>
        <a href="index.html" className="admin-store-link"><i className="fas fa-arrow-left" /> View store</a>
      </div>
      <div className="admin-shell">
        <header className="admin-heading">
          <span className="hero-eyebrow">BROWSER-BASED CATALOGUE EDITOR · NO ACCOUNT REQUIRED</span>
          <h1>Product studio</h1>
          <p>Add, edit and remove products or upload photos, then download your store update to publish on Cloudflare Pages.</p>
        </header>

        <section className="admin-panel admin-local-warning" role="note">
          <strong>This is a local editor, not a live admin login.</strong>
          <p>Changes stay in this browser until you download the bundle, replace the project files and redeploy. The public shop only reads <code>products.json</code>; it cannot be changed by someone visiting this page.</p>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h2>{editingId ? 'Edit product' : 'Add a product'}</h2><p>Product photos you add are included inside the downloadable project bundle.</p></div>
            {editingId && <button type="button" className="btn-secondary" onClick={startNewProduct}>+ New product</button>}
          </div>
          <form className="admin-product-form" onSubmit={saveProduct}>
            <label>Product name<input maxLength="120" required value={form.name} onChange={event => updateForm('name', event.target.value)} placeholder="e.g. Hand-painted puja thali" /></label>
            <label>Collection/category<input list="product-categories" maxLength="60" required value={form.category} onChange={event => updateForm('category', event.target.value)} placeholder="e.g. puja decor" /><datalist id="product-categories">{[...new Set(products.map(product => product.category))].map(category => <option key={category} value={category} />)}</datalist></label>
            <label>Description<textarea rows="3" maxLength="1000" value={form.desc} onChange={event => updateForm('desc', event.target.value)} /></label>
            <div className="admin-form-row">
              <label>Starting price (₹)<input type="number" min="0" step="0.01" required value={form.price} onChange={event => updateForm('price', event.target.value)} /></label>
              <label>Unit<input maxLength="40" value={form.unit} onChange={event => updateForm('unit', event.target.value)} placeholder="piece, set, pack…" /></label>
              <label>Display order<input type="number" step="1" value={form.display_order} onChange={event => updateForm('display_order', event.target.value)} /></label>
            </div>
            <label>Product icon / emoji<input maxLength="8" value={form.icon} onChange={event => updateForm('icon', event.target.value)} placeholder="🪔" /></label>

            <fieldset className="admin-variants">
              <legend>Price options (optional)</legend>
              {form.variants.map((variant, index) => (
                <div className="admin-variant-row" key={variant.id || index}>
                  <input aria-label={`Option ${index + 1} name`} placeholder="e.g. Mogra · 1 candle" value={variant.name || ''} onChange={event => updateVariant(index, 'name', event.target.value)} />
                  <input aria-label={`Option ${index + 1} price`} type="number" min="0" step="0.01" placeholder="Price (₹)" value={variant.price ?? ''} onChange={event => updateVariant(index, 'price', event.target.value)} />
                  <input aria-label={`Option ${index + 1} unit`} placeholder="Unit" value={variant.unit || ''} onChange={event => updateVariant(index, 'unit', event.target.value)} />
                  <button type="button" className="admin-remove-option" aria-label={`Remove option ${index + 1}`} onClick={() => updateForm('variants', form.variants.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => updateForm('variants', [...form.variants, { id: crypto.randomUUID(), name: '', price: '', unit: form.unit || 'piece' }])}>+ Add price option</button>
            </fieldset>

            <label>Colours (one per line)<textarea rows="2" value={form.colors.join('\n')} onChange={event => updateForm('colors', event.target.value.split('\n'))} placeholder={'Marigold\nRed'} /></label>
            <label>Product image paths (one per line)<textarea rows="3" value={form.images.join('\n')} onChange={event => updateForm('images', event.target.value.split('\n'))} placeholder="Image paths are included in products.json" /></label>
            <label className="admin-upload">Upload product photos (JPG, PNG or WebP; max 5 MB each)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} /></label>
            {form.images.length > 0 && (
              <div className="admin-photo-list">
                {form.images.map((image, index) => {
                  return (
                    <div className="admin-photo-row" key={`${image}-${index}`}>
                      <img src={photoPreviews.get(image) || `/${image.replace(/^\/+/, '')}`} alt="" />
                      <span title={image}>{image}</span>
                      <button type="button" className="admin-remove-option" onClick={() => removePhoto(image)}>Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
            {form.colors.filter(color => color.trim()).length > 0 && form.images.length > 0 && (
              <fieldset className="admin-color-images">
                <legend>Optional photo for each colour</legend>
                {form.colors.filter(color => color.trim()).map(color => (
                  <label key={color}>{color}
                    <select value={form.colorImages[color] || ''} onChange={event => updateForm('colorImages', { ...form.colorImages, [color]: event.target.value })}>
                      <option value="">Use the first product photo</option>
                      {form.images.map((image, index) => <option value={image} key={`${image}-${index}`}>Photo {index + 1}</option>)}
                    </select>
                  </label>
                ))}
              </fieldset>
            )}
            <button className="btn-primary" type="submit">{editingId ? 'Save product changes' : 'Add product to catalogue'}</button>
          </form>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h2>Your products <span className="admin-count">{products.length}</span></h2><p>{dirty ? 'There are unpublished changes in this browser.' : 'Catalog data loads from the project products.json file.'}</p></div>
            <input className="admin-search" type="search" aria-label="Search products" placeholder="Find a product" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <div className="admin-data-actions">
            <label className="btn-secondary admin-import-json">Open a products.json file<input type="file" accept=".json,application/json" onChange={importJson} /></label>
            <button className="btn-primary" type="button" onClick={downloadBundle} disabled={busy}>{busy ? 'Preparing download…' : 'Download store update ZIP'}</button>
          </div>
          <p className="admin-bundle-help">Unzip the downloaded file over your <code>S.T.-Craft-Cottage-main</code> project folder. It updates <code>products.json</code> and adds any uploaded images. Then redeploy the project on Cloudflare Pages.</p>
          {!visibleProducts.length ? <p>No products found.</p> : (
            <div className="admin-product-list">
              {visibleProducts.map(product => (
                <article className="admin-product-row" key={product.id}>
                  {product.images?.[0] ? <img src={`/${product.images[0].replace(/^\/+/, '')}`} alt="" loading="lazy" /> : <span className="admin-product-icon">{product.icon || '🪔'}</span>}
                  <div className="admin-product-detail"><strong>{product.name}</strong><span>{product.category} · ₹{product.price} / {product.unit}</span>{product.variants.length > 0 && <span>{product.variants.length} price option{product.variants.length === 1 ? '' : 's'}</span>}</div>
                  <div className="admin-product-actions">
                    <button type="button" className="btn-secondary" onClick={() => startEditing(product)}>Edit</button>
                    <button type="button" className="admin-delete" onClick={() => deleteProduct(product)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<CatalogEditor />);
