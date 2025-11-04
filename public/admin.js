(() => {
  const loginSection = document.getElementById('loginSection');
  const adminSection = document.getElementById('adminSection');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const addItemForm = document.getElementById('addItemForm');
  const menuList = document.getElementById('menuList');
  const logoutBtn = document.getElementById('logoutBtn');
  const repYear = document.getElementById('repYear');
  const repMonth = document.getElementById('repMonth');
  const runReportBtn = document.getElementById('runReport');
  const exportCsvBtn = document.getElementById('exportCsv');
  const reportSummary = document.getElementById('reportSummary');
  const reportTable = document.getElementById('reportTable');

  async function me() {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      loginSection.style.display = 'none';
      adminSection.style.display = 'block';
      loadMenuAll();
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || 'Login failed';
    } else {
      loginSection.style.display = 'none';
      adminSection.style.display = 'block';
      loadMenuAll();
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
  });

  async function loadMenuAll() {
    const res = await fetch('/api/menu/all');
    const items = await res.json();
    renderMenuList(items);
  }

  function renderMenuList(items) {
    menuList.innerHTML = '';
    for (const it of items) {
      const div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${it.image_url || ''}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #eee"/>
          <strong>${it.name}</strong> — ₹ ${(it.price_cents/100).toFixed(2)} ${it.is_available? '':'(hidden)'}
        </div>
        <div>
          <button data-act="toggle">${it.is_available? 'Hide':'Show'}</button>
          <button data-act="edit" class="secondary">Edit</button>
          <button data-act="del" class="secondary">Delete</button>
        </div>
      `;
      div.querySelector('[data-act="toggle"]').addEventListener('click', async ()=>{
        await fetch(`/api/menu/${it.id}/toggle`, { method: 'PATCH' });
        loadMenuAll();
      });
      div.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
        if (!confirm('Delete item?')) return;
        await fetch(`/api/menu/${it.id}`, { method: 'DELETE' });
        loadMenuAll();
      });
      div.querySelector('[data-act="edit"]').addEventListener('click', async ()=>{
        const name = prompt('Name', it.name);
        if (!name) return;
        const price = Number(prompt('Price (₹)', (it.price_cents/100).toFixed(2)));
        const image_url = prompt('Image URL', it.image_url || '') || '';
        const body = { name, price_cents: Math.round(price*100), image_url, is_available: it.is_available };
        await fetch(`/api/menu/${it.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        loadMenuAll();
      });
      menuList.appendChild(div);
    }
  }

  addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const price = Number(document.getElementById('itemPrice').value);
    const image_url = document.getElementById('itemImage').value.trim();
    if (!name || !price) return;
    await fetch('/api/menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price_cents: Math.round(price * 100), image_url })
    });
    (e.target).reset();
    loadMenuAll();
  });

  runReportBtn.addEventListener('click', async () => {
    const y = String(repYear.value || new Date().getFullYear());
    const mRaw = repMonth.value || (new Date().getMonth()+1);
    const m = String(mRaw).padStart(2,'0');
    const res = await fetch(`/api/reports/monthly?year=${y}&month=${m}`);
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Report error'); return; }
    reportSummary.textContent = `Orders: ${data.summary.orders_count || 0} | Total: ₹ ${((data.summary.total_cents||0)/100).toFixed(2)}`;
    reportTable.innerHTML = '<tr><th>Item</th><th>Qty</th><th>Revenue (₹)</th></tr>' +
      data.items.map(r=>`<tr><td>${r.name}</td><td>${r.qty}</td><td>${(r.revenue_cents/100).toFixed(2)}</td></tr>`).join('');
  });

  exportCsvBtn.addEventListener('click', () => {
    const rows = Array.from(reportTable.querySelectorAll('tr')).map(tr=>Array.from(tr.children).map(td=>`"${td.textContent.replace(/"/g,'""')}"`).join(','));
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'monthly_report.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  me();
})();



