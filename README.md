# Medical Pharmacy — Billing & Inventory System

A complete, single-website pharmacy billing and stock management system built with plain HTML, CSS and JavaScript. No backend, no build step — everything runs in the browser and saves to `localStorage` on your device.

## Features

- **Dashboard** — total medicines, low/out-of-stock alerts, today's sales, total revenue
- **New Invoice** — add customer name, phone, address, doctor name, then add any number of medicines (tablets, syrups, injections, etc.) with live stock lookup, quantity, price, discount and tax
- **Sales History** — every completed bill saved and searchable by customer name, phone or invoice number, with re-print/re-download anytime
- **Inventory** — full medicine list with stock levels, batch numbers, expiry dates, edit and delete
- **Purchase Entry** — stock-in from your suppliers; automatically adds to inventory
- **Shop Settings** — your shop name, Drug License Number, phone, address, GSTIN and logo — all appear on the header and on every printed invoice
- **Invoice Output** — clean A5-size printable invoice with your logo and shop details; **Print** button (browser print dialog) and **Download PDF** button (saves an actual .pdf file)

## Getting started (no coding needed)

1. Open `index.html` in any browser (double-click it).
2. Go to **Shop Settings** and fill in your shop name, Drug License Number, phone, address, and upload your logo. Click **Save Details**.
3. Go to **Purchase Entry** (or **Inventory → Add Medicine**) to stock your medicines.
4. Go to **New Invoice** to bill a customer. Add medicines, complete the bill, then **Print** or **Download PDF**.

All your data (medicines, invoices, purchases, shop details, logo) is stored privately in your browser's `localStorage` — it stays on the device you use it on. Use **Shop Settings → Export Backup (JSON)** regularly to keep a safe copy.

> Note: because data is stored per-browser, it will **not** automatically sync between your phone and computer. Export/import the JSON backup if you need to move data between devices, or always use the same browser/device for billing.

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `pharmacy-billing`).
2. Upload `index.html`, `app.js`, and this `README.md` to the repository (drag-and-drop on github.com works fine, or use `git push`).
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**, select the `main` branch and `/ (root)` folder, then **Save**.
5. After a minute, GitHub will give you a live URL like:
   `https://<your-username>.github.io/pharmacy-billing/`
6. Open that link on your phone or computer to use your pharmacy system anywhere.

## File structure

```
index.html   → page structure & all styling (dark futuristic UI + clean printable invoice)
app.js       → all app logic: inventory, billing, invoice history, print & PDF export
README.md    → this file
```

## Notes

- The printable invoice is set to A5 paper size by default (change `@page { size: A5; }` in `index.html` if you prefer A4 or A6).
- The "Download PDF" button generates a real `.pdf` file you can WhatsApp or email directly to customers.
- To reset all data (start fresh), use **Shop Settings → Reset All Data**.
