(() => {
  'use strict';
  const CATEGORIES = [
    { name: 'Food & dining', color: '#ed8c74', tint: '#fff0eb', icon: 'F' },
    { name: 'Transport', color: '#6e86e8', tint: '#edf1ff', icon: 'T' },
    { name: 'Shopping', color: '#a18ae8', tint: '#f3efff', icon: 'S' },
    { name: 'Bills & utilities', color: '#d7a344', tint: '#fff6df', icon: 'B' },
    { name: 'Health', color: '#49b69a', tint: '#e7f8f2', icon: 'H' },
    { name: 'Entertainment', color: '#e17db2', tint: '#fff0f7', icon: 'E' },
    { name: 'Education', color: '#52a6c7', tint: '#eaf8fc', icon: 'L' },
    { name: 'Other', color: '#9298aa', tint: '#f0f1f6', icon: '•' }
  ];
  const $ = id => document.getElementById(id);
  const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(amount) || 0);
  const today = () => new Date().toLocaleDateString('en-CA');
  const currentMonth = () => today().slice(0, 7);
  const safeParse = (value, fallback) => { try { const result = JSON.parse(value); return Array.isArray(result) || (result && typeof result === 'object') ? result : fallback; } catch { return fallback; } };
  let expenses = safeParse(localStorage.getItem('finwise-expenses'), []);
  let budgets = safeParse(localStorage.getItem('finwise-budgets'), {});
  let activeView = 'overview';
  let toastTimer;
  const save = () => {
    try { localStorage.setItem('finwise-expenses', JSON.stringify(expenses)); localStorage.setItem('finwise-budgets', JSON.stringify(budgets)); }
    catch { notify('Storage is unavailable. Your latest changes may not persist.'); }
  };
  const category = name => CATEGORIES.find(item => item.name === name) || CATEGORIES[CATEGORIES.length - 1];
  const monthExpenses = () => expenses.filter(item => item.date && item.date.slice(0, 7) === $('month-filter').value);
  const total = items => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthBudget = () => Object.values(budgets).reduce((sum, amount) => sum + Number(amount || 0), 0);
  function notify(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function fillCategorySelects() {
    ['expense-category', 'budget-category'].forEach(id => {
      const select = $(id); const selected = select.value;
      select.innerHTML = CATEGORIES.map(item => '<option value="' + item.name + '">' + item.name + '</option>').join('');
      if (CATEGORIES.some(item => item.name === selected)) select.value = selected;
    });
    const filter = $('category-filter'); const current = filter.value || 'all';
    filter.innerHTML = '<option value="all">All categories</option>' + CATEGORIES.map(item => '<option value="' + item.name + '">' + item.name + '</option>').join('');
    filter.value = current;
  }
  function renderStats(items) {
    const spent = total(items), planned = monthBudget(), remaining = planned - spent;
    $('total-spending').textContent = money(spent);
    $('total-budget').textContent = money(planned);
    $('remaining-budget').textContent = money(remaining);
    $('remaining-budget').style.color = remaining < 0 ? '#d85f54' : '';
    $('transaction-count').textContent = items.length;
    $('spending-caption').textContent = items.length ? 'Across ' + new Set(items.map(item => item.category)).size + ' categories' : 'No spending recorded yet';
    $('remaining-caption').textContent = remaining < 0 ? money(Math.abs(remaining)) + ' over budget' : 'Available this month';
  }
  function renderChart(items) {
    const totals = CATEGORIES.map(cat => ({ ...cat, amount: total(items.filter(item => item.category === cat.name)) })).filter(cat => cat.amount > 0).sort((a,b) => b.amount-a.amount);
    const chart = $('category-chart'); chart.innerHTML = '';
    $('chart-empty').classList.toggle('hidden', totals.length > 0);
    const max = Math.max(1, ...totals.map(item => item.amount));
    totals.forEach(item => {
      const row = document.createElement('div'); row.className = 'chart-row';
      row.innerHTML = '<div class="category-name"><span class="category-dot" style="--dot:' + item.color + '"></span><span></span></div><div class="bar-track"><div class="bar-fill" style="--dot:' + item.color + ';width:' + (item.amount/max*100) + '%"></div></div><strong class="chart-value"></strong>';
      row.querySelector('.category-name span:last-child').textContent = item.name;
      row.querySelector('.chart-value').textContent = money(item.amount); chart.appendChild(row);
    });
    $('chart-month-label').textContent = new Date($('month-filter').value + '-02').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  function renderBudgetProgress(items) {
    const root = $('budget-progress'); root.innerHTML = '';
    const rows = Object.entries(budgets).filter(([, amount]) => Number(amount) > 0).map(([name, amount]) => {
      const spent = total(items.filter(item => item.category === name));
      return { name, amount: Number(amount), spent, pct: Number(amount) ? spent / Number(amount) * 100 : 0, ...category(name) };
    }).sort((a,b) => b.pct-a.pct).slice(0, 5);
    $('budget-empty').classList.toggle('hidden', rows.length > 0);
    rows.forEach(item => {
      const row = document.createElement('div'); row.className = 'budget-item' + (item.pct > 100 ? ' over-budget' : '');
      row.innerHTML = '<div class="budget-item-head"><strong></strong><span></span></div><div class="progress-track"><div class="progress-fill" style="width:' + Math.min(100,item.pct) + '%"></div></div><small></small>';
      row.querySelector('.budget-item-head strong').textContent = item.name;
      row.querySelector('.budget-item-head span').textContent = money(item.spent) + ' / ' + money(item.amount);
      row.querySelector('small').textContent = item.pct > 100 ? money(item.spent-item.amount) + ' over limit' : Math.round(item.pct) + '% of budget used';
      root.appendChild(row);
    });
  }
  function renderTransactions(items) {
    const search = $('search-transactions').value.trim().toLowerCase(), filter = $('category-filter').value;
    const filtered = items.filter(item => (filter === 'all' || item.category === filter) && [item.name,item.category,item.note,item.payment].some(value => String(value || '').toLowerCase().includes(search)));
    const display = activeView === 'transactions' ? filtered : filtered.slice(0, 5);
    const body = $('transaction-rows'); body.innerHTML = '';
    $('transactions-empty').classList.toggle('hidden', display.length > 0);
    display.forEach(item => {
      const cat = category(item.category), row = document.createElement('tr');
      row.innerHTML = '<td><div class="expense-title"><span class="expense-symbol" style="--dot:' + cat.color + ';--tint:' + cat.tint + '"></span><span></span></div></td><td><span class="category-chip"></span></td><td></td><td class="amount-cell"></td><td><div class="row-actions"><button class="mini-action" data-action="edit" data-id="' + item.id + '">Edit</button><button class="mini-action" data-action="delete" data-id="' + item.id + '">Delete</button></div></td>';
      row.querySelector('.expense-symbol').textContent = cat.icon;
      row.querySelector('.expense-title span:last-child').textContent = item.name;
      row.querySelector('.category-chip').textContent = item.category;
      row.children[2].textContent = new Date(item.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      row.querySelector('.amount-cell').textContent = '− ' + money(item.amount);
      body.appendChild(row);
    });
  }
  function renderBudgets(items) {
    const root = $('all-budgets'); root.innerHTML = '';
    CATEGORIES.filter(cat => Number(budgets[cat.name]) > 0).forEach(cat => {
      const spent = total(items.filter(item => item.category === cat.name)), amount = Number(budgets[cat.name]);
      const row = document.createElement('div'); row.className = 'budget-manage-row';
      const info = document.createElement('div'); const strong = document.createElement('strong'); const small = document.createElement('small');
      strong.textContent = cat.name; small.textContent = money(spent) + ' spent of ' + money(amount);
      info.append(strong,small);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      const edit = document.createElement('button'); edit.className = 'mini-action'; edit.textContent = 'Edit'; edit.addEventListener('click', () => { $('budget-category').value=cat.name; $('budget-amount').value=amount; $('budget-amount').focus(); });
      const remove = document.createElement('button'); remove.className = 'mini-action'; remove.textContent = 'Remove'; remove.addEventListener('click', () => { if (confirm('Remove the ' + cat.name + ' budget?')) { delete budgets[cat.name]; save(); render(); notify('Budget removed'); } });
      actions.append(edit,remove); row.append(info,actions); root.appendChild(row);
    });
  }
  function render() {
    const items = monthExpenses(); renderStats(items); renderChart(items); renderBudgetProgress(items); renderTransactions(items); renderBudgets(items);
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === activeView));
    $('page-title').textContent = activeView === 'budgets' ? 'Budgets' : activeView === 'transactions' ? 'Transactions' : 'Overview';
    $('transactions-heading').textContent = activeView === 'transactions' ? 'All transactions' : 'Recent transactions';
    $('budgets-view').classList.toggle('hidden', activeView !== 'budgets');
    document.querySelector('.content-grid').classList.toggle('hidden', activeView === 'transactions' || activeView === 'budgets');
    $('transactions-heading').closest('.panel').classList.toggle('hidden', activeView === 'budgets');
    $('transactions-heading').closest('.panel').classList.toggle('transaction-full', activeView === 'transactions');
  }
  function openDialog(item) {
    $('expense-form').reset(); $('form-error').classList.add('hidden'); fillCategorySelects();
    $('expense-id').value = item ? item.id : '';
    $('dialog-title').textContent = item ? 'Edit expense' : 'Add expense';
    $('expense-name').value = item ? item.name : '';
    $('expense-amount').value = item ? item.amount : '';
    $('expense-date').value = item ? item.date : today();
    $('expense-category').value = item ? item.category : CATEGORIES[0].name;
    $('expense-payment').value = item ? item.payment : 'UPI';
    $('expense-note').value = item ? item.note || '' : '';
    $('expense-dialog').showModal(); $('expense-name').focus();
  }
  function closeDialog() { $('expense-dialog').close(); }
  $('open-expense').addEventListener('click', () => openDialog(null));
  $('close-dialog').addEventListener('click', closeDialog); $('cancel-dialog').addEventListener('click', closeDialog);
  $('expense-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('expense-name').value.trim(), amount = Number($('expense-amount').value), date = $('expense-date').value;
    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) { $('form-error').textContent = 'Enter a name, a positive amount, and a valid date.'; $('form-error').classList.remove('hidden'); return; }
    const id = $('expense-id').value || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    const item = { id, name, amount: Math.round(amount*100)/100, date, category: $('expense-category').value, payment: $('expense-payment').value, note: $('expense-note').value.trim() };
    const index = expenses.findIndex(expense => expense.id === id);
    if (index >= 0) expenses[index] = item; else expenses.push(item);
    save(); closeDialog(); $('month-filter').value = date.slice(0,7); render(); notify(index >= 0 ? 'Expense updated' : 'Expense added');
  });
  $('transaction-rows').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const item = expenses.find(expense => expense.id === button.dataset.id); if (!item) return;
    if (button.dataset.action === 'edit') openDialog(item);
    if (button.dataset.action === 'delete' && confirm('Delete "' + item.name + '"? This cannot be undone.')) { expenses = expenses.filter(expense => expense.id !== item.id); save(); render(); notify('Expense deleted'); }
  });
  $('month-filter').value = currentMonth();
  $('month-filter').addEventListener('change', render);
  $('search-transactions').addEventListener('input', render);
  $('category-filter').addEventListener('change', render);
  $('budget-form').addEventListener('submit', event => {
    event.preventDefault(); const cat = $('budget-category').value, amount = Number($('budget-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) { notify('Enter a budget greater than zero'); return; }
    budgets[cat] = Math.round(amount*100)/100; save(); $('budget-amount').value=''; render(); notify(cat + ' budget saved');
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { activeView = button.dataset.view; render(); if (activeView === 'transactions') $('search-transactions').focus(); }));
  fillCategorySelects();
  // Seed a few realistic entries only on a brand-new install so the dashboard
  // communicates its layout; users can remove them and data persists locally.
  if (!localStorage.getItem('finwise-seeded')) {
    if (!expenses.length) {
      const month = currentMonth();
      expenses = [
        {id:'sample-1',name:'Weekly groceries',amount:1280,date:month+'-03',category:'Food & dining',payment:'UPI',note:'Market and essentials'},
        {id:'sample-2',name:'Metro & cab',amount:460,date:month+'-06',category:'Transport',payment:'UPI',note:''},
        {id:'sample-3',name:'Monthly internet',amount:799,date:month+'-08',category:'Bills & utilities',payment:'Card',note:''},
        {id:'sample-4',name:'Course materials',amount:650,date:month+'-10',category:'Education',payment:'UPI',note:''}
      ];
    }
    if (!Object.keys(budgets).length) budgets = {'Food & dining':5000,'Transport':2000,'Shopping':3000,'Bills & utilities':2500};
    save(); localStorage.setItem('finwise-seeded','true');
  }
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // No service worker is required; this guard intentionally avoids network assets.
  }
})();
