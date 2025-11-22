const API_BASE = "http://localhost:8000";

// ---------- Estado ----------
let receitasCache = [];
let despesasCache = [];
let cartoesCache = [];
let transacoesCartaoCache = [];

let receitaFilters = {};
let despesaFilters = {};
let transacaoCartaoFilters = {};

let receitaCategorias = [];
let receitaContas = [];
let receitaFormasPagamento = [];
let despesaCategorias = [];
let despesaContas = [];
let despesaFormasPagamento = [];

let dashYearsSelected = [];
let dashMonthsSelected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MONTH_OPTIONS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Fev" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Set" },
  { value: 10, label: "Out" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dez" },
];
const ALL_MONTH_VALUES = MONTH_OPTIONS.map(({ value }) => value);

let chartRD = null;
let chartGastoCartao = null;
let chartLimiteCartao = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupNavigation();
  setupFilters();
  setupSelectAllToggles();
  setupGlobalSelectionWatcher();
  setupDashboardFilterControls();
  setupButtonActions();
  setupForms();
  renderMonthFilterOptions();

  await Promise.all([loadParametrosReceita(), loadParametrosDespesa()]);
  await loadReceitas();
  await loadDespesas();
  await loadCartoes();
  await loadTransacoesCartao();
}

// ---------- Utils ----------
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch (_) {
      /* ignore */
    }
    throw new Error(`Erro na API: ${res.status} ${detail}`);
  }

  if (res.status === 204) {
    return null;
  }
  return await res.json();
}

function serializeForm(form) {
  const data = new FormData(form);
  const obj = {};
  for (const [key, value] of data.entries()) {
    if (value === "") continue;
    if (["amount_total", "installments", "installment_n"].includes(key)) {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function applyFilters(list, filters, mapper = null) {
  if (!filters) return list;
  return list.filter((item) => {
    const current = mapper ? mapper(item) : item;
    for (const [key, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined || rawValue === null || rawValue === "") continue;

      if (key.endsWith("_from")) {
        const field = key.slice(0, -5);
        const value = String(rawValue);
        const candidate = current[field];
        if (!candidate || String(candidate) < value) return false;
        continue;
      }

      if (key.endsWith("_to")) {
        const field = key.slice(0, -3);
        const value = String(rawValue);
        const candidate = current[field];
        if (!candidate || String(candidate) > value) return false;
        continue;
      }

      if (key.endsWith("_min")) {
        const field = key.slice(0, -4);
        const min = Number(rawValue);
        if (!Number.isNaN(min) && Number(current[field] || 0) < min) return false;
        continue;
      }

      if (key === "installment_n") {
        if (!String(current[key] || "").includes(rawValue)) return false;
        continue;
      }

      const target = String(current[key] || "").toLowerCase();
      if (!target.includes(String(rawValue).toLowerCase())) return false;
    }
    return true;
  });
}

function getSelectedIdsFromTable(tableId) {
  return Array.from(
    document.querySelectorAll(`#${tableId} tbody .row-select:checked`)
  ).map((cb) => Number(cb.dataset.id));
}

function highlightSelectedRows() {
  document.querySelectorAll(".data-table tbody tr").forEach((tr) => {
    const checkbox = tr.querySelector(".row-select");
    tr.classList.toggle("row-selected", Boolean(checkbox && checkbox.checked));
  });
}

function renderTablePlaceholder(tbody, message) {
  if (!tbody) return;
  const table = tbody.closest("table");
  const colSpan = table ? table.querySelectorAll("thead th").length || 1 : 1;
  tbody.innerHTML = `<tr><td class="table-placeholder" colspan="${colSpan}">${message}</td></tr>`;
}

function getFiltersStore(tableKey) {
  switch (tableKey) {
    case "receitas":
      return receitaFilters;
    case "despesas":
      return despesaFilters;
    case "transacoes-cartao":
      return transacaoCartaoFilters;
    default:
      return null;
  }
}

function rerenderTable(tableKey) {
  if (tableKey === "receitas") {
    renderReceitasTable();
  } else if (tableKey === "despesas") {
    renderDespesasTable();
  } else if (tableKey === "transacoes-cartao") {
    renderTransacoesCartaoTable();
  }
}

function updateFilterInputVisual(input) {
  if (!input) return;
  input.classList.toggle("filter-active", Boolean(input.value));
}

function clearFilters(tableKey) {
  const store = getFiltersStore(tableKey);
  if (!store) return;
  Object.keys(store).forEach((key) => delete store[key]);
  document
    .querySelectorAll(`.filter-input[data-table="${tableKey}"]`)
    .forEach((input) => {
      input.value = "";
      updateFilterInputVisual(input);
    });
  rerenderTable(tableKey);
}

function requireSingleSelection(ids, entity) {
  if (ids.length !== 1) {
    if (!ids.length) {
      alert(`Selecione um(a) ${entity}.`);
    } else {
      alert(`Selecione apenas 1 ${entity} para editar.`);
    }
    return false;
  }
  return true;
}

function setupBulkDeleteButton({
  buttonId,
  tableId,
  entityLabel,
  apiPathBuilder,
  reloadFns,
  successMessage,
}) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener("click", async () => {
    const ids = getSelectedIdsFromTable(tableId);
    if (!ids.length) return;
    const confirmMessage = `Tem certeza que deseja excluir ${ids.length} ${entityLabel}(s)?`;
    if (!confirm(confirmMessage)) return;
    try {
      await Promise.all(
        ids.map((id) =>
          fetchJSON(apiPathBuilder(id), {
            method: "DELETE",
          })
        )
      );
      for (const fn of reloadFns) {
        await fn();
      }
      alert(successMessage.replace("{n}", ids.length));
    } catch (err) {
      console.error(err);
      alert(`Erro ao excluir ${entityLabel}(s).`);
    }
  });
}

// ---------- Dashboard ----------
function filterByYearAndMonths(list, years, months) {
  const useYears = years.length > 0;
  const useMonths = months.length > 0;
  return list.filter((item) => {
    if (!item.due_date) return false;
    if (!useYears) return false;
    if (!useMonths) return false;
    const year = parseInt(item.due_date.slice(0, 4), 10);
    const month = parseInt(item.due_date.slice(5, 7), 10);
    if (useYears && !years.includes(year)) return false;
    if (useMonths && !months.includes(month)) return false;
    return true;
  });
}

function buildYearFilterOptions() {
  const container = document.getElementById("filter-year-group");
  if (!container) return;

  const yearsSet = new Set();
  [...receitasCache, ...despesasCache].forEach((item) => {
    if (item.due_date) yearsSet.add(item.due_date.slice(0, 4));
  });

  if (!yearsSet.size) {
    yearsSet.add(String(new Date().getFullYear()));
  }

  const years = Array.from(yearsSet).map(Number).sort((a, b) => a - b);
  dashYearsSelected = dashYearsSelected.filter((year) => years.includes(year));

  if (!dashYearsSelected.length && years.length) {
    const currentYear = new Date().getFullYear();
    dashYearsSelected = years.includes(currentYear) ? [currentYear] : [years.at(-1)];
  }

  container.innerHTML = "";
  years.forEach((year) => {
    const label = document.createElement("label");
    label.className = "filter-pill";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "filter-checkbox-year";
    input.value = String(year);
    input.checked = dashYearsSelected.includes(year);

    const span = document.createElement("span");
    span.textContent = year;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function renderMonthFilterOptions() {
  const container = document.getElementById("filter-months-group");
  if (!container) return;
  container.innerHTML = "";

  MONTH_OPTIONS.forEach(({ value, label }) => {
    const pill = document.createElement("label");
    pill.className = "filter-pill";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "filter-checkbox-month";
    input.value = String(value);
    input.checked = dashMonthsSelected.includes(value);

    const span = document.createElement("span");
    span.textContent = label;

    pill.appendChild(input);
    pill.appendChild(span);
    container.appendChild(pill);
  });
}

function getYearChartData(years) {
  const labelsBase = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const receitas = new Array(12).fill(0);
  const despesas = new Array(12).fill(0);
  const restrict = years.length > 0;

  receitasCache.forEach((r) => {
    if (!r.due_date) return;
    const year = parseInt(r.due_date.slice(0, 4), 10);
    if (restrict && !years.includes(year)) return;
    const idx = parseInt(r.due_date.slice(5, 7), 10) - 1;
    if (idx >= 0) receitas[idx] += Number(r.amount_total || 0);
  });

  despesasCache.forEach((d) => {
    if (!d.due_date) return;
    const year = parseInt(d.due_date.slice(0, 4), 10);
    if (restrict && !years.includes(year)) return;
    const idx = parseInt(d.due_date.slice(5, 7), 10) - 1;
    if (idx >= 0) despesas[idx] += Number(d.amount_total || 0);
  });

  const months =
    dashMonthsSelected.length > 0
      ? [...dashMonthsSelected].sort((a, b) => a - b)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const labels = months.map((m) => labelsBase[m - 1]);
  return {
    labels,
    receitas: months.map((m) => receitas[m - 1]),
    despesas: months.map((m) => despesas[m - 1]),
  };
}

function updateDashboardChart() {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("chart-receitas-despesas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { labels, receitas, despesas } = getYearChartData(dashYearsSelected);

  if (chartRD) chartRD.destroy();
  chartRD = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Receitas", backgroundColor: "#10b981", data: receitas },
        { label: "Despesas", backgroundColor: "#ef4444", data: despesas },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function updateDashboard() {
  const receitasPeriodo = filterByYearAndMonths(
    receitasCache,
    dashYearsSelected,
    dashMonthsSelected
  );
  const despesasPeriodo = filterByYearAndMonths(
    despesasCache,
    dashYearsSelected,
    dashMonthsSelected
  );

  const totalReceitasPeriodo = receitasPeriodo.reduce(
    (sum, r) => sum + Number(r.amount_total || 0),
    0
  );
  const totalDespesasPeriodo = despesasPeriodo.reduce(
    (sum, d) => sum + Number(d.amount_total || 0),
    0
  );

  const receitasAno = filterByYearAndMonths(
    receitasCache,
    dashYearsSelected,
    ALL_MONTH_VALUES
  );
  const despesasAno = filterByYearAndMonths(
    despesasCache,
    dashYearsSelected,
    ALL_MONTH_VALUES
  );

  const totalReceitasAno = receitasAno.reduce(
    (sum, r) => sum + Number(r.amount_total || 0),
    0
  );
  const totalDespesasAno = despesasAno.reduce(
    (sum, d) => sum + Number(d.amount_total || 0),
    0
  );

  const receitasPagas = receitasCache
    .filter((r) => r.payment_date)
    .reduce((sum, r) => sum + Number(r.amount_total || 0), 0);
  const despesasPagas = despesasCache
    .filter((d) => d.payment_date)
    .reduce((sum, d) => sum + Number(d.amount_total || 0), 0);

  const caixa = receitasPagas - despesasPagas;
  const caixaMensal = totalReceitasPeriodo - totalDespesasPeriodo;
  const fechamentoAnual = totalReceitasAno - totalDespesasAno;

  const elCaixa = document.getElementById("dash-total-receitas");
  const elCaixaMensal = document.getElementById("dash-total-despesas");
  const elFechAnual = document.getElementById("dash-saldo");

  if (elCaixa) elCaixa.textContent = formatCurrency(caixa);
  if (elCaixaMensal) elCaixaMensal.textContent = formatCurrency(caixaMensal);
  if (elFechAnual) elFechAnual.textContent = formatCurrency(fechamentoAnual);

  updateDashboardChart();
}

// ---------- Parâmetros ----------
async function loadParametrosReceita() {
  try {
    const [cats, contas, formas] = await Promise.all([
      fetchJSON(`${API_BASE}/api/receita/categorias`),
      fetchJSON(`${API_BASE}/api/receita/contas`),
      fetchJSON(`${API_BASE}/api/receita/formas-pagamento`),
    ]);
    receitaCategorias = cats;
    receitaContas = contas;
    receitaFormasPagamento = formas;
    updateReceitaParamViews();
  } catch (err) {
    console.error("Erro ao carregar parâmetros de receita", err);
    alert("Não foi possível carregar os parâmetros de receita.");
  }
}

function updateReceitaParamViews() {
  const ulCat = document.getElementById("lista-cat-receita");
  const ulConta = document.getElementById("lista-conta-receita");
  const ulFP = document.getElementById("lista-fp-receita");

  if (ulCat) ulCat.innerHTML = receitaCategorias.map((c) => `<li>${c.name}</li>`).join("");
  if (ulConta) ulConta.innerHTML = receitaContas.map((c) => `<li>${c.name}</li>`).join("");
  if (ulFP) ulFP.innerHTML = receitaFormasPagamento.map((c) => `<li>${c.name}</li>`).join("");

  const dlCat = document.getElementById("dl-categorias-receita");
  const dlConta = document.getElementById("dl-contas-receita");
  const dlFP = document.getElementById("dl-fp-receita");

  if (dlCat) dlCat.innerHTML = receitaCategorias.map((c) => `<option value="${c.name}"></option>`).join("");
  if (dlConta) dlConta.innerHTML = receitaContas.map((c) => `<option value="${c.name}"></option>`).join("");
  if (dlFP) dlFP.innerHTML = receitaFormasPagamento.map((c) => `<option value="${c.name}"></option>`).join("");
}

async function loadParametrosDespesa() {
  try {
    const [cats, contas, formas] = await Promise.all([
      fetchJSON(`${API_BASE}/api/despesa/categorias`),
      fetchJSON(`${API_BASE}/api/despesa/contas`),
      fetchJSON(`${API_BASE}/api/despesa/formas-pagamento`),
    ]);
    despesaCategorias = cats;
    despesaContas = contas;
    despesaFormasPagamento = formas;
    updateDespesaParamViews();
  } catch (err) {
    console.error("Erro ao carregar parâmetros de despesa", err);
     alert("Não foi possível carregar os parâmetros de despesa.");
  }
}

function updateDespesaParamViews() {
  const ulCat = document.getElementById("lista-cat-despesa");
  const ulConta = document.getElementById("lista-conta-despesa");
  const ulFP = document.getElementById("lista-fp-despesa");

  if (ulCat) ulCat.innerHTML = despesaCategorias.map((c) => `<li>${c.name}</li>`).join("");
  if (ulConta) ulConta.innerHTML = despesaContas.map((c) => `<li>${c.name}</li>`).join("");
  if (ulFP) ulFP.innerHTML = despesaFormasPagamento.map((c) => `<li>${c.name}</li>`).join("");

  const dlCat = document.getElementById("dl-categorias-despesa");
  const dlConta = document.getElementById("dl-contas-despesa");
  const dlFP = document.getElementById("dl-fp-despesa");

  if (dlCat) dlCat.innerHTML = despesaCategorias.map((c) => `<option value="${c.name}"></option>`).join("");
  if (dlConta) dlConta.innerHTML = despesaContas.map((c) => `<option value="${c.name}"></option>`).join("");
  if (dlFP) dlFP.innerHTML = despesaFormasPagamento.map((c) => `<option value="${c.name}"></option>`).join("");
}

// ---------- Receitas / Despesas ----------
async function loadReceitas() {
  const tbody = document.querySelector("#table-receitas tbody");
  renderTablePlaceholder(tbody, "Carregando receitas...");
  try {
    receitasCache = await fetchJSON(`${API_BASE}/api/receitas`);
    renderReceitasTable();
  } catch (err) {
    console.error(err);
    renderTablePlaceholder(tbody, "Erro ao carregar receitas.");
    alert("Não foi possível carregar as receitas. Verifique sua conexão.");
  } finally {
    buildYearFilterOptions();
    updateDashboard();
    updateActionButtons();
  }
}

function renderReceitasTable() {
  const tbody = document.querySelector("#table-receitas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(receitasCache, receitaFilters);
  if (!list.length) {
    renderTablePlaceholder(tbody, "Nenhuma receita encontrada.");
    return;
  }

  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-select row-select-receita" data-id="${item.id}" /></td>
      <td>${item.due_date || ""}</td>
      <td>${item.description || ""}</td>
      <td>${item.category || ""}</td>
      <td>${formatCurrency(item.amount_total)}</td>
      <td>
        <input type="date" class="input-pagamento-receita" data-id="${item.id}" value="${item.payment_date || ""}" />
      </td>
    `;
    tbody.appendChild(tr);
  });
  highlightSelectedRows();
}

async function loadDespesas() {
  const tbody = document.querySelector("#table-despesas tbody");
  renderTablePlaceholder(tbody, "Carregando despesas...");
  try {
    despesasCache = await fetchJSON(`${API_BASE}/api/despesas`);
    renderDespesasTable();
  } catch (err) {
    console.error(err);
    renderTablePlaceholder(tbody, "Erro ao carregar despesas.");
    alert("Não foi possível carregar as despesas. Verifique sua conexão.");
  } finally {
    buildYearFilterOptions();
    updateDashboard();
    updateActionButtons();
  }
}

function renderDespesasTable() {
  const tbody = document.querySelector("#table-despesas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(despesasCache, despesaFilters);
  if (!list.length) {
    renderTablePlaceholder(tbody, "Nenhuma despesa encontrada.");
    return;
  }

  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-select row-select-despesa" data-id="${item.id}" /></td>
      <td>${item.due_date || ""}</td>
      <td>${item.description || ""}</td>
      <td>${item.category || ""}</td>
      <td>${formatCurrency(item.amount_total)}</td>
      <td>
        <input type="date" class="input-pagamento-despesa" data-id="${item.id}" value="${item.payment_date || ""}" />
      </td>
    `;
    tbody.appendChild(tr);
  });
  highlightSelectedRows();
}

// ---------- Cartões ----------
async function loadCartoes() {
  const tbody = document.querySelector("#table-cartoes tbody");
  renderTablePlaceholder(tbody, "Carregando cartões...");
  try {
    cartoesCache = await fetchJSON(`${API_BASE}/api/cartoes`);
    renderCartoesTable();
    populateCartaoSelect();
    updateCardCharts();
  } catch (err) {
    console.error(err);
    renderTablePlaceholder(tbody, "Erro ao carregar cartões.");
    alert("Não foi possível carregar os cartões. Verifique sua conexão.");
  } finally {
    updateActionButtons();
  }
}

function renderCartoesTable() {
  const tbody = document.querySelector("#table-cartoes tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!cartoesCache.length) {
    renderTablePlaceholder(tbody, "Nenhum cartão cadastrado.");
    return;
  }

  cartoesCache.forEach((card) => {
    const initials = (card.name || card.cartao || "")
      .toString()
      .trim()
      .slice(0, 2)
      .toUpperCase() || "--";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-select row-select-cartao" data-id="${card.id}" /></td>
      <td>
        <div class="card-logo-wrap">
          <div class="card-logo-badge">${initials}</div>
          <span>${card.name || card.cartao}</span>
        </div>
      </td>
      <td>${card.closing_day ?? ""}</td>
      <td>${card.due_day ?? ""}</td>
      <td>${card.limit_total != null ? formatCurrency(card.limit_total) : "-"}</td>
      <td>${card.status ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
  highlightSelectedRows();
}

function populateCartaoSelect() {
  const select = document.getElementById("select-cartao-transacao");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Selecione um cartão</option>`;
  cartoesCache.forEach((card) => {
    const opt = document.createElement("option");
    opt.value = card.id;
    opt.textContent = card.name || card.cartao;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

async function loadTransacoesCartao() {
  const tbody = document.querySelector("#table-transacoes-cartao tbody");
  renderTablePlaceholder(tbody, "Carregando lançamentos...");
  try {
    transacoesCartaoCache = await fetchJSON(`${API_BASE}/api/transacoes-cartao`);
    renderTransacoesCartaoTable();
  } catch (err) {
    console.error(err);
    renderTablePlaceholder(tbody, "Erro ao carregar lançamentos.");
    alert("Não foi possível carregar os lançamentos de cartão. Verifique sua conexão.");
  } finally {
    updateCardCharts();
    updateActionButtons();
  }
}

function renderTransacoesCartaoTable() {
  const tbody = document.querySelector("#table-transacoes-cartao tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(transacoesCartaoCache, transacaoCartaoFilters, (item) => {
    const cartao = cartoesCache.find((c) => c.id === item.credit_card_id);
    return { ...item, cartao: cartao ? cartao.name : "" };
  });

  if (!list.length) {
    renderTablePlaceholder(tbody, "Nenhum lançamento de cartão.");
    return;
  }

  list.forEach((item) => {
    const cartao = cartoesCache.find((c) => c.id === item.credit_card_id);
    const nome = cartao ? cartao.name : `#${item.credit_card_id}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-select row-select-transacao-cartao" data-id="${item.id}" /></td>
      <td>${item.purchase_date || ""}</td>
      <td>${nome}</td>
      <td>${item.description || ""}</td>
      <td>${item.installment_n} de ${item.installments}</td>
      <td>${formatCurrency(item.amount_installment)}</td>
    `;
    tbody.appendChild(tr);
  });
  highlightSelectedRows();
}

function updateCardCharts() {
  if (typeof Chart === "undefined") return;
  const gastoCanvas = document.getElementById("chart-gasto-cartao");
  const limiteCanvas = document.getElementById("chart-limite-cartao");
  if (!gastoCanvas || !limiteCanvas) return;

  const gastos = new Map();
  cartoesCache.forEach((card) => gastos.set(card.id, 0));

  transacoesCartaoCache.forEach((trx) => {
    if (!gastos.has(trx.credit_card_id)) return;
    const valor =
      Number(trx.amount_installment ?? trx.amount_total ?? trx.amount ?? 0);
    gastos.set(trx.credit_card_id, gastos.get(trx.credit_card_id) + valor);
  });

  const labels = cartoesCache.map((card) => card.name || card.cartao);
  const gastoData = cartoesCache.map((card) => gastos.get(card.id) || 0);
  const limiteData = cartoesCache.map((card) => Number(card.limit_total || 0));
  const disponivelData = limiteData.map((lim, idx) =>
    Math.max(lim - gastoData[idx], 0)
  );

  if (chartGastoCartao) chartGastoCartao.destroy();
  if (chartLimiteCartao) chartLimiteCartao.destroy();

  chartGastoCartao = new Chart(gastoCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Gasto", data: gastoData, backgroundColor: "#6366f1" }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  chartLimiteCartao = new Chart(limiteCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Limite disponível", data: disponivelData, backgroundColor: "#0ea5e9" }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}

// ---------- Interações ----------
function setupNavigation() {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".page").forEach((section) => {
        section.classList.toggle("visible", section.id === `page-${target}`);
      });
    });
  });
}

function setupFilters() {
  const handleFilterChange = (event) => {
    const target = event.target;
    if (!target.classList.contains("filter-input")) return;
    const table = target.dataset.table;
    const store = getFiltersStore(table);
    if (!store) return;

    const field = target.dataset.field;
    const filterType = target.dataset.filterType || "text";
    let key = field;
    if (filterType === "date-from") key = `${field}_from`;
    if (filterType === "date-to") key = `${field}_to`;
    if (filterType === "number-min") key = `${field}_min`;

    if (target.value) {
      store[key] = target.value;
    } else {
      delete store[key];
    }
    updateFilterInputVisual(target);
    rerenderTable(table);
  };

  document.addEventListener("input", handleFilterChange);
  document.addEventListener("change", handleFilterChange);

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-clear-filters");
    if (!button) return;
    clearFilters(button.dataset.table);
  });
}

function setupSelectAllToggles() {
  const configs = [
    { id: "chk-all-receitas", selector: "#table-receitas tbody .row-select-receita" },
    { id: "chk-all-despesas", selector: "#table-despesas tbody .row-select-despesa" },
    { id: "chk-all-cartoes", selector: "#table-cartoes tbody .row-select-cartao" },
    {
      id: "chk-all-transacoes-cartao",
      selector: "#table-transacoes-cartao tbody .row-select-transacao-cartao",
    },
  ];

  configs.forEach(({ id, selector }) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;
    checkbox.addEventListener("change", () => {
      document.querySelectorAll(selector).forEach((cb) => {
        cb.checked = checkbox.checked;
      });
      updateActionButtons();
    });
  });
}

function setupDashboardFilterControls() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.classList.contains("filter-checkbox-year")) {
      const value = parseInt(target.value, 10);
      if (target.checked) {
        if (!dashYearsSelected.includes(value)) dashYearsSelected.push(value);
      } else {
        dashYearsSelected = dashYearsSelected.filter((year) => year !== value);
      }
      dashYearsSelected.sort((a, b) => a - b);
      updateDashboard();
    }

    if (target.classList.contains("filter-checkbox-month")) {
      const value = parseInt(target.value, 10);
      if (target.checked) {
        if (!dashMonthsSelected.includes(value)) dashMonthsSelected.push(value);
      } else {
        dashMonthsSelected = dashMonthsSelected.filter((month) => month !== value);
      }
      dashMonthsSelected.sort((a, b) => a - b);
      updateDashboard();
    }
  });
}

function setupGlobalSelectionWatcher() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.classList.contains("row-select")) {
      updateActionButtons();
       highlightSelectedRows();
    }

    if (target.classList.contains("input-pagamento-receita")) {
      const id = Number(target.dataset.id);
      const payment_date = target.value || null;
      fetchJSON(`${API_BASE}/api/receitas/${id}/pagamento`, {
        method: "PATCH",
        body: JSON.stringify({ payment_date }),
      })
        .then(loadReceitas)
        .catch(() => alert("Erro ao atualizar pagamento da receita."));
    }

    if (target.classList.contains("input-pagamento-despesa")) {
      const id = Number(target.dataset.id);
      const payment_date = target.value || null;
      fetchJSON(`${API_BASE}/api/despesas/${id}/pagamento`, {
        method: "PATCH",
        body: JSON.stringify({ payment_date }),
      })
        .then(loadDespesas)
        .catch(() => alert("Erro ao atualizar pagamento da despesa."));
    }
  });
}

function setupButtonActions() {
  setupBulkDeleteButton({
    buttonId: "btn-delete-receita",
    tableId: "table-receitas",
    entityLabel: "receita",
    apiPathBuilder: (id) => `${API_BASE}/api/receitas/${id}`,
    reloadFns: [loadReceitas],
    successMessage: "{n} receita(s) excluída(s) com sucesso!",
  });

  setupBulkDeleteButton({
    buttonId: "btn-delete-despesa",
    tableId: "table-despesas",
    entityLabel: "despesa",
    apiPathBuilder: (id) => `${API_BASE}/api/despesas/${id}`,
    reloadFns: [loadDespesas],
    successMessage: "{n} despesa(s) excluída(s) com sucesso!",
  });

  setupBulkDeleteButton({
    buttonId: "btn-delete-transacao-cartao",
    tableId: "table-transacoes-cartao",
    entityLabel: "lançamento",
    apiPathBuilder: (id) => `${API_BASE}/api/transacoes-cartao/${id}`,
    reloadFns: [loadTransacoesCartao, loadDespesas],
    successMessage: "{n} lançamento(s) excluído(s) com sucesso!",
  });

  setupBulkDeleteButton({
    buttonId: "btn-delete-cartao",
    tableId: "table-cartoes",
    entityLabel: "cartão",
    apiPathBuilder: (id) => `${API_BASE}/api/cartoes/${id}`,
    reloadFns: [loadCartoes, loadTransacoesCartao],
    successMessage: "{n} cartão(ões) excluído(s) com sucesso!",
  });

  const btnEditReceita = document.getElementById("btn-edit-receita");
  if (btnEditReceita) {
    btnEditReceita.addEventListener("click", () => {
      const ids = getSelectedIdsFromTable("table-receitas");
      if (!requireSingleSelection(ids, "receita")) return;
      const item = receitasCache.find((r) => r.id === ids[0]);
      const form = document.getElementById("form-receita");
      if (!item || !form) return;
      ["description", "category", "account", "payment_method", "notes"].forEach((field) => {
        form[field].value = item[field] || "";
      });
      form.due_date.value = item.due_date || "";
      form.payment_date.value = item.payment_date || "";
      form.amount_total.value = item.amount_total || "";
      form.installments.value = item.installments || 1;
      form.dataset.editingId = String(item.id);
      alert("Atualize os campos e clique em Salvar receita.");
    });
  }

  const btnEditDespesa = document.getElementById("btn-edit-despesa");
  if (btnEditDespesa) {
    btnEditDespesa.addEventListener("click", () => {
      const ids = getSelectedIdsFromTable("table-despesas");
      if (!requireSingleSelection(ids, "despesa")) return;
      const item = despesasCache.find((d) => d.id === ids[0]);
      const form = document.getElementById("form-despesa");
      if (!item || !form) return;
      ["description", "category", "account", "payment_method", "notes"].forEach((field) => {
        form[field].value = item[field] || "";
      });
      form.due_date.value = item.due_date || "";
      form.payment_date.value = item.payment_date || "";
      form.amount_total.value = item.amount_total || "";
      form.installments.value = item.installments || 1;
      form.dataset.editingId = String(item.id);
      alert("Atualize os campos e clique em Salvar despesa.");
    });
  }

  const btnEditCartao = document.getElementById("btn-edit-cartao");
  if (btnEditCartao) {
    btnEditCartao.addEventListener("click", () => {
      const ids = getSelectedIdsFromTable("table-cartoes");
      if (!requireSingleSelection(ids, "cartão")) return;
      const card = cartoesCache.find((c) => c.id === ids[0]);
      const form = document.getElementById("form-cartao");
      if (!card || !form) return;
      form.dataset.editId = String(card.id);
      form.name.value = card.name || card.cartao || "";
      form.closing_day.value = card.closing_day ?? "";
      form.due_day.value = card.due_day ?? "";
      form.limit_total.value = card.limit_total ?? "";
      form.annual_fee.value = card.annual_fee ?? "";
      form.status.value = card.status || "ativo";
      form.scrollIntoView({ behavior: "smooth" });
    });
  }
}

function setupForms() {
  const formReceita = document.getElementById("form-receita");
  if (formReceita) {
    formReceita.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = serializeForm(formReceita);
      const editingId = formReceita.dataset.editingId;
      try {
        if (editingId) {
          await fetchJSON(`${API_BASE}/api/receitas/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await fetchJSON(`${API_BASE}/api/receitas`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        formReceita.reset();
        delete formReceita.dataset.editingId;
        await loadReceitas();
      } catch (err) {
        alert("Erro ao salvar receita.");
      }
    });
  }

  const formDespesa = document.getElementById("form-despesa");
  if (formDespesa) {
    formDespesa.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = serializeForm(formDespesa);
      const editingId = formDespesa.dataset.editingId;
      try {
        if (editingId) {
          await fetchJSON(`${API_BASE}/api/despesas/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await fetchJSON(`${API_BASE}/api/despesas`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        formDespesa.reset();
        delete formDespesa.dataset.editingId;
        await loadDespesas();
      } catch (err) {
        alert("Erro ao salvar despesa.");
      }
    });
  }

  const formCartao = document.getElementById("form-cartao");
  if (formCartao) {
    formCartao.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {};
      const formData = new FormData(formCartao);
      for (const [key, value] of formData.entries()) {
        if (value === "") continue;
        if (["closing_day", "due_day"].includes(key)) {
          payload[key] = Number(value);
        } else if (["limit_total", "annual_fee"].includes(key)) {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      }
      const editId = formCartao.dataset.editId;
      try {
        if (editId) {
          await fetchJSON(`${API_BASE}/api/cartoes/${editId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await fetchJSON(`${API_BASE}/api/cartoes`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
        formCartao.reset();
        delete formCartao.dataset.editId;
        await loadCartoes();
      } catch (err) {
        alert("Erro ao salvar cartão.");
      }
    });
  }

  const formTransacao = document.getElementById("form-transacao-cartao");
  if (formTransacao) {
    formTransacao.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = serializeForm(formTransacao);
      const total = payload.amount_total || 0;
      const parcelas = payload.installments || 1;
      payload.amount_installment = total / parcelas;
      payload.due_date = payload.due_date || payload.purchase_date;
      try {
        await fetchJSON(`${API_BASE}/api/transacoes-cartao`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formTransacao.reset();
        await loadTransacoesCartao();
        await loadDespesas();
      } catch (err) {
        alert("Erro ao salvar transação de cartão.");
      }
    });
  }

  const simpleParamForms = [
    { id: "form-cat-receita", url: "/api/receita/categorias", reload: loadParametrosReceita },
    { id: "form-conta-receita", url: "/api/receita/contas", reload: loadParametrosReceita },
    { id: "form-fp-receita", url: "/api/receita/formas-pagamento", reload: loadParametrosReceita },
    { id: "form-cat-despesa", url: "/api/despesa/categorias", reload: loadParametrosDespesa },
    { id: "form-conta-despesa", url: "/api/despesa/contas", reload: loadParametrosDespesa },
    { id: "form-fp-despesa", url: "/api/despesa/formas-pagamento", reload: loadParametrosDespesa },
  ];

  simpleParamForms.forEach(({ id, url, reload }) => {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = serializeForm(form);
      try {
        await fetchJSON(`${API_BASE}${url}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        form.reset();
        await reload();
      } catch (err) {
        alert("Erro ao salvar parâmetro.");
      }
    });
  });
}

function updateActionButtons() {
  const btnEditReceita = document.getElementById("btn-edit-receita");
  const btnDelReceita = document.getElementById("btn-delete-receita");
  const btnEditDespesa = document.getElementById("btn-edit-despesa");
  const btnDelDespesa = document.getElementById("btn-delete-despesa");
  const btnDelTrans = document.getElementById("btn-delete-transacao-cartao");
  const btnEditCartao = document.getElementById("btn-edit-cartao");
  const btnDelCartao = document.getElementById("btn-delete-cartao");

  const selReceitas = getSelectedIdsFromTable("table-receitas");
  const selDespesas = getSelectedIdsFromTable("table-despesas");
  const selCartoes = getSelectedIdsFromTable("table-cartoes");
  const selTrans = getSelectedIdsFromTable("table-transacoes-cartao");

  if (btnEditReceita) btnEditReceita.disabled = selReceitas.length !== 1;
  if (btnDelReceita) btnDelReceita.disabled = selReceitas.length === 0;
  if (btnEditDespesa) btnEditDespesa.disabled = selDespesas.length !== 1;
  if (btnDelDespesa) btnDelDespesa.disabled = selDespesas.length === 0;
  if (btnEditCartao) btnEditCartao.disabled = selCartoes.length !== 1;
  if (btnDelCartao) btnDelCartao.disabled = selCartoes.length === 0;
  if (btnDelTrans) btnDelTrans.disabled = selTrans.length === 0;
  highlightSelectedRows();
}

