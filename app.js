const STORAGE_KEY = "medical-pharmacy-billing-v1";
const blankState = {
  settings: {
    shopName: "Medical Pharmacy",
    licenseNo: "",
    phone: "",
    address: "",
    invoiceSize: "a5",
    logo: ""
  },
  stock: [],
  purchases: [],
  invoices: [],
  nextInvoice: 1
};

let state = loadState();
let currentInvoice = null;

const $ = (id) => document.getElementById(id);
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? { ...structuredClone(blankState), ...stored } : structuredClone(blankState);
  } catch {
    return structuredClone(blankState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function setView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === id));
  if (id === "sale" && !$("saleItems").children.length) addSaleRow();
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.querySelectorAll("[data-go]").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.go)));
}

function applySettings() {
  const s = state.settings;
  $("navShopName").textContent = s.shopName || "Medical Pharmacy";
  $("headerShopName").textContent = s.shopName || "Medical Pharmacy";
  $("headerLicense").textContent = `Drug License: ${s.licenseNo || "Add in setup"}`;
  $("headerPhone").textContent = `Phone: ${s.phone || "Add in setup"}`;
  $("headerAddress").textContent = `Address: ${s.address || "Add in setup"}`;
  ["navLogo", "headerLogo"].forEach((id) => {
    const img = $(id);
    img.src = s.logo || "";
    img.style.display = s.logo ? "block" : "none";
  });
  $("logoFallback").style.display = s.logo ? "none" : "block";
  $("headerLogoFallback").style.display = s.logo ? "none" : "block";
  $("shopName").value = s.shopName || "";
  $("licenseNo").value = s.licenseNo || "";
  $("shopPhone").value = s.phone || "";
  $("shopAddress").value = s.address || "";
  $("invoiceSize").value = s.invoiceSize || "a5";
  $("invoiceNumber").textContent = `Invoice #${String(state.nextInvoice).padStart(4, "0")}`;
}

function renderDashboard() {
  const salesTotal = state.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const purchaseTotal = state.purchases.reduce((sum, p) => sum + p.total, 0);
  const alerts = state.stock.filter((item) => item.qty <= 5 || isExpired(item.expiry)).length;
  $("metricSales").textContent = money(salesTotal);
  $("metricPurchases").textContent = money(purchaseTotal);
  $("metricItems").textContent = state.stock.length;
  $("metricAlerts").textContent = alerts;

  $("recentInvoices").innerHTML = state.invoices.slice(-5).reverse().map((inv) => `
    <tr><td>${inv.number}</td><td>${escapeHtml(inv.customer.name)}</td><td>${inv.date}</td><td>${money(inv.total)}</td></tr>
  `).join("") || `<tr><td colspan="4" class="empty">No invoices yet</td></tr>`;

  const watch = state.stock
    .filter((item) => item.qty <= 5 || isExpired(item.expiry))
    .slice(0, 8)
    .map((item) => `
      <div class="watch-item ${isExpired(item.expiry) ? "bad" : ""}">
        <span>${escapeHtml(item.name)} (${escapeHtml(item.batch || "No batch")})</span>
        <span>${isExpired(item.expiry) ? "Expired" : `${item.qty} left`}</span>
      </div>
    `).join("");
  $("stockWatch").innerHTML = watch || `<div class="empty">No low-stock or expired items</div>`;
}

function isExpired(expiry) {
  return expiry ? `${expiry}-01` < today().slice(0, 8) + "01" : false;
}

function renderStock() {
  const term = $("stockSearch").value?.toLowerCase() || "";
  const rows = state.stock.filter((item) => [item.name, item.type, item.batch, item.manufacturer].join(" ").toLowerCase().includes(term));
  $("stockTable").innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}<br><small>${escapeHtml(item.manufacturer || "")}</small></td>
      <td>${escapeHtml(item.type)}</td>
      <td>${escapeHtml(item.batch || "-")}</td>
      <td>${escapeHtml(item.expiry || "-")}${isExpired(item.expiry) ? " <strong style='color:#c74738'>Expired</strong>" : ""}</td>
      <td>${item.qty}</td>
      <td>${money(item.saleRate)}</td>
      <td>
        <button class="row-btn ok" onclick="quickAddStock('${item.id}')">+ Stock</button>
        <button class="row-btn" onclick="deleteStock('${item.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="7" class="empty">No stock added</td></tr>`;

  $("purchaseHistory").innerHTML = state.purchases.slice().reverse().map((p) => `
    <tr><td>${p.date}</td><td>${escapeHtml(p.name)}</td><td>${p.qty}</td><td>${money(p.purchaseRate)}</td><td>${money(p.total)}</td></tr>
  `).join("") || `<tr><td colspan="5" class="empty">No purchases yet</td></tr>`;
}

function renderInvoiceHistory() {
  const term = $("invoiceSearch").value?.toLowerCase() || "";
  const rows = state.invoices.filter((inv) => [inv.number, inv.customer.name, inv.customer.phone].join(" ").toLowerCase().includes(term)).reverse();
  $("invoiceHistory").innerHTML = rows.map((inv) => `
    <tr>
      <td>${inv.number}</td><td>${inv.date}</td><td>${escapeHtml(inv.customer.name)}</td><td>${escapeHtml(inv.customer.phone || "-")}</td><td>${money(inv.total)}</td>
      <td>
        <button class="row-btn ok" onclick="openInvoice('${inv.id}')">Print</button>
        <button class="row-btn" onclick="deleteInvoice('${inv.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="empty">No invoice history yet</td></tr>`;
}

function renderAll() {
  applySettings();
  renderDashboard();
  renderStock();
  renderInvoiceHistory();
  refreshSaleSelects();
  calculateSale();
}

function bindForms() {
  $("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = {
      ...state.settings,
      shopName: $("shopName").value.trim() || "Medical Pharmacy",
      licenseNo: $("licenseNo").value.trim(),
      phone: $("shopPhone").value.trim(),
      address: $("shopAddress").value.trim(),
      invoiceSize: $("invoiceSize").value
    };
    saveState();
    toast("Shop setup saved.");
  });

  $("logoInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.settings.logo = reader.result;
      saveState();
      toast("Logo uploaded.");
    };
    reader.readAsDataURL(file);
  });

  $("purchaseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const purchase = {
      id: uid(),
      date: today(),
      name: $("itemName").value.trim(),
      type: $("itemType").value,
      batch: $("batch").value.trim(),
      expiry: $("expiry").value,
      manufacturer: $("manufacturer").value.trim(),
      qty: Number($("quantity").value || 0),
      purchaseRate: Number($("purchaseRate").value || 0),
      saleRate: Number($("saleRate").value || 0),
      gstRate: Number($("gstRate").value || 0)
    };
    purchase.total = purchase.qty * purchase.purchaseRate;
    const existing = state.stock.find((item) => item.name.toLowerCase() === purchase.name.toLowerCase() && item.batch === purchase.batch);
    if (existing) {
      existing.qty += purchase.qty;
      Object.assign(existing, {
        type: purchase.type,
        expiry: purchase.expiry,
        manufacturer: purchase.manufacturer,
        purchaseRate: purchase.purchaseRate,
        saleRate: purchase.saleRate,
        gstRate: purchase.gstRate
      });
    } else {
      state.stock.push({ ...purchase, qty: purchase.qty });
    }
    state.purchases.push(purchase);
    event.target.reset();
    $("quantity").value = 1;
    $("purchaseRate").value = 0;
    $("saleRate").value = 0;
    $("gstRate").value = 0;
    saveState();
    toast("Purchase stock added.");
  });

  $("saleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const items = collectSaleItems();
    if (!items.length) return toast("Add at least one medicine.");
    for (const item of items) {
      const stock = state.stock.find((s) => s.id === item.stockId);
      if (stock && item.qty > stock.qty) return toast(`${stock.name} has only ${stock.qty} in stock.`);
    }
    items.forEach((item) => {
      const stock = state.stock.find((s) => s.id === item.stockId);
      if (stock) stock.qty -= item.qty;
    });
    const totals = calculateSale();
    const invoice = {
      id: uid(),
      number: `INV-${String(state.nextInvoice).padStart(4, "0")}`,
      date: today(),
      customer: {
        name: $("customerName").value.trim(),
        phone: $("customerPhone").value.trim(),
        idNumber: $("customerId").value.trim(),
        address: $("customerAddress").value.trim(),
        doctor: $("doctorName").value.trim()
      },
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      paid: totals.paid,
      total: totals.total,
      balance: totals.balance
    };
    state.invoices.push(invoice);
    state.nextInvoice += 1;
    saveState();
    clearSaleForm();
    openInvoice(invoice.id);
  });
}

function addSaleRow(stockId = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="sale-stock"></select></td>
    <td><input class="sale-batch" readonly></td>
    <td><input class="sale-expiry" readonly></td>
    <td><input class="sale-qty" type="number" min="1" value="1"></td>
    <td><input class="sale-rate" type="number" min="0" step="0.01" value="0"></td>
    <td><input class="sale-gst" type="number" min="0" step="0.01" value="0"></td>
    <td class="sale-amount">₹0.00</td>
    <td><button type="button" class="row-btn">Remove</button></td>
  `;
  $("saleItems").appendChild(tr);
  const select = tr.querySelector(".sale-stock");
  fillStockSelect(select);
  select.value = stockId;
  updateSaleRow(tr);
  tr.addEventListener("input", () => calculateSale());
  select.addEventListener("change", () => updateSaleRow(tr));
  tr.querySelector(".row-btn").addEventListener("click", () => {
    tr.remove();
    calculateSale();
  });
}

function fillStockSelect(select) {
  select.innerHTML = `<option value="">Select item</option>` + state.stock
    .filter((item) => item.qty > 0 && !isExpired(item.expiry))
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} | Batch ${escapeHtml(item.batch || "-")} | Stock ${item.qty}</option>`)
    .join("");
}

function refreshSaleSelects() {
  document.querySelectorAll(".sale-stock").forEach((select) => {
    const value = select.value;
    fillStockSelect(select);
    select.value = value;
  });
}

function updateSaleRow(tr) {
  const stock = state.stock.find((item) => item.id === tr.querySelector(".sale-stock").value);
  tr.querySelector(".sale-batch").value = stock?.batch || "";
  tr.querySelector(".sale-expiry").value = stock?.expiry || "";
  tr.querySelector(".sale-rate").value = stock?.saleRate || 0;
  tr.querySelector(".sale-gst").value = stock?.gstRate || 0;
  calculateSale();
}

function collectSaleItems() {
  return [...$("saleItems").querySelectorAll("tr")].map((tr) => {
    const stock = state.stock.find((item) => item.id === tr.querySelector(".sale-stock").value);
    const qty = Number(tr.querySelector(".sale-qty").value || 0);
    const rate = Number(tr.querySelector(".sale-rate").value || 0);
    const gst = Number(tr.querySelector(".sale-gst").value || 0);
    const taxable = qty * rate;
    const tax = taxable * gst / 100;
    return stock && qty > 0 ? {
      stockId: stock.id,
      name: stock.name,
      type: stock.type,
      batch: stock.batch,
      expiry: stock.expiry,
      qty,
      rate,
      gst,
      tax,
      amount: taxable + tax
    } : null;
  }).filter(Boolean);
}

function calculateSale() {
  let subtotal = 0;
  let tax = 0;
  [...$("saleItems").querySelectorAll("tr")].forEach((tr) => {
    const qty = Number(tr.querySelector(".sale-qty").value || 0);
    const rate = Number(tr.querySelector(".sale-rate").value || 0);
    const gst = Number(tr.querySelector(".sale-gst").value || 0);
    const rowTax = qty * rate * gst / 100;
    const amount = qty * rate + rowTax;
    subtotal += qty * rate;
    tax += rowTax;
    tr.querySelector(".sale-amount").textContent = money(amount);
  });
  const discount = Number($("discount").value || 0);
  const paid = Number($("paid").value || 0);
  const total = Math.max(0, subtotal + tax - discount);
  const balance = Math.max(0, total - paid);
  $("subtotal").textContent = money(subtotal);
  $("taxTotal").textContent = money(tax);
  $("grandTotal").textContent = money(total);
  $("balanceDue").textContent = money(balance);
  return { subtotal, tax, discount, paid, total, balance };
}

function clearSaleForm() {
  $("saleForm").reset();
  $("saleItems").innerHTML = "";
  $("discount").value = 0;
  $("paid").value = 0;
  addSaleRow();
  calculateSale();
}

function openInvoice(id) {
  currentInvoice = state.invoices.find((inv) => inv.id === id);
  if (!currentInvoice) return;
  $("printArea").innerHTML = invoiceHtml(currentInvoice);
  $("invoiceDialog").showModal();
}

function invoiceHtml(inv) {
  const s = state.settings;
  return `
    <section class="bill ${s.invoiceSize || "a5"}">
      <header class="bill-header">
        ${s.logo ? `<img class="bill-logo" src="${s.logo}" alt="Shop logo">` : `<div class="bill-logo" style="display:grid;place-items:center;font-weight:900">Rx</div>`}
        <div>
          <h2>${escapeHtml(s.shopName || "Medical Pharmacy")}</h2>
          <div>${escapeHtml(s.address || "Shop address")}</div>
          <div><strong>Drug License:</strong> ${escapeHtml(s.licenseNo || "-")} &nbsp; <strong>Phone:</strong> ${escapeHtml(s.phone || "-")}</div>
        </div>
      </header>
      <div class="bill-meta">
        <div><strong>Invoice:</strong> ${inv.number}</div>
        <div><strong>Date:</strong> ${inv.date}</div>
        <div><strong>Doctor:</strong> ${escapeHtml(inv.customer.doctor || "-")}</div>
        <div><strong>Payment:</strong> Paid ${money(inv.paid)} / Balance ${money(inv.balance)}</div>
      </div>
      <div class="bill-customer">
        <div><strong>Customer:</strong> ${escapeHtml(inv.customer.name)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(inv.customer.phone || "-")}</div>
        <div><strong>Aadhaar / ID:</strong> ${escapeHtml(inv.customer.idNumber || "-")}</div>
        <div><strong>Address:</strong> ${escapeHtml(inv.customer.address || "-")}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Medicine</th><th>Batch</th><th>Exp.</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
        <tbody>${inv.items.map((item, index) => `
          <tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.batch || "-")}</td><td>${escapeHtml(item.expiry || "-")}</td><td>${item.qty}</td><td>${money(item.rate)}</td><td>${item.gst}%</td><td>${money(item.amount)}</td></tr>
        `).join("")}</tbody>
      </table>
      <div class="bill-total">
        <div><span>Subtotal</span><strong>${money(inv.subtotal)}</strong></div>
        <div><span>GST</span><strong>${money(inv.tax)}</strong></div>
        <div><span>Discount</span><strong>${money(inv.discount)}</strong></div>
        <div class="grand"><span>Total</span><strong>${money(inv.total)}</strong></div>
      </div>
      <div class="signature"><span>Customer Signature</span><span>Pharmacist Signature</span></div>
      <p class="fine-print">Goods once sold are not returnable unless required by law. Dispense prescription medicines only as per valid prescription and local regulations.</p>
    </section>
  `;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function toast(message) {
  const node = document.createElement("div");
  node.textContent = message;
  node.style.cssText = "position:fixed;right:18px;bottom:18px;background:#19322d;color:white;padding:13px 16px;border-radius:999px;font-weight:900;z-index:9999;box-shadow:0 18px 40px rgba(0,0,0,.25)";
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

window.quickAddStock = (id) => {
  const stock = state.stock.find((item) => item.id === id);
  if (!stock) return;
  const qty = Number(prompt(`Add quantity for ${stock.name}`, "1") || 0);
  if (qty > 0) {
    stock.qty += qty;
    state.purchases.push({ ...stock, id: uid(), date: today(), qty, total: qty * Number(stock.purchaseRate || 0) });
    saveState();
  }
};

window.deleteStock = (id) => {
  if (!confirm("Delete this stock item?")) return;
  state.stock = state.stock.filter((item) => item.id !== id);
  saveState();
};

window.deleteInvoice = (id) => {
  if (!confirm("Delete this invoice history entry? Stock will not be restored automatically.")) return;
  state.invoices = state.invoices.filter((inv) => inv.id !== id);
  saveState();
};

function bindUtilities() {
  $("addSaleItem").addEventListener("click", () => addSaleRow());
  $("clearSale").addEventListener("click", clearSaleForm);
  ["discount", "paid"].forEach((id) => $(id).addEventListener("input", calculateSale));
  $("stockSearch").addEventListener("input", renderStock);
  $("invoiceSearch").addEventListener("input", renderInvoiceHistory);
  $("closeInvoice").addEventListener("click", () => $("invoiceDialog").close());
  $("printInvoice").addEventListener("click", () => window.print());
  $("shareInvoice").addEventListener("click", async () => {
    if (!currentInvoice) return;
    const text = `${state.settings.shopName} ${currentInvoice.number} total ${money(currentInvoice.total)}`;
    if (navigator.share) await navigator.share({ title: currentInvoice.number, text });
    else {
      await navigator.clipboard.writeText(text);
      toast("Invoice summary copied for sharing.");
    }
  });
  $("backupBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pharmacy-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("importBackup").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = { ...structuredClone(blankState), ...JSON.parse(reader.result) };
        saveState();
        toast("Backup imported.");
      } catch {
        toast("Backup file is not valid.");
      }
    };
    reader.readAsText(file);
  });
  $("resetData").addEventListener("click", () => {
    if (!confirm("Reset all shop setup, stock, purchases and invoices?")) return;
    state = structuredClone(blankState);
    saveState();
  });
}

bindNavigation();
bindForms();
bindUtilities();
addSaleRow();
renderAll();
