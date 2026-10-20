# S.T. Craft Cottage

Static React/Vite storefront for handmade puja, festival and gifting products. The catalogue comes from `products.json`; there is **no backend, database, user account, paid API, or server-side product editor**.

The storefront and product studio use the shop's candle logo at `public/assets/images/brand-logo.png`.

Customers can browse the products and prepare order or contact enquiries in WhatsApp. They review the draft and send it themselves; the shop confirms availability, delivery and payment directly. The site does not take online payments or save orders.

## Edit products and photos

1. Open the live shop's `/admin.html` page, or start it locally with `npm run dev` and open the Vite address followed by `/admin.html`.
2. Add products, edit their names, descriptions, categories, prices, options, colours and image paths, or remove products. To start with another catalogue, use **Open a products.json file**.
3. Upload JPG, PNG or WebP photos (up to 5 MB per photo). Uploaded files are prepared for `public/assets/images/products/` in the download bundle.
4. Select **Download store update ZIP**. The downloaded archive contains `products.json` and any new product-image files.
5. Keep a backup of your project, then extract the archive into the `S.T.-Craft-Cottage-main` project folder, allowing it to update `products.json` and add new images.
6. Test the site locally. Commit/push the changed files to the connected Git repository; Cloudflare Pages will rebuild and redeploy. If deploying manually, build and upload the generated `dist` folder instead.

The editor works entirely in the browser. It does not upload or save changes on Cloudflare. The live customer catalogue changes only after you apply the ZIP to the project and deploy the updated site. Anyone can view the editor, but their edits/downloads stay on their own device and cannot change your live shop.

## Run and build locally

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Run `npm run dev` and open the URL printed by Vite.
4. Run `npm run build` to create the static site in `dist`; run `npm run preview` to preview that build.

The build includes `index.html`, `products.html`, `cart.html`, `contact.html`, `admin.html`, `assets`, `_headers` and `robots.txt`.

## Cloudflare Pages free hosting

Connect the Git repository to Cloudflare Pages, use `S.T.-Craft-Cottage-main` as the project root/build directory, `npm run build` as the build command, and `dist` as the output directory. Cloudflare Pages hosts these static files at a free `pages.dev` address on its Free plan.

Free plans are governed by provider limits and terms; they are not guaranteed to be unlimited. Check Cloudflare's current limits and usage dashboard. This static site avoids a database/backend service, but still depends on any third-party services used for fonts/icons and WhatsApp.

## Customer-order notes

- The browser basket is saved on the customer's own device with the local-storage key `stCraftCottageCart`.
- WhatsApp opens a prepared message; it is not sent until the customer taps **Send**.
- Basket totals are estimates. Confirm prices, stock and delivery with the customer before payment.
- Review all product details, current contact information, delivery promises, returns terms, and other store policies before launch.

Keep a backup of `products.json` and `public/assets/images/` before making catalog changes.
