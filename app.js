/* =========================================================
   MEDICAL PHARMACY — Billing & Inventory System
   Pure HTML/CSS/JS, localStorage-backed, GitHub Pages ready
   ========================================================= */

const DB = {
  KEYS:{ settings:'mx_settings', inventory:'mx_inventory', invoices:'mx_invoices', counter:'mx_counter', purchases:'mx_purchases' },
  get(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

let state = {
  settings: DB.get(DB.KEYS.settings, {
    shopName:'', license:'', phone:'', address:'', gst:'', logo:''
  }),
  inventory: DB.get(DB.KEYS.inventory, []),   // {id,name,category,qty,cost,price,batch,expiry}
  invoices: DB.get(DB.KEYS.invoices, []),     // {id,no,date,customer,items,subtotal,discount,tax,grand,payMode}
  purchases: DB.get(DB.KEYS.purchases, []),   // {id,date,name,category,qty,cost,price,supplier,batch,expiry}
  counter: DB.get(DB.KEYS.counter, 1)
};

function persist(){
  DB.set(DB.KEYS.settings, state.settings);
  DB.set(DB.KEYS.inventory, state.inventory);
  DB.set(DB.KEYS.invoices, state.invoices);
  DB.set(DB.KEYS.purchases, state.purchases);
  DB.set(DB.KEYS.counter, state.counter);
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function money(n){ return '₹' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtDate(d){ const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d){ const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ' · ' + dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }

function toast(msg, isErr){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isErr);
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove('show'), 2600);
}

/* ============ BOOT ============ */
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    document.getElementById('boot').classList.add('hide');
    document.getElementById('app').classList.add('ready');
  }, 900);
  initNav();
  initSettingsForm();
  initInvoiceBuilder();
  initInventoryView();
  initPurchaseView();
  initHistoryView();
  initModals();
  refreshHeaderBranding();
  renderDashboard();
  renderInventoryTable();
  renderHistoryTable();
  renderRecentPurchases();
  updateMedNameList();
  if(!state.settings.shopName){
    setTimeout(()=> toast('Add your shop details in Settings to complete your invoices'), 1400);
  }
});

/* ============ NAVIGATION ============ */
function initNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      document.getElementById('view-'+view).classList.add('active');
      if(view==='dashboard') renderDashboard();
      if(view==='inventory') renderInventoryTable();
      if(view==='history') renderHistoryTable();
      if(view==='purchase') renderRecentPurchases();
      if(view==='new-invoice') document.getElementById('nextInvNo').textContent = '#' + String(state.counter).padStart(4,'0');
    });
  });
}

/* ============ SETTINGS ============ */
function initSettingsForm(){
  const s = state.settings;
  document.getElementById('setShopName').value = s.shopName || '';
  document.getElementById('setLicense').value = s.license || '';
  document.getElementById('setPhone').value = s.phone || '';
  document.getElementById('setAddress').value = s.address || '';
  document.getElementById('setGST').value = s.gst || '';
  if(s.logo){ showLogoPreview(s.logo); }

  document.getElementById('saveSettings').addEventListener('click', ()=>{
    const shopName = document.getElementById('setShopName').value.trim();
    const license = document.getElementById('setLicense').value.trim();
    const phone = document.getElementById('setPhone').value.trim();
    const address = document.getElementById('setAddress').value.trim();
    if(!shopName || !phone || !address){
      toast('Shop name, phone & address are required', true); return;
    }
    state.settings.shopName = shopName;
    state.settings.license = license;
    state.settings.phone = phone;
    state.settings.address = address;
    state.settings.gst = document.getElementById('setGST').value.trim();
    persist();
    refreshHeaderBranding();
    renderDashboard();
    toast('Shop details saved');
  });

  document.getElementById('logoDrop').addEventListener('click', ()=> document.getElementById('logoInput').click());
  document.getElementById('logoInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 1.5*1024*1024){ toast('Please use an image under 1.5MB', true); return; }
    const reader = new FileReader();
    reader.onload = (ev)=>{
      state.settings.logo = ev.target.result;
      persist();
      showLogoPreview(ev.target.result);
      refreshHeaderBranding();
      toast('Logo uploaded');
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('removeLogo').addEventListener('click', ()=>{
    state.settings.logo = '';
    persist();
    document.getElementById('logoPreview').style.display='none';
    document.getElementById('logoDropText').style.display='block';
    refreshHeaderBranding();
    toast('Logo removed');
  });

  document.getElementById('exportData').addEventListener('click', exportBackup);
  document.getElementById('wipeData').addEventListener('click', ()=>{
    if(confirm('This will permanently delete all medicines, invoices and purchase records on this device. Continue?')){
      localStorage.clear();
      location.reload();
    }
  });
}

function showLogoPreview(src){
  const img = document.getElementById('logoPreview');
  img.src = src; img.style.display='block';
  document.getElementById('logoDropText').style.display='none';
}

function refreshHeaderBranding(){
  const s = state.settings;
  document.getElementById('brandName').innerHTML = (s.shopName ? escapeHtml(s.shopName).toUpperCase() : 'MEDICAL PHARMACY') + '<small>PHARMACY OS</small>';
  document.getElementById('chipShopName').textContent = s.shopName || 'Your Pharmacy';
  document.getElementById('sideLicense').textContent = s.license || '—';
  const mark = document.getElementById('brandMark');
  if(s.logo){ mark.innerHTML = `<img src="${s.logo}" alt="logo">`; }
  else { mark.textContent = (s.shopName ? s.shopName.trim().slice(0,2).toUpperCase() : 'MC'); }
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'medical-pharmacy-backup-'+Date.now()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded');
}

/* ============ INVENTORY ============ */
function initInventoryView(){
  document.getElementById('openAddMedicine').addEventListener('click', ()=> openModal('addMedModal'));
  document.getElementById('cancelNewMed').addEventListener('click', ()=> closeModal('addMedModal'));
  document.getElementById('saveNewMed').addEventListener('click', ()=>{
    const name = document.getElementById('newMedName').value.trim();
    const price = parseFloat(document.getElementById('newMedPrice').value)||0;
    if(!name){ toast('Medicine name is required', true); return; }
    if(price<=0){ toast('Sale price must be greater than 0', true); return; }
    const med = {
      id: uid(), name, category: document.getElementById('newMedCategory').value,
      qty: parseInt(document.getElementById('newMedQty').value)||0,
      cost: parseFloat(document.getElementById('newMedCost').value)||0,
      price, batch: document.getElementById('newMedBatch').value.trim(),
      expiry: document.getElementById('newMedExpiry').value
    };
    state.inventory.push(med);
    persist();
    renderInventoryTable(); renderDashboard(); updateMedNameList();
    closeModal('addMedModal');
    ['newMedName','newMedBatch'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('newMedQty').value=0;
    document.getElementById('newMedCost').value=0;
    document.getElementById('newMedPrice').value=0;
    document.getElementById('newMedExpiry').value='';
    toast('Medicine added to inventory');
  });
}

function stockPill(qty){
  if(qty<=0) return `<span class="pill pill-out">OUT OF STOCK</span>`;
  if(qty<=10) return `<span class="pill pill-low">LOW · ${qty}</span>`;
  return `<span class="pill pill-ok">IN STOCK · ${qty}</span>`;
}

function renderInventoryTable(){
  const wrap = document.getElementById('inventoryTable');
  if(state.inventory.length===0){
    wrap.innerHTML = emptyState('No medicines yet — add your first item or use Purchase Entry.');
    return;
  }
  const rows = [...state.inventory].sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`
    <tr>
      <td><b>${escapeHtml(m.name)}</b></td>
      <td>${escapeHtml(m.category||'—')}</td>
      <td>${escapeHtml(m.batch||'—')}</td>
      <td>${m.expiry?fmtDate(m.expiry):'—'}</td>
      <td>${money(m.price)}</td>
      <td>${stockPill(m.qty)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm" onclick="editMedPrompt('${m.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMed('${m.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
  wrap.innerHTML = `<table><thead><tr>
    <th>Medicine</th><th>Category</th><th>Batch</th><th>Expiry</th><th>Price</th><th>Stock</th><th>Actions</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function editMedPrompt(id){
  const m = state.inventory.find(x=>x.id===id);
  if(!m) return;
  const qty = prompt('Update stock quantity for "'+m.name+'":', m.qty);
  if(qty===null) return;
  const price = prompt('Update sale price for "'+m.name+'":', m.price);
  if(price===null) return;
  m.qty = parseInt(qty)||0;
  m.price = parseFloat(price)||m.price;
  persist();
  renderInventoryTable(); renderDashboard();
  toast('Medicine updated');
}

function deleteMed(id){
  const m = state.inventory.find(x=>x.id===id);
  if(!m) return;
  if(!confirm('Remove "'+m.name+'" from inventory?')) return;
  state.inventory = state.inventory.filter(x=>x.id!==id);
  persist();
  renderInventoryTable(); renderDashboard(); updateMedNameList();
  toast('Medicine removed');
}

function updateMedNameList(){
  const dl = document.getElementById('medNameList');
  dl.innerHTML = state.inventory.map(m=>`<option value="${escapeHtml(m.name)}">`).join('');
}

/* ============ PURCHASE ENTRY ============ */
function initPurchaseView(){
  document.getElementById('submitPurchase').addEventListener('click', ()=>{
    const name = document.getElementById('purMedName').value.trim();
    const qty = parseInt(document.getElementById('purQty').value)||0;
    const price = parseFloat(document.getElementById('purPrice').value)||0;
    if(!name){ toast('Medicine name is required', true); return; }
    if(qty<=0){ toast('Quantity must be at least 1', true); return; }
    if(price<=0){ toast('Sale price must be greater than 0', true); return; }
    const cost = parseFloat(document.getElementById('purCost').value)||0;
    const category = document.getElementById('purCategory').value;
    const supplier = document.getElementById('purSupplier').value.trim();
    const batch = document.getElementById('purBatch').value.trim();
    const expiry = document.getElementById('purExpiry').value;

    let existing = state.inventory.find(m=>m.name.toLowerCase()===name.toLowerCase());
    if(existing){
      existing.qty += qty;
      existing.cost = cost || existing.cost;
      existing.price = price || existing.price;
      if(batch) existing.batch = batch;
      if(expiry) existing.expiry = expiry;
    } else {
      state.inventory.push({ id:uid(), name, category, qty, cost, price, batch, expiry });
    }
    state.purchases.unshift({ id:uid(), date:new Date().toISOString(), name, category, qty, cost, price, supplier, batch, expiry });
    persist();
    renderInventoryTable(); renderDashboard(); renderRecentPurchases(); updateMedNameList();

    document.getElementById('purMedName').value='';
    document.getElementById('purSupplier').value='';
    document.getElementById('purBatch').value='';
    document.getElementById('purExpiry').value='';
    document.getElementById('purQty').value=1;
    document.getElementById('purCost').value=0;
    document.getElementById('purPrice').value=0;
    toast('Stock added: '+name+' (+'+qty+')');
  });
}

function renderRecentPurchases(){
  const wrap = document.getElementById('recentPurchases');
  if(state.purchases.length===0){
    wrap.innerHTML = emptyState('No purchase entries yet.');
    return;
  }
  const rows = state.purchases.slice(0,25).map(p=>`
    <tr>
      <td>${fmtDate(p.date)}</td>
      <td><b>${escapeHtml(p.name)}</b><br><span style="color:var(--muted);font-size:11px;">${escapeHtml(p.supplier||'—')}</span></td>
      <td><span class="pill pill-purchase">+${p.qty}</span></td>
      <td>${money(p.cost)}</td>
    </tr>`).join('');
  wrap.innerHTML = `<table><thead><tr><th>Date</th><th>Medicine</th><th>Qty</th><th>Cost/Unit</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ============ INVOICE BUILDER ============ */
let medRowCount = 0;
function initInvoiceBuilder(){
  document.getElementById('nextInvNo').textContent = '#' + String(state.counter).padStart(4,'0');
  addMedRow();
  document.getElementById('addMedRow').addEventListener('click', ()=> addMedRow());
  document.getElementById('billDiscount').addEventListener('input', recalcTotals);
  document.getElementById('billTax').addEventListener('input', recalcTotals);
  document.getElementById('completeBillBtn').addEventListener('click', completeBill);
}

function addMedRow(){
  medRowCount++;
  const rowId = 'row_'+medRowCount;
  const div = document.createElement('div');
  div.className = 'med-row';
  div.id = rowId;
  const options = state.inventory.map(m=>`<option value="${escapeHtml(m.name)}" data-id="${m.id}" data-price="${m.price}" data-stock="${m.qty}">`).join('');
  div.innerHTML = `
    <div class="field"><label>Medicine</label><input class="med-name" list="invMedList_${rowId}" placeholder="Type or select medicine">
      <datalist id="invMedList_${rowId}">${options}</datalist>
    </div>
    <div class="field"><label>Stock</label><input class="med-stock" value="—" disabled></div>
    <div class="field"><label>Qty</label><input type="number" class="med-qty" value="1" min="1"></div>
    <div class="field"><label>Price</label><input type="number" class="med-price" value="0" min="0" step="0.01"></div>
    <div class="field"><label>Total</label><input class="med-total" value="₹0.00" disabled></div>
    <button class="remove-row" title="Remove"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
  `;
  document.getElementById('medRows').appendChild(div);

  const nameInput = div.querySelector('.med-name');
  const qtyInput = div.querySelector('.med-qty');
  const priceInput = div.querySelector('.med-price');
  const stockInput = div.querySelector('.med-stock');

  nameInput.addEventListener('input', ()=>{
    const med = state.inventory.find(m=>m.name.toLowerCase()===nameInput.value.trim().toLowerCase());
    if(med){
      priceInput.value = med.price;
      stockInput.value = med.qty + ' avail.';
      div.dataset.medId = med.id;
    } else {
      stockInput.value = '—';
      delete div.dataset.medId;
    }
    recalcRow(div); recalcTotals();
  });
  [qtyInput, priceInput].forEach(inp=> inp.addEventListener('input', ()=>{ recalcRow(div); recalcTotals(); }));
  div.querySelector('.remove-row').addEventListener('click', ()=>{
    div.remove();
    recalcTotals();
  });
  recalcTotals();
}

function recalcRow(div){
  const qty = parseFloat(div.querySelector('.med-qty').value)||0;
  const price = parseFloat(div.querySelector('.med-price').value)||0;
  div.querySelector('.med-total').value = money(qty*price);
}

function recalcTotals(){
  let subtotal = 0;
  document.querySelectorAll('.med-row').forEach(div=>{
    const qty = parseFloat(div.querySelector('.med-qty').value)||0;
    const price = parseFloat(div.querySelector('.med-price').value)||0;
    subtotal += qty*price;
  });
  const discount = parseFloat(document.getElementById('billDiscount').value)||0;
  const taxPct = parseFloat(document.getElementById('billTax').value)||0;
  const taxAmt = (subtotal-discount) * (taxPct/100);
  const grand = Math.max(0, subtotal - discount + taxAmt);
  document.getElementById('sumSubtotal').textContent = money(subtotal);
  document.getElementById('sumDiscount').textContent = '− ' + money(discount);
  document.getElementById('sumTax').textContent = '+ ' + money(taxAmt);
  document.getElementById('sumGrand').textContent = money(grand);
  return { subtotal, discount, taxAmt, grand };
}

function completeBill(){
  const custName = document.getElementById('custName').value.trim();
  if(!custName){ toast('Customer name is required', true); return; }
  if(!state.settings.shopName){ toast('Please complete Shop Settings first (name, license, phone, address)', true); return; }

  const items = [];
  document.querySelectorAll('.med-row').forEach(div=>{
    const name = div.querySelector('.med-name').value.trim();
    const qty = parseFloat(div.querySelector('.med-qty').value)||0;
    const price = parseFloat(div.querySelector('.med-price').value)||0;
    if(!name || qty<=0 || price<=0) return;
    const medId = div.dataset.medId;
    items.push({ name, qty, price, total: qty*price, medId: medId||null });
  });
  if(items.length===0){ toast('Add at least one medicine with quantity & price', true); return; }

  // Validate combined quantity per medicine (covers the same medicine added on multiple rows)
  const neededByMed = {};
  items.forEach(it=>{ if(it.medId) neededByMed[it.medId] = (neededByMed[it.medId]||0) + it.qty; });
  for(const medId in neededByMed){
    const med = state.inventory.find(m=>m.id===medId);
    if(med && neededByMed[medId] > med.qty){
      toast(`Not enough stock for ${med.name} (only ${med.qty} left, ${neededByMed[medId]} needed)`, true);
      return;
    }
  }

  const totals = recalcTotals();
  const invoice = {
    id: uid(),
    no: String(state.counter).padStart(4,'0'),
    date: new Date().toISOString(),
    customer:{
      name: custName,
      phone: document.getElementById('custPhone').value.trim(),
      address: document.getElementById('custAddress').value.trim(),
      doctor: document.getElementById('custDoctor').value.trim()
    },
    items, subtotal: totals.subtotal, discount: totals.discount, tax: totals.taxAmt, grand: totals.grand,
    payMode: document.getElementById('payMode').value
  };

  items.forEach(it=>{
    if(it.medId){
      const med = state.inventory.find(m=>m.id===it.medId);
      if(med) med.qty = Math.max(0, med.qty - it.qty);
    }
  });

  state.invoices.unshift(invoice);
  state.counter += 1;
  persist();

  renderInventoryTable(); renderDashboard(); renderHistoryTable();
  showInvoicePreview(invoice);
  resetInvoiceForm();
  toast('Bill completed — Invoice #' + invoice.no);
}

function resetInvoiceForm(){
  document.getElementById('custName').value='';
  document.getElementById('custPhone').value='';
  document.getElementById('custAddress').value='';
  document.getElementById('custDoctor').value='';
  document.getElementById('billDiscount').value=0;
  document.getElementById('billTax').value=0;
  document.getElementById('medRows').innerHTML='';
  addMedRow();
  document.getElementById('nextInvNo').textContent = '#' + String(state.counter).padStart(4,'0');
  recalcTotals();
}

/* ============ INVOICE RENDER / PRINT / PDF ============ */
function buildInvoiceHTML(inv){
  const s = state.settings;
  const logoBlock = s.logo
    ? `<img class="inv-logo" src="${s.logo}" alt="logo">`
    : `<div class="inv-logo-fallback">${escapeHtml((s.shopName||'MX').trim().slice(0,2).toUpperCase())}</div>`;

  const itemsRows = inv.items.map(it=>`
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td style="text-align:center;">${it.qty}</td>
      <td style="text-align:right;">${money(it.price)}</td>
      <td style="text-align:right;">${money(it.total)}</td>
    </tr>`).join('');

  return `
  <div class="invoice-sheet">
    <div class="inv-head">
      ${logoBlock}
      <div>
        <div class="inv-shop-name">${escapeHtml(s.shopName||'Your Pharmacy Name')}</div>
        <div class="inv-shop-meta">
          ${escapeHtml(s.address||'Shop address not set')}<br>
          Ph: ${escapeHtml(s.phone||'—')} ${s.license?(' &nbsp;·&nbsp; Lic. No: '+escapeHtml(s.license)):''}${s.gst?(' &nbsp;·&nbsp; GSTIN: '+escapeHtml(s.gst)):''}
        </div>
      </div>
      <div class="inv-badge">
        <div class="tag">Invoice</div>
        <div class="num">#${inv.no}</div>
        <div style="font-size:9px;color:#8493a3;margin-top:2px;">${fmtDateTime(inv.date)}</div>
      </div>
    </div>
    <div class="inv-body">
      <div class="inv-meta-grid">
        <div><span>Customer</span><b>${escapeHtml(inv.customer.name)}</b></div>
        <div><span>Phone</span><b>${escapeHtml(inv.customer.phone||'—')}</b></div>
        <div><span>Address</span><b>${escapeHtml(inv.customer.address||'—')}</b></div>
        <div><span>Doctor</span><b>${escapeHtml(inv.customer.doctor||'—')}</b></div>
      </div>
      <table class="inv-table">
        <thead><tr><th>Medicine</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Amount</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="inv-totals">
        <div class="r"><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
        <div class="r"><span>Discount</span><span>− ${money(inv.discount)}</span></div>
        <div class="r"><span>Tax</span><span>+ ${money(inv.tax)}</span></div>
        <div class="r grand"><span>Total</span><span>${money(inv.grand)}</span></div>
      </div>
    </div>
    <div class="inv-sign">
      <div>Customer Signature</div>
      <div>Authorised Signatory</div>
    </div>
    <div class="inv-foot">
      <div class="lic">${s.license?('Drug License No: '+escapeHtml(s.license)+' · '):''}Payment: ${escapeHtml(inv.payMode)} · This is a computer-generated invoice.</div>
      <div class="thanks">Thank you for choosing ${escapeHtml(s.shopName||'us')}! Get well soon.</div>
    </div>
  </div>`;
}

let currentInvoiceForPdf = null;
function showInvoicePreview(inv){
  currentInvoiceForPdf = inv;
  document.getElementById('invoicePreviewHolder').innerHTML = buildInvoiceHTML(inv);
  openModal('invoiceModal');
}

function initModals(){
  document.getElementById('closeInvoiceModal').addEventListener('click', ()=> closeModal('invoiceModal'));
  document.getElementById('printInvoiceBtn').addEventListener('click', ()=> window.print());
  document.getElementById('downloadPdfBtn').addEventListener('click', downloadInvoicePdf);
  document.querySelectorAll('.modal-overlay').forEach(ov=>{
    ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.classList.remove('show'); });
  });
}
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); }

async function downloadInvoicePdf(){
  if(!currentInvoiceForPdf) return;
  const node = document.getElementById('invoicePreviewHolder').querySelector('.invoice-sheet');
  toast('Preparing PDF…');
  try{
    const canvas = await html2canvas(node, { scale:3, backgroundColor:'#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'mm', format:'a5' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 12;
    const imgH = (canvas.height * imgW) / canvas.width;
    const finalH = Math.min(imgH, pageH - 12);
    pdf.addImage(imgData, 'PNG', 6, 6, imgW, finalH);
    pdf.save('Invoice-'+currentInvoiceForPdf.no+'.pdf');
    toast('PDF downloaded');
  }catch(err){
    console.error(err);
    toast('Could not generate PDF — try Print instead', true);
  }
}

function viewInvoice(id){
  const inv = state.invoices.find(i=>i.id===id);
  if(!inv) return;
  showInvoicePreview(inv);
}

/* ============ HISTORY ============ */
function initHistoryView(){
  document.getElementById('historySearch').addEventListener('input', renderHistoryTable);
}

function renderHistoryTable(){
  const wrap = document.getElementById('historyTable');
  const q = (document.getElementById('historySearch').value||'').toLowerCase();
  let list = state.invoices;
  if(q){
    list = list.filter(inv =>
      inv.customer.name.toLowerCase().includes(q) ||
      (inv.customer.phone||'').includes(q) ||
      inv.no.includes(q)
    );
  }
  if(list.length===0){
    wrap.innerHTML = emptyState('No invoices found.');
    return;
  }
  const rows = list.map(inv=>`
    <tr>
      <td>#${inv.no}</td>
      <td>${fmtDate(inv.date)}</td>
      <td><b>${escapeHtml(inv.customer.name)}</b><br><span style="color:var(--muted);font-size:11px;">${escapeHtml(inv.customer.phone||'—')}</span></td>
      <td>${inv.items.length} item(s)</td>
      <td><span class="pill pill-sale">${escapeHtml(inv.payMode)}</span></td>
      <td><b>${money(inv.grand)}</b></td>
      <td><button class="btn btn-sm" onclick="viewInvoice('${inv.id}')">View / Print</button></td>
    </tr>`).join('');
  wrap.innerHTML = `<table><thead><tr>
    <th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Action</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

/* ============ DASHBOARD ============ */
function renderDashboard(){
  document.getElementById('statMedicines').textContent = state.inventory.length;
  const low = state.inventory.filter(m=>m.qty<=10).length;
  document.getElementById('statLowStock').textContent = low;

  const todayStr = new Date().toDateString();
  const todayInvs = state.invoices.filter(inv=> new Date(inv.date).toDateString()===todayStr);
  document.getElementById('statInvToday').textContent = todayInvs.length;
  document.getElementById('statInvTodayAmt').textContent = money(todayInvs.reduce((a,b)=>a+b.grand,0)) + ' sold';

  const totalRevenue = state.invoices.reduce((a,b)=>a+b.grand,0);
  document.getElementById('statTotalRevenue').textContent = money(totalRevenue);
  document.getElementById('statInvCount').textContent = state.invoices.length;

  const recWrap = document.getElementById('dashRecentInvoices');
  if(state.invoices.length===0){
    recWrap.innerHTML = emptyState('No invoices yet.');
  } else {
    const rows = state.invoices.slice(0,6).map(inv=>`
      <tr>
        <td>#${inv.no}</td>
        <td>${escapeHtml(inv.customer.name)}</td>
        <td>${fmtDate(inv.date)}</td>
        <td><b>${money(inv.grand)}</b></td>
      </tr>`).join('');
    recWrap.innerHTML = `<table><thead><tr><th>Inv.</th><th>Customer</th><th>Date</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const lowWrap = document.getElementById('dashLowStock');
  const lowItems = state.inventory.filter(m=>m.qty<=10).sort((a,b)=>a.qty-b.qty).slice(0,6);
  if(lowItems.length===0){
    lowWrap.innerHTML = emptyState('All stock levels look healthy.');
  } else {
    const rows = lowItems.map(m=>`
      <tr><td><b>${escapeHtml(m.name)}</b></td><td>${stockPill(m.qty)}</td></tr>`).join('');
    lowWrap.innerHTML = `<table><thead><tr><th>Medicine</th><th>Stock</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function emptyState(msg){
  return `<div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
    <div>${escapeHtml(msg)}</div>
  </div>`;
}
