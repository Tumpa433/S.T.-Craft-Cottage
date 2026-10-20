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
        admin: resolve(import.meta.dirname, 'admin.html')
      }
    }
  }
});
