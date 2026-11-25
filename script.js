'use strict';

/* ==========================================================
   script.js — ใช้ร่วมกันทุกหน้า
   ตรวจจากองค์ประกอบที่มีในหน้า แล้วเรียกเฉพาะฟังก์ชันของหน้านั้น
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

/* ---------- Config ---------- */
const PRODUCTS_URL = 'products.json';

const ORDER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbxeDEBKgH_8evcqq13WvL5YBu0PUSwHcE6Qegkoy5V2x38l4lbANZW4Dba2P4lAJ-sI/exec';

const ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR-OXJngNWPrzMgomTCxMzAiS8Tf8mLp4s2axVFEnuBoTGM7RFb-691RX1iAmp8yICWkfL5-tCexaVp/pub?gid=0&single=true&output=csv';

/* ปุ่มกรอง: key ตรงกับค่า flavor ใน products.json */
const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'tom-yum-shrimp', label: 'มาม่าต้มยำกุ้ง' },
  { key: 'minced-pork', label: 'มาม่าหมูสับ' },
  { key: 'tom-yum', label: 'ไวไวต้มยำ' },
  { key: 'suki', label: 'ยำยำสุกี้' }
];

const FLAVOR_LABELS = {
  'tom-yum-shrimp': 'ต้มยำกุ้ง',
  'minced-pork': 'หมูสับ',
  'tom-yum': 'ต้มยำ',
  'suki': 'สุกี้'
};

const BRAND_LABELS = {
  mama: 'มาม่า',
  waiwai: 'ไวไว',
  yumyum: 'ยำยำ'
};

/* ---------- Helpers ---------- */
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(price) {
  const n = Number(price);
  return (isNaN(n) ? price : n.toLocaleString('th-TH')) + ' บาท';
}

/* ==========================================================
   หน้า product.html
   ========================================================== */
async function initProductPage() {
  const listEl = document.getElementById('product-list');
  const filterEl = document.getElementById('filter-bar');
  if (!listEl) return;

  const messageHtml = (text) =>
    '<p class="text-center" style="grid-column: 1 / -1;">' + escapeHtml(text) + '</p>';

  listEl.innerHTML = messageHtml('กำลังโหลดสินค้า...');

  let products = [];
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    products = await res.json();
  } catch (error) {
    console.error(error);
    listEl.innerHTML = messageHtml('ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง');
    return;
  }

  /* รสชาติเริ่มต้นจาก ?flavor=xxx (ถ้าไม่ถูกต้องให้แสดงทั้งหมด) */
  const param = new URLSearchParams(window.location.search).get('flavor');
  let activeFlavor = FILTERS.some((f) => f.key === param) ? param : 'all';

  function renderFilters() {
    if (!filterEl) return;
    filterEl.innerHTML = FILTERS.map((f) => {
      const isActive = f.key === activeFlavor;
      return (
        '<button type="button" class="btn ' + (isActive ? 'btn--outline' : 'btn--ghost') + '"' +
        ' data-filter="' + escapeHtml(f.key) + '"' +
        ' aria-pressed="' + isActive + '">' +
        escapeHtml(f.label) +
        '</button>'
      );
    }).join(' ');
  }

  function cardHtml(p) {
    const brandLabel = BRAND_LABELS[p.brand] || p.brand;
    const flavorLabel = FLAVOR_LABELS[p.flavor] || p.flavor;
    const orderUrl =
      'order.html?item=' + encodeURIComponent(p.name + ' ' + p.size) +
      '&price=' + encodeURIComponent(p.price);

    return (
      '<article class="product-card flavor-' + escapeHtml(p.flavor) + '" data-id="' + escapeHtml(p.id) + '">' +
        '<div class="product-card__image">' +
          '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
        '</div>' +
        '<div class="product-card__body">' +
          '<span class="flavor-tag">' + escapeHtml(brandLabel) + ' · ' + escapeHtml(flavorLabel) + '</span>' +
          '<h3 class="product-card__name">' + escapeHtml(p.name) + '</h3>' +
          '<p class="product-card__desc">' + escapeHtml(p.description) + '</p>' +
          '<div class="product-card__meta">' +
            '<span class="product-card__size">' + escapeHtml(p.size) + '</span>' +
            '<span class="product-card__price">' + escapeHtml(formatPrice(p.price)) + '</span>' +
          '</div>' +
          '<a class="btn btn--outline btn--block" href="' + orderUrl + '">สั่งซื้อ</a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderProducts() {
    const visible = activeFlavor === 'all'
      ? products
      : products.filter((p) => p.flavor === activeFlavor);

    listEl.innerHTML = visible.length
      ? visible.map(cardHtml).join('')
      : messageHtml('ไม่พบสินค้าในหมวดนี้');
  }

  if (filterEl) {
    filterEl.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-filter]');
      if (!btn) return;
      activeFlavor = btn.getAttribute('data-filter');
      renderFilters();
      renderProducts();

      /* อัปเดต URL เพื่อให้คัดลอกลิงก์ที่กรองไว้ไปใช้ต่อได้ */
      try {
        const url = new URL(window.location.href);
        if (activeFlavor === 'all') url.searchParams.delete('flavor');
        else url.searchParams.set('flavor', activeFlavor);
        window.history.replaceState(null, '', url);
      } catch (e) { /* ไม่สำคัญ */ }
    });
  }

  renderFilters();
  renderProducts();
}

/* ==========================================================
   หน้า order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  /* เติมชื่อสินค้าและราคาจาก URL ทันทีที่โหลดหน้า */
  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');

  const itemsEl = document.getElementById('items');
  const totalEl = document.getElementById('total');

  if (itemsEl && item !== null) itemsEl.value = item;
  if (totalEl && price !== null) totalEl.value = price;

  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true; /* กันกดซ้ำจนออเดอร์ซ้ำ */

    const payload = {
      customerName: getValue('customerName'),
      contact: getValue('contact'),
      items: getValue('items'),
      total: getValue('total'),
      note: getValue('note')
    };

    fetch(ORDER_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================
   หน้า admin.html
   ========================================================== */

/* parse CSV เอง: รองรับ "..." , "" (quote ซ้อน), comma และขึ้นบรรทัดใหม่ในช่อง, \r\n, BOM */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  const COLS = 6; /* วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ */
  const LABELS = ['วันเวลา', 'ชื่อลูกค้า', 'เบอร์โทร/Line', 'รายการสินค้า', 'จำนวนเงินรวม', 'หมายเหตุ'];

  function setStatus(message) {
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLS;
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  setStatus('กำลังโหลดข้อมูลคำสั่งซื้อ...');

  let text;
  try {
    const res = await fetch(ORDERS_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    text = await res.text();
  } catch (error) {
    console.error(error);
    setStatus('ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
    return;
  }

  /* ตัดแถวว่าง */
  let rows = parseCSV(text).filter((r) => r.some((cell) => cell.trim() !== ''));

  /* ถ้าแถวแรกเป็นหัวตาราง (ช่องวันเวลาไม่มีตัวเลข) ให้ข้าม */
  if (rows.length && !/\d/.test(rows[0][0])) rows.shift();

  if (!rows.length) {
    setStatus('ยังไม่มีคำสั่งซื้อ');
    return;
  }

  /* แถวใหม่ถูกต่อท้ายเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน */
  rows.reverse();

  const frag = document.createDocumentFragment();
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    for (let i = 0; i < COLS; i++) {
      const td = document.createElement('td');
      td.setAttribute('data-label', LABELS[i]);
      td.textContent = r[i] !== undefined ? r[i] : ''; /* textContent กัน XSS จากข้อมูลลูกค้า */
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

/* ==========================================================
   ตัวเลือกหน้า: เรียกเฉพาะฟังก์ชันของหน้าที่มีองค์ประกอบนั้นอยู่
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});
