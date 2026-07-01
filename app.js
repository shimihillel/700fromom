const STORAGE_KEY = 'mamaAmra700:v1';
const DEFAULT_STATE = {
  budget: 700,
  monthKey: getMonthKey(new Date()),
  expenses: [],
  history: []
};

const els = {
  remainingAmount: document.querySelector('#remainingAmount'),
  spentAmount: document.querySelector('#spentAmount'),
  budgetAmount: document.querySelector('#budgetAmount'),
  usedPercent: document.querySelector('#usedPercent'),
  daysLeft: document.querySelector('#daysLeft'),
  progressCircle: document.querySelector('#progressCircle'),
  budgetMessage: document.querySelector('#budgetMessage'),
  monthLabel: document.querySelector('#monthLabel'),
  expensesList: document.querySelector('#expensesList'),
  historyList: document.querySelector('#historyList'),
  monthlyAverage: document.querySelector('#monthlyAverage'),
  currentMonthTotal: document.querySelector('#currentMonthTotal'),
  budgetMood: document.querySelector('#budgetMood'),
  addExpenseBtn: document.querySelector('#addExpenseBtn'),
  settingsBtn: document.querySelector('#settingsBtn'),
  expenseModal: document.querySelector('#expenseModal'),
  expenseForm: document.querySelector('#expenseForm'),
  expenseFormTitle: document.querySelector('#expenseFormTitle'),
  expenseId: document.querySelector('#expenseId'),
  expenseAmount: document.querySelector('#expenseAmount'),
  expenseDesc: document.querySelector('#expenseDesc'),
  expenseDate: document.querySelector('#expenseDate'),
  overBudgetWarning: document.querySelector('#overBudgetWarning'),
  settingsModal: document.querySelector('#settingsModal'),
  settingsForm: document.querySelector('#settingsForm'),
  settingsBudget: document.querySelector('#settingsBudget'),
  confirmPop: document.querySelector('#confirmPop'),
  cancelDelete: document.querySelector('#cancelDelete'),
  confirmDelete: document.querySelector('#confirmDelete')
};

let state = loadState();
let pendingDeleteId = null;

init();

function init() {
  rolloverIfNeeded();
  bindEvents();
  render();
}

function bindEvents() {
  els.addExpenseBtn.addEventListener('click', () => openExpenseModal());
  els.settingsBtn.addEventListener('click', () => openSettingsModal());

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.sheet-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) backdrop.hidden = true;
    });
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  els.expenseForm.addEventListener('submit', handleExpenseSubmit);
  els.settingsForm.addEventListener('submit', handleSettingsSubmit);
  els.expenseAmount.addEventListener('input', updateOverBudgetWarning);

  els.cancelDelete.addEventListener('click', () => {
    pendingDeleteId = null;
    els.confirmPop.hidden = true;
  });

  els.confirmDelete.addEventListener('click', () => {
    if (pendingDeleteId) {
      state.expenses = state.expenses.filter(expense => expense.id !== pendingDeleteId);
      saveState();
      render();
    }
    pendingDeleteId = null;
    els.confirmPop.hidden = true;
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    return {
      ...DEFAULT_STATE,
      ...saved,
      budget: Number(saved.budget) || 700,
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      history: Array.isArray(saved.history) ? saved.history : []
    };
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function rolloverIfNeeded() {
  const currentKey = getMonthKey(new Date());
  if (state.monthKey === currentKey) return;

  if (state.expenses.length) {
    const archive = buildArchive(state.monthKey, state.expenses, state.budget);
    const withoutDuplicate = state.history.filter(item => item.monthKey !== state.monthKey);
    state.history = [archive, ...withoutDuplicate];
  }

  state.monthKey = currentKey;
  state.expenses = [];
  saveState();
}

function buildArchive(monthKey, expenses, budget) {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    id: `archive-${monthKey}-${Date.now()}`,
    monthKey,
    monthLabel: formatMonthKey(monthKey),
    budget,
    total,
    expenses: [...expenses]
  };
}

function render() {
  const spent = getTotal(state.expenses);
  const remaining = state.budget - spent;
  const percent = state.budget ? Math.round((spent / state.budget) * 100) : 0;
  const cappedPercent = Math.min(percent, 100);

  els.remainingAmount.textContent = formatCurrency(remaining);
  els.spentAmount.textContent = formatCurrency(spent);
  els.budgetAmount.textContent = formatCurrency(state.budget);
  els.usedPercent.textContent = `${percent}% נוצל`;
  els.daysLeft.textContent = `${getDaysUntilNextMonth()} ימים`;
  els.monthLabel.textContent = formatMonthKey(state.monthKey);

  const circumference = 2 * Math.PI * 51;
  els.progressCircle.style.strokeDasharray = `${circumference}`;
  els.progressCircle.style.strokeDashoffset = `${circumference - (cappedPercent / 100) * circumference}`;

  els.budgetMessage.textContent = getBudgetMessage(spent, state.budget, remaining);
  document.body.classList.toggle('over-budget', spent > state.budget);

  renderExpenses();
  renderHistory();
  renderStats(spent);
  updateOverBudgetWarning();
}

function renderExpenses() {
  els.expensesList.innerHTML = '';
  const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);

  if (!sorted.length) {
    els.expensesList.innerHTML = `
      <div class="empty-state">
        <strong>עדיין לא הוצאת כלום.</strong>
        <span>חשוד מאוד, אבל נזרום.</span>
      </div>`;
    return;
  }

  sorted.slice(0, 8).forEach(expense => {
    const card = document.createElement('article');
    card.className = 'expense-card';
    card.innerHTML = `
      <div class="expense-main">
        <strong>${escapeHtml(expense.description)}</strong>
        <span>${formatDate(expense.date)}</span>
      </div>
      <div class="expense-side">
        <strong>${formatCurrency(expense.amount)}</strong>
        <div class="expense-actions">
          <button class="mini-btn" type="button" data-edit="${expense.id}">עריכה</button>
          <button class="mini-btn danger" type="button" data-delete="${expense.id}">מחיקה</button>
        </div>
      </div>`;
    els.expensesList.appendChild(card);
  });

  els.expensesList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openExpenseModal(btn.dataset.edit));
  });
  els.expensesList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => askDelete(btn.dataset.delete));
  });
}

function renderHistory() {
  els.historyList.innerHTML = '';
  const archives = [...state.history].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  if (!archives.length) {
    els.historyList.innerHTML = `
      <div class="empty-state light">
        <strong>אין היסטוריה עדיין.</strong>
        <span>ב־1 לחודש ההוצאות יעברו לכאן אוטומטית.</span>
      </div>`;
    return;
  }

  archives.forEach(archive => {
    const over = archive.total > archive.budget;
    const article = document.createElement('article');
    article.className = 'history-month';
    article.innerHTML = `
      <button class="history-summary" type="button" aria-expanded="false">
        <span>
          <strong>${archive.monthLabel}</strong>
          <small>${archive.expenses.length} הוצאות</small>
        </span>
        <span class="history-total ${over ? 'bad' : ''}">${formatCurrency(archive.total)}</span>
      </button>
      <div class="history-details" hidden>
        ${archive.expenses.map(expense => `
          <div class="history-row">
            <span>${escapeHtml(expense.description)}<small>${formatDate(expense.date)}</small></span>
            <strong>${formatCurrency(expense.amount)}</strong>
          </div>`).join('')}
      </div>`;
    const summary = article.querySelector('.history-summary');
    const details = article.querySelector('.history-details');
    summary.addEventListener('click', () => {
      const isOpen = !details.hidden;
      details.hidden = isOpen;
      summary.setAttribute('aria-expanded', String(!isOpen));
    });
    els.historyList.appendChild(article);
  });
}

function renderStats(spent) {
  const totals = state.history.map(month => Number(month.total || 0));
  const averageSource = totals.length ? totals : [spent];
  const average = averageSource.reduce((sum, total) => sum + total, 0) / averageSource.length;
  els.monthlyAverage.textContent = formatCurrency(average);
  els.currentMonthTotal.textContent = formatCurrency(spent);

  const percent = state.budget ? (spent / state.budget) * 100 : 0;
  if (percent >= 100) els.budgetMood.textContent = 'התקציב במצב דרמטי, כמו שצריך';
  else if (percent >= 80) els.budgetMood.textContent = 'לא לרוץ לסופר פארם בלי לחשוב';
  else if (percent >= 50) els.budgetMood.textContent = 'באמצע. עוד יש תקווה';
  else els.budgetMood.textContent = 'אמא יכולה להיות רגועה החודש';
}

function openExpenseModal(expenseId = null) {
  const expense = expenseId ? state.expenses.find(item => item.id === expenseId) : null;
  els.expenseForm.reset();
  els.expenseId.value = expense?.id || '';
  els.expenseFormTitle.textContent = expense ? 'עריכת הוצאה' : 'הוצאה חדשה';
  els.expenseAmount.value = expense?.amount || '';
  els.expenseDesc.value = expense?.description || '';
  els.expenseDate.value = expense?.date || toDateInputValue(new Date());
  els.expenseModal.hidden = false;
  setTimeout(() => els.expenseAmount.focus(), 50);
  updateOverBudgetWarning();
}

function openSettingsModal() {
  els.settingsBudget.value = state.budget;
  els.settingsModal.hidden = false;
}

function closeModal(id) {
  document.querySelector(`#${id}`).hidden = true;
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const amount = Number(els.expenseAmount.value);
  const description = els.expenseDesc.value.trim();
  const date = els.expenseDate.value;
  const id = els.expenseId.value;

  if (!amount || amount <= 0 || !description || !date) return;

  if (id) {
    state.expenses = state.expenses.map(expense => expense.id === id
      ? { ...expense, amount, description, date, updatedAt: Date.now() }
      : expense);
  } else {
    state.expenses.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      amount,
      description,
      date,
      createdAt: Date.now()
    });
  }

  saveState();
  els.expenseModal.hidden = true;
  render();
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const nextBudget = Number(els.settingsBudget.value);
  if (!nextBudget || nextBudget <= 0) return;
  state.budget = nextBudget;
  saveState();
  els.settingsModal.hidden = true;
  render();
}

function updateOverBudgetWarning() {
  const amount = Number(els.expenseAmount?.value || 0);
  const id = els.expenseId?.value;
  const currentTotal = getTotal(state.expenses);
  const original = id ? state.expenses.find(item => item.id === id) : null;
  const totalAfter = currentTotal - Number(original?.amount || 0) + amount;
  els.overBudgetWarning.hidden = !(amount > 0 && totalAfter > state.budget);
}

function askDelete(id) {
  pendingDeleteId = id;
  els.confirmPop.hidden = false;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelector(`#${tabName}Panel`).classList.add('active');
}

function getTotal(expenses) {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function getBudgetMessage(spent, budget, remaining) {
  const percent = budget ? (spent / budget) * 100 : 0;
  if (spent > budget) return 'זה כבר מעבר ל־700, גברת. אבל לפחות אנחנו מתועדות.';
  if (spent === budget) return 'בול 700. נא לא לנשום ליד האשראי.';
  if (percent >= 85) return `נשארו ${formatCurrency(remaining)}. לא זמן להיות גיבורה.`;
  if (percent >= 60) return 'מתקדמות יפה, אולי יפה מדי.';
  if (spent === 0) return 'אמא יכולה להיות רגועה החודש. בינתיים.';
  return 'אמא יכולה להיות רגועה החודש';
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(date);
}

function getDaysUntilNextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = next - new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil(diff / 86400000));
}

function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
}

function formatCurrency(value) {
  const rounded = Math.round(Number(value || 0));
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₪${Math.abs(rounded).toLocaleString('he-IL')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
