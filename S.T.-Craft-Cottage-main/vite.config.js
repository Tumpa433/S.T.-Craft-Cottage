import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        products: resolve(import.meta.dirname, 'products.html'),
        cart: resolve(import.meta.dirname, 'cart.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        delivery: resolve(import.meta.dirname, 'delivery-returns.html'),
        admin: resolve(import.meta.dirname, 'admin.html')
      }
    }
  }
});
