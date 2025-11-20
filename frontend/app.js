const API_BASE = "http://localhost:8000";

// Estado em memória
let receitasCache = [];
let despesasCache = [];
let cartoesCache = [];
let transacoesCartaoCache = [];
// filtros de tabela (client-side)
let receitaFilters = {};
let despesaFilters = {};
let transacaoCartaoFilters = {};

// parâmetros de receita
let receitaCategorias = [];
let receitaContas = [];
let receitaFormasPagamento = [];

// parâmetros de despesa
let despesaCategorias = [];
let despesaContas = [];
let despesaFormasPagamento = [];

// logos de cartões (ajuste caminhos conforme arquivos que você tiver)
const CARD_LOGOS = {
  "nubank": "assets/cards/nubank.png",
  "nu": "assets/cards/nubank.png",
  "santander": "assets/cards/santander.png",
  "itaú": "assets/cards/itau.png",
  "itau": "assets/cards/itau.png",
  "inter": "assets/cards/inter.png",
  "bradesco": "assets/cards/bradesco.png",
  "c6": "assets/cards/c6.png",
  "c6 bank": "assets/cards/c6.png",
  "xp": "assets/cards/xp.png",
  "pan": "assets/cards/pan.png",
  "caixa": "assets/cards/caixa.png",
  "bb": "assets/cards/bb.png",
  "banco do brasil": "assets/cards/bb.png",
};

let chartRD = null;
let dashYearsSelected = [];   // [] => todos os anos
let dashMonthsSelected = [];  // [] => todos os meses

// --------- UTILITÁRIOS ---------

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
      console.error("Erro API:", res.status, detail);
    } catch (_) {}
    throw new Error(`Erro na API: ${res.status} ${detail}`);
  }
  return await res.json();
}

function serializeForm(form) {
  const data = new FormData(form);
  const obj = {};
  for (const [key, value] of data.entries()) {
    if (value === "") continue;
    if (["amount_total", "installments"].includes(key)) {
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

function applyFilters(list, filters, extraMapper = null) {
  if (!filters) return list;

  return list.filter((item) => {
    const obj = extraMapper ? extraMapper(item) : item;

    for (const [field, value] of Object.entries(filters)) {
      if (!value) continue;
      const v = String(value).toLowerCase();

      if (field === "amount_total" || field === "amount_installment") {
        const num = Number(obj[field] || 0);
        const min = Number(value);
        if (!isNaN(min) && num < min) return false;
      } else if (field === "installment_n") {
        if (!String(obj[field] || "").includes(value)) return false;
      } else {
        const current = String(obj[field] || "").toLowerCase();
        if (!current.includes(v)) return false;
      }
    }
    return true;
  });
}

function getSelectedIdsFromTable(tableId) {
  const checkboxes = document.querySelectorAll(
    `#${tableId} tbody .row-select:checked`
  );
  return Array.from(checkboxes).map((cb) => Number(cb.dataset.id));
}


// --------- FILTRO / DASHBOARD ---------

// filtra lista por anos + meses selecionados
function filterByYearAndMonths(list, yearsArr, monthsArr) {
  const useYears = yearsArr && yearsArr.length > 0;
  const useMonths = monthsArr && monthsArr.length > 0;

  return list.filter((item) => {
    if (!item.due_date) return false;

    const year = parseInt(item.due_date.slice(0, 4), 10);
    const month = parseInt(item.due_date.slice(5, 7), 10);

    if (useYears && !yearsArr.includes(year)) return false;
    if (useMonths && !monthsArr.includes(month)) return false;

    return true;
  });
}

// monta opções de ano com base nos dados
function buildYearFilterOptions() {
  const select = document.getElementById("filter-year");
  if (!select) return;

  const yearsSet = new Set();
  const all = [...receitasCache, ...despesasCache];

  all.forEach((item) => {
    if (item.due_date) {
      yearsSet.add(item.due_date.slice(0, 4)); // "YYYY"
    }
  });

  // fallback: se não tiver nada no banco, usa o ano atual
  if (!yearsSet.size) {
    yearsSet.add(String(new Date().getFullYear()));
  }

  const years = Array.from(yearsSet)
    .map(Number)
    .sort((a, b) => a - b);

  const currentYear = new Date().getFullYear();
  let defaultYears;

  if (dashYearsSelected && dashYearsSelected.length) {
    defaultYears = [...dashYearsSelected];
  } else if (years.includes(currentYear)) {
    defaultYears = [currentYear];
  } else {
    // se o ano atual não estiver nos dados, pega o último ano disponível
    defaultYears = [years[years.length - 1]];
  }

  select.innerHTML = "";
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y;
    if (defaultYears.includes(y)) opt.selected = true;
    select.appendChild(opt);
  });

  dashYearsSelected = defaultYears;
}

// dados para o gráfico (agrega meses nos anos selecionados)
function getYearData(yearsArr) {
  const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const allReceitas = new Array(12).fill(0);
  const allDespesas = new Array(12).fill(0);

  const useYears = yearsArr && yearsArr.length > 0;

  receitasCache.forEach((r) => {
    if (!r.due_date) return;
    const year = parseInt(r.due_date.slice(0, 4), 10);
    const m = parseInt(r.due_date.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) return;
    if (useYears && !yearsArr.includes(year)) return;
    allReceitas[m] += Number(r.amount_total || 0);
  });

  despesasCache.forEach((d) => {
    if (!d.due_date) return;
    const year = parseInt(d.due_date.slice(0, 4), 10);
    const m = parseInt(d.due_date.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) return;
    if (useYears && !yearsArr.includes(year)) return;
    allDespesas[m] += Number(d.amount_total || 0);
  });

  const months =
    dashMonthsSelected.length
      ? [...dashMonthsSelected].sort((a, b) => a - b)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const labels = [];
  const receitas = [];
  const despesas = [];

  months.forEach((m) => {
    const idx = m - 1;
    labels.push(monthNames[idx]);
    receitas.push(allReceitas[idx]);
    despesas.push(allDespesas[idx]);
  });

  return { labels, receitas, despesas };
}

function updateDashboardChart() {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("chart-receitas-despesas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { labels, receitas, despesas } = getYearData(dashYearsSelected);

  if (chartRD) chartRD.destroy();

  chartRD = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Receitas",
          backgroundColor: "#10b981",
          data: receitas,
        },
        {
          label: "Despesas",
          backgroundColor: "#ef4444",
          data: despesas,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function updateDashboard() {
  // Período filtrado (anos + meses)
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
    (acc, r) => acc + Number(r.amount_total || 0),
    0
  );
  const totalDespesasPeriodo = despesasPeriodo.reduce(
    (acc, d) => acc + Number(d.amount_total || 0),
    0
  );

  // Fechamento anual = anos selecionados, todos os meses
  const receitasAno = filterByYearAndMonths(receitasCache, dashYearsSelected, []);
  const despesasAno = filterByYearAndMonths(despesasCache, dashYearsSelected, []);

  const totalReceitasAno = receitasAno.reduce(
    (acc, r) => acc + Number(r.amount_total || 0),
    0
  );
  const totalDespesasAno = despesasAno.reduce(
    (acc, d) => acc + Number(d.amount_total || 0),
    0
  );

  // Caixa real (histórico pago)
  const totalReceitasPagas = receitasCache
    .filter((r) => r.payment_date)
    .reduce((acc, r) => acc + Number(r.amount_total || 0), 0);

  const totalDespesasPagas = despesasCache
    .filter((d) => d.payment_date)
    .reduce((acc, d) => acc + Number(d.amount_total || 0), 0);

  const caixa = totalReceitasPagas - totalDespesasPagas;
  const caixaMensal = totalReceitasPeriodo - totalDespesasPeriodo;
  const fechamentoAnual = totalReceitasAno - totalDespesasAno;

  // Atualiza os 3 cards
  const elCaixa = document.getElementById("dash-total-receitas");
  const elCaixaMensal = document.getElementById("dash-total-despesas");
  const elFechAnual = document.getElementById("dash-saldo");

  if (elCaixa) elCaixa.textContent = formatCurrency(caixa);
  if (elCaixaMensal) elCaixaMensal.textContent = formatCurrency(caixaMensal);
  if (elFechAnual) elFechAnual.textContent = formatCurrency(fechamentoAnual);

  // Atualiza o gráfico
  updateDashboardChart();
}

// --------- PARÂMETROS DE RECEITA ---------

async function loadParametrosReceita() {
  try {
    const [cats, contas, fps] = await Promise.all([
      fetchJSON(API_BASE + "/api/receita/categorias"),
      fetchJSON(API_BASE + "/api/receita/contas"),
      fetchJSON(API_BASE + "/api/receita/formas-pagamento"),
    ]);

    receitaCategorias = cats;
    receitaContas = contas;
    receitaFormasPagamento = fps;

    const ulCat = document.getElementById("lista-cat-receita");
    const ulConta = document.getElementById("lista-conta-receita");
    const ulFP = document.getElementById("lista-fp-receita");

    if (ulCat) ulCat.innerHTML = cats.map((c) => `<li>${c.name}</li>`).join("");
    if (ulConta) ulConta.innerHTML = contas.map((c) => `<li>${c.name}</li>`).join("");
    if (ulFP) ulFP.innerHTML = fps.map((c) => `<li>${c.name}</li>`).join("");

    updateDatalistsReceita();
  } catch (e) {
    console.error("Erro ao carregar parâmetros de receita", e);
  }
}

function updateDatalistsReceita() {
  const dlCat = document.getElementById("dl-categorias-receita");
  const dlConta = document.getElementById("dl-contas-receita");
  const dlFP = document.getElementById("dl-fp-receita");

  if (dlCat) {
    dlCat.innerHTML = receitaCategorias
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
  if (dlConta) {
    dlConta.innerHTML = receitaContas
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
  if (dlFP) {
    dlFP.innerHTML = receitaFormasPagamento
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
}

// --------- PARÂMETROS DE DESPESA ---------

async function loadParametrosDespesa() {
  try {
    const [cats, contas, fps] = await Promise.all([
      fetchJSON(API_BASE + "/api/despesa/categorias"),
      fetchJSON(API_BASE + "/api/despesa/contas"),
      fetchJSON(API_BASE + "/api/despesa/formas-pagamento"),
    ]);

    despesaCategorias = cats;
    despesaContas = contas;
    despesaFormasPagamento = fps;

    const ulCat = document.getElementById("lista-cat-despesa");
    const ulConta = document.getElementById("lista-conta-despesa");
    const ulFP = document.getElementById("lista-fp-despesa");

    if (ulCat) ulCat.innerHTML = cats.map((c) => `<li>${c.name}</li>`).join("");
    if (ulConta) ulConta.innerHTML = contas.map((c) => `<li>${c.name}</li>`).join("");
    if (ulFP) ulFP.innerHTML = fps.map((c) => `<li>${c.name}</li>`).join("");

    updateDatalistsDespesa();
  } catch (e) {
    console.error("Erro ao carregar parâmetros de despesa", e);
  }
}

function updateDatalistsDespesa() {
  const dlCat = document.getElementById("dl-categorias-despesa");
  const dlConta = document.getElementById("dl-contas-despesa");
  const dlFP = document.getElementById("dl-fp-despesa");

  if (dlCat) {
    dlCat.innerHTML = despesaCategorias
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
  if (dlConta) {
    dlConta.innerHTML = despesaContas
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
  if (dlFP) {
    dlFP.innerHTML = despesaFormasPagamento
      .map((c) => `<option value="${c.name}"></option>`)
      .join("");
  }
}

// --------- LISTAGENS RECEITAS / DESPESAS ---------

async function loadReceitas() {
  const tbody = document.querySelector("#table-receitas tbody");
  if (tbody) tbody.innerHTML = "";
  try {
    const itens = await fetchJSON(API_BASE + "/api/receitas");
    receitasCache = itens;
    renderReceitasTable();
  } catch (e) {
    console.error(e);
  } finally {
    buildYearFilterOptions();
    updateDashboard();
  }
}

function renderReceitasTable() {
  const tbody = document.querySelector("#table-receitas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(receitasCache, receitaFilters);

  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="row-select row-select-receita"
          data-id="${item.id}"
        />
      </td>
      <td>${item.due_date || ""}</td>
      <td>${item.description || ""}</td>
      <td>${item.category || ""}</td>
      <td>${formatCurrency(item.amount_total)}</td>
      <td>
        <input
          type="date"
          class="input-pagamento-receita"
          data-id="${item.id}"
          value="${item.payment_date || ""}"
        />
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadDespesas() {
  const tbody = document.querySelector("#table-despesas tbody");
  if (tbody) tbody.innerHTML = "";
  try {
    const itens = await fetchJSON(API_BASE + "/api/despesas");
    despesasCache = itens;
    renderDespesasTable();
  } catch (e) {
    console.error(e);
  } finally {
    buildYearFilterOptions();
    updateDashboard();
  }
}

function renderDespesasTable() {
  const tbody = document.querySelector("#table-despesas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(despesasCache, despesaFilters);

  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="row-select row-select-despesa"
          data-id="${item.id}"
        />
      </td>
      <td>${item.due_date || ""}</td>
      <td>${item.description || ""}</td>
      <td>${item.category || ""}</td>
      <td>${formatCurrency(item.amount_total)}</td>
      <td>
        <input
          type="date"
          class="input-pagamento-despesa"
          data-id="${item.id}"
          value="${item.payment_date || ""}"
        />
      </td>
    `;
    tbody.appendChild(tr);
  });
}

renderDespesasTable

// --------- CARTÕES ---------

function getCardLogo(name) {
  if (!name) return null;
  const nameLower = name.toLowerCase();
  for (const key in CARD_LOGOS) {
    if (nameLower.includes(key)) return CARD_LOGOS[key];
  }
  return null;
}

async function loadCartoes() {
  const tbody = document.querySelector("#table-cartoes tbody");
  const selectCartao = document.getElementById("select-cartao-transacao");

  if (tbody) tbody.innerHTML = "";
  if (selectCartao) {
    selectCartao.innerHTML = `<option value="">Selecione um cartão</option>`;
  }

  try {
    const itens = await fetchJSON(API_BASE + "/api/cartoes");
    cartoesCache = itens;

    if (tbody) {
      itens.forEach((item) => {
        const tr = document.createElement("tr");
        const logo = getCardLogo(item.name);
        const logoHtml = logo
          ? `<img src="${logo}" class="logo-cartao" />`
          : "💳";

        tr.innerHTML = `
          <td>${logoHtml} ${item.name}</td>
          <td>${item.closing_day}</td>
          <td>${item.due_day}</td>
          <td>${item.limit_total != null ? formatCurrency(item.limit_total) : "-"}</td>
          <td>${item.status}</td>
        `;
        tbody.appendChild(tr);
      });

      if (!itens.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5">Nenhum cartão cadastrado.</td>`;
        tbody.appendChild(tr);
      }
    }

    if (selectCartao) {
      itens.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name;
        selectCartao.appendChild(opt);
      });
    }
  } catch (e) {
  console.error(e);
  }
}

async function loadTransacoesCartao() {
  const tbody = document.querySelector("#table-transacoes-cartao tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const itens = await fetchJSON(API_BASE + "/api/transacoes-cartao");
    transacoesCartaoCache = itens;
    renderTransacoesCartaoTable();
  } catch (e) {
    console.error(e);
  }
}

function renderTransacoesCartaoTable() {
  const tbody = document.querySelector("#table-transacoes-cartao tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = applyFilters(transacoesCartaoCache, transacaoCartaoFilters, (item) => {
    const cartao = cartoesCache.find((c) => c.id === item.credit_card_id);
    return {
      ...item,
      cartao: cartao ? cartao.name : "",
    };
  });

  list.forEach((item) => {
    const cartao = cartoesCache.find((c) => c.id === item.credit_card_id);
    const nomeCartao = cartao ? cartao.name : `#${item.credit_card_id}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="row-select row-select-transacao-cartao"
          data-id="${item.id}"
        />
      </td>
      <td>${item.purchase_date || ""}</td>
      <td>${nomeCartao}</td>
      <td>${item.description || ""}</td>
      <td>${item.installment_n} de ${item.installments}</td>
      <td>${formatCurrency(item.amount_installment)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">Nenhuma transação registrada.</td>`;
    tbody.appendChild(tr);
  }
}

// --------- NAVEGAÇÃO ---------

function setupNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  const pages = document.querySelectorAll(".page");

  menuItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page");

      menuItems.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      pages.forEach((section) => {
        if (section.id === "page-" + page) {
          section.classList.add("visible");
        } else {
          section.classList.remove("visible");
        }
      });
    });
  });
}

// --------- INICIALIZAÇÃO / EVENTOS ---------

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();

  // Filtros por coluna
  document.addEventListener("input", (e) => {
    const target = e.target;
    if (!target.classList.contains("filter-input")) return;

    const table = target.dataset.table;
    const field = target.dataset.field;
    const value = target.value;

    if (table === "receitas") {
      receitaFilters[field] = value;
      renderReceitasTable();
    } else if (table === "despesas") {
      despesaFilters[field] = value;
      renderDespesasTable();
    } else if (table === "transacoes-cartao") {
      transacaoCartaoFilters[field] = value;
      renderTransacoesCartaoTable();
    }
  });

  // Selecionar todos
  const chkAllReceitas = document.getElementById("chk-all-receitas");
  if (chkAllReceitas) {
    chkAllReceitas.addEventListener("change", () => {
      const checked = chkAllReceitas.checked;
      document
        .querySelectorAll("#table-receitas tbody .row-select-receita")
        .forEach((cb) => (cb.checked = checked));
      updateActionButtons();
    });
  }

  const chkAllDespesas = document.getElementById("chk-all-despesas");
  if (chkAllDespesas) {
    chkAllDespesas.addEventListener("change", () => {
      const checked = chkAllDespesas.checked;
      document
        .querySelectorAll("#table-despesas tbody .row-select-despesa")
        .forEach((cb) => (cb.checked = checked));
      updateActionButtons();
    });
  }

  const chkAllTrans = document.getElementById("chk-all-transacoes-cartao");
  if (chkAllTrans) {
    chkAllTrans.addEventListener("change", () => {
      const checked = chkAllTrans.checked;
      document
        .querySelectorAll("#table-transacoes-cartao tbody .row-select-transacao-cartao")
        .forEach((cb) => (cb.checked = checked));
      updateActionButtons();
    });
  }

  // Atualiza botões quando clica em qualquer checkbox de linha
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("row-select")) {
      updateActionButtons();
    }
  });

  function updateActionButtons() {
    const btnEditReceita = document.getElementById("btn-edit-receita");
    const btnDelReceita = document.getElementById("btn-delete-receita");
    const btnEditDespesa = document.getElementById("btn-edit-despesa");
    const btnDelDespesa = document.getElementById("btn-delete-despesa");
    const btnDelTrans = document.getElementById("btn-delete-transacao-cartao");

    const selReceitas = getSelectedIdsFromTable("table-receitas");
    const selDespesas = getSelectedIdsFromTable("table-despesas");
    const selTrans = getSelectedIdsFromTable("table-transacoes-cartao");

    if (btnEditReceita) btnEditReceita.disabled = selReceitas.length !== 1;
    if (btnDelReceita) btnDelReceita.disabled = selReceitas.length === 0;
    if (btnEditDespesa) btnEditDespesa.disabled = selDespesas.length !== 1;
    if (btnDelDespesa) btnDelDespesa.disabled = selDespesas.length === 0;
    if (btnDelTrans) btnDelTrans.disabled = selTrans.length === 0;
  }

  // Botões de excluir / editar
  const btnDelReceita = document.getElementById("btn-delete-receita");
  if (btnDelReceita) {
    btnDelReceita.addEventListener("click", async () => {
      const ids = getSelectedIdsFromTable("table-receitas");
      if (!ids.length) return;
      if (!confirm(`Excluir ${ids.length} receita(s)?`)) return;
      try {
        for (const id of ids) {
          await fetchJSON(`${API_BASE}/api/receitas/${id}`, { method: "DELETE" });
        }
        await loadReceitas();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir receitas (verifique se o backend tem o endpoint DELETE /api/receitas/{id}).");
      }
    });
  }

  const btnDelDespesa = document.getElementById("btn-delete-despesa");
  if (btnDelDespesa) {
    btnDelDespesa.addEventListener("click", async () => {
      const ids = getSelectedIdsFromTable("table-despesas");
      if (!ids.length) return;
      if (!confirm(`Excluir ${ids.length} despesa(s)?`)) return;
      try {
        for (const id of ids) {
          await fetchJSON(`${API_BASE}/api/despesas/${id}`, { method: "DELETE" });
        }
        await loadDespesas();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir despesas (verifique se o backend tem o endpoint DELETE /api/despesas/{id}).");
      }
    });
  }

  const btnDelTrans = document.getElementById("btn-delete-transacao-cartao");
  if (btnDelTrans) {
    btnDelTrans.addEventListener("click", async () => {
      const ids = getSelectedIdsFromTable("table-transacoes-cartao");
      if (!ids.length) return;
      if (!confirm(`Excluir ${ids.length} lançamento(s) de cartão?`)) return;
      try {
        for (const id of ids) {
          await fetchJSON(`${API_BASE}/api/transacoes-cartao/${id}`, {
            method: "DELETE",
          });
        }
        await loadTransacoesCartao();
        await loadDespesas(); // já que as despesas de cartão são espelhadas
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir lançamentos de cartão.");
      }
    });
  }

  // Edição simples: carrega os dados no formulário para ajuste
  const btnEditReceita = document.getElementById("btn-edit-receita");
  if (btnEditReceita) {
    btnEditReceita.addEventListener("click", () => {
      const ids = getSelectedIdsFromTable("table-receitas");
      if (ids.length !== 1) return;
      const id = ids[0];
      const item = receitasCache.find((r) => r.id === id);
      if (!item) return;
      const form = document.getElementById("form-receita");
      if (!form) return;

      form.description.value = item.description || "";
      form.category.value = item.category || "";
      form.account.value = item.account || "";
      form.due_date.value = item.due_date || "";
      form.payment_date.value = item.payment_date || "";
      form.amount_total.value = item.amount_total || "";
      form.installments.value = item.installments || 1;
      form.payment_method.value = item.payment_method || "";
      form.notes.value = item.notes || "";

      form.dataset.editingId = String(id);
      alert("Edite os campos e clique em Salvar Receita para atualizar.");
    });
  }

  const btnEditDespesa = document.getElementById("btn-edit-despesa");
  if (btnEditDespesa) {
    btnEditDespesa.addEventListener("click", () => {
      const ids = getSelectedIdsFromTable("table-despesas");
      if (ids.length !== 1) return;
      const id = ids[0];
      const item = despesasCache.find((d) => d.id === id);
      if (!item) return;
      const form = document.getElementById("form-despesa");
      if (!form) return;

      form.description.value = item.description || "";
      form.category.value = item.category || "";
      form.account.value = item.account || "";
      form.due_date.value = item.due_date || "";
      form.payment_date.value = item.payment_date || "";
      form.amount_total.value = item.amount_total || "";
      form.installments.value = item.installments || 1;
      form.payment_method.value = item.payment_method || "";
      form.notes.value = item.notes || "";

      form.dataset.editingId = String(id);
      alert("Edite os campos e clique em Salvar Despesa para atualizar.");
    });
  }


  const formReceita = document.getElementById("form-receita");
  const formDespesa = document.getElementById("form-despesa");
  const formCartao = document.getElementById("form-cartao");
  const formTransacao = document.getElementById("form-transacao-cartao");

  if (formReceita) {
  formReceita.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = serializeForm(formReceita);
    const editingId = formReceita.dataset.editingId;
    try {
      if (editingId) {
        await fetchJSON(`${API_BASE}/api/receitas/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJSON(API_BASE + "/api/receitas", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      formReceita.reset();
      delete formReceita.dataset.editingId;
      await loadReceitas();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar receita (verifique se o backend tem o endpoint PUT /api/receitas/{id}).");
    }
  });
}


  if (formDespesa) {
  formDespesa.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = serializeForm(formDespesa);
    const editingId = formDespesa.dataset.editingId;
    try {
      if (editingId) {
        await fetchJSON(`${API_BASE}/api/despesas/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJSON(API_BASE + "/api/despesas", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      formDespesa.reset();
      delete formDespesa.dataset.editingId;
      await loadDespesas();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar despesa (verifique se o backend tem o endpoint PUT /api/despesas/{id}).");
    }
  });
}


  if (formCartao) {
    formCartao.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(formCartao);
      const payload = {};
      for (const [key, value] of data.entries()) {
        if (value === "") continue;
        if (["closing_day", "due_day"].includes(key)) {
          payload[key] = Number(value);
        } else if (["limit_total", "annual_fee"].includes(key)) {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      }
      try {
        await fetchJSON(API_BASE + "/api/cartoes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formCartao.reset();
        await loadCartoes();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar cartão");
      }
    });
  }

  if (formTransacao) {
    formTransacao.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(formTransacao);
      const payload = {};
      for (const [key, value] of data.entries()) {
        if (value === "") continue;
        if (["credit_card_id", "installments", "installment_n"].includes(key)) {
          payload[key] = Number(value);
        } else if (["amount_total"].includes(key)) {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      }

      const total = payload.amount_total || 0;
      const parcelas = payload.installments || 1;
      payload.amount_installment = total / parcelas;

      try {
        await fetchJSON(API_BASE + "/api/transacoes-cartao", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formTransacao.reset();
        await loadDespesas(); // despesas geradas automaticamente
        await loadTransacoesCartao();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar transação de cartão");
      }
    });
  }

  // formulários de parâmetros de receita
  const formCatReceita = document.getElementById("form-cat-receita");
  if (formCatReceita) {
    formCatReceita.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formCatReceita);
      try {
        await fetchJSON(API_BASE + "/api/receita/categorias", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formCatReceita.reset();
        await loadParametrosReceita();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar categoria de receita");
      }
    });
  }

  const formContaReceita = document.getElementById("form-conta-receita");
  if (formContaReceita) {
    formContaReceita.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formContaReceita);
      try {
        await fetchJSON(API_BASE + "/api/receita/contas", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formContaReceita.reset();
        await loadParametrosReceita();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar conta de receita");
      }
    });
  }

  const formFPReceita = document.getElementById("form-fp-receita");
  if (formFPReceita) {
    formFPReceita.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formFPReceita);
      try {
        await fetchJSON(API_BASE + "/api/receita/formas-pagamento", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formFPReceita.reset();
        await loadParametrosReceita();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar forma de pagamento de receita");
      }
    });
  }

  // formulários de parâmetros de despesa
  const formCatDespesa = document.getElementById("form-cat-despesa");
  if (formCatDespesa) {
    formCatDespesa.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formCatDespesa);
      try {
        await fetchJSON(API_BASE + "/api/despesa/categorias", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formCatDespesa.reset();
        await loadParametrosDespesa();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar categoria de despesa");
      }
    });
  }

  const formContaDespesa = document.getElementById("form-conta-despesa");
  if (formContaDespesa) {
    formContaDespesa.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formContaDespesa);
      try {
        await fetchJSON(API_BASE + "/api/despesa/contas", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formContaDespesa.reset();
        await loadParametrosDespesa();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar conta de despesa");
      }
    });
  }

  const formFPDespesa = document.getElementById("form-fp-despesa");
  if (formFPDespesa) {
    formFPDespesa.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = serializeForm(formFPDespesa);
      try {
        await fetchJSON(API_BASE + "/api/despesa/formas-pagamento", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        formFPDespesa.reset();
        await loadParametrosDespesa();
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar forma de pagamento de despesa");
      }
    });
  }

  // alteração da data de pagamento receita / despesa
  document.addEventListener("change", async (e) => {
    const target = e.target;

    if (target.classList.contains("input-pagamento-receita")) {
      const id = Number(target.dataset.id);
      const payment_date = target.value || null;
      try {
        await fetchJSON(`${API_BASE}/api/receitas/${id}/pagamento`, {
          method: "PATCH",
          body: JSON.stringify({ payment_date }),
        });
        await loadReceitas();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar data de pagamento da receita");
      }
    }

    if (target.classList.contains("input-pagamento-despesa")) {
      const id = Number(target.dataset.id);
      const payment_date = target.value || null;
      try {
        await fetchJSON(`${API_BASE}/api/despesas/${id}/pagamento`, {
          method: "PATCH",
          body: JSON.stringify({ payment_date }),
        });
        await loadDespesas();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar data de pagamento da despesa");
      }
    }
  });

  // filtro de ano (multi-select)
  const yearSelect = document.getElementById("filter-year");
  if (yearSelect) {
    yearSelect.addEventListener("change", () => {
      const selected = Array.from(yearSelect.selectedOptions)
        .map((o) => parseInt(o.value, 10))
        .filter((n) => !isNaN(n));
      dashYearsSelected = selected; // [] => todos os anos
      updateDashboard();
    });
  }

  // filtro de meses (multi-select)
  const monthsSelect = document.getElementById("filter-months");
  if (monthsSelect) {
    monthsSelect.addEventListener("change", () => {
      const selected = Array.from(monthsSelect.selectedOptions)
        .map((o) => parseInt(o.value, 10))
        .filter((n) => !isNaN(n));
      dashMonthsSelected = selected; // [] => todos os meses
      updateDashboard();
    });
  }

// ====================== CARTÕES: RESUMO, TABELA, GRÁFICOS ======================
const API = "http://127.0.0.1:8000";

let chartGastoCartao = null;
let chartLimiteCartao = null;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function carregarCartoesResumo() {
  try {
    const [resCartoes, resTx] = await Promise.all([
      fetch(`${API}/api/cartoes`),
      fetch(`${API}/api/transacoes-cartao`)
    ]);

    if (!resCartoes.ok) throw new Error("Erro ao carregar cartões");
    if (!resTx.ok) throw new Error("Erro ao carregar transações de cartão");

    const cartoes = await resCartoes.json();
    const transacoes = await resTx.json();

    renderTabelaCartoes(cartoes);
    configurarSelecaoCartoes();
    atualizarGraficosCartao(cartoes, transacoes);
  } catch (err) {
    console.error(err);
  }
}

function renderTabelaCartoes(cartoes) {
  const tabela = document.getElementById("table-cartoes");
  if (!tabela) return;

  const tbody = tabela.querySelector("tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  cartoes.forEach((c) => {
    const tr = document.createElement("tr");
    tr.dataset.id = c.id;

    const iniciais = (c.name || c.cartao || "")
      .toString()
      .slice(0, 2)
      .toUpperCase();

    tr.innerHTML = `
      <td><input type="checkbox" class="row-select-cartao" data-id="${c.id}" /></td>
      <td>
        <div class="card-logo-wrap">
          <div class="card-logo-badge">${iniciais}</div>
          <span>${c.name || c.cartao}</span>
        </div>
      </td>
      <td>${c.closing_day ?? ""}</td>
      <td>${c.due_day ?? ""}</td>
      <td>${formatCurrency(c.limit_total ?? 0)}</td>
      <td>${c.status ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function configurarSelecaoCartoes() {
  const chkAll = document.getElementById("chk-all-cartoes");
  const btnEdit = document.getElementById("btn-edit-cartao");
  const btnDelete = document.getElementById("btn-delete-cartao");
  const tbody = document.querySelector("#table-cartoes tbody");

  if (!chkAll || !btnEdit || !btnDelete || !tbody) return;

  function getSelecionados() {
    return Array.from(
      document.querySelectorAll(".row-select-cartao:checked")
    ).map((el) => el.dataset.id);
  }

  function atualizarBotoes() {
    const selecionados = getSelecionados();
    btnDelete.disabled = selecionados.length === 0;
    btnEdit.disabled = selecionados.length !== 1;
  }

  chkAll.addEventListener("change", () => {
    const checks = document.querySelectorAll(".row-select-cartao");
    checks.forEach((c) => (c.checked = chkAll.checked));
    atualizarBotoes();
  });

  tbody.addEventListener("change", (e) => {
    if (e.target.classList.contains("row-select-cartao")) {
      atualizarBotoes();
      if (!e.target.checked) chkAll.checked = false;
    }
  });

  btnDelete.addEventListener("click", async () => {
    const ids = getSelecionados();
    if (!ids.length) return;
    if (!confirm(`Confirma excluir ${ids.length} cartão(ões)?`)) return;

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`${API}/api/cartoes/${id}`, { method: "DELETE" })
        )
      );
      await carregarCartoesResumo();
    } catch (err) {
      alert(
        "Erro ao excluir cartões. Verifique se o backend tem DELETE /api/cartoes/{id}."
      );
      console.error(err);
    }
  });

  btnEdit.addEventListener("click", async () => {
    const ids = getSelecionados();
    if (ids.length !== 1) return;

    const id = ids[0];

    try {
      const res = await fetch(`${API}/api/cartoes`);
      if (!res.ok) throw new Error();
      const cartoes = await res.json();
      const cartao = cartoes.find((c) => String(c.id) === String(id));
      if (!cartao) return;

      const form = document.getElementById("form-cartao");
      if (!form) return;

      form.dataset.editId = id;
      form.name.value = cartao.name || cartao.cartao || "";
      form.closing_day.value = cartao.closing_day ?? "";
      form.due_day.value = cartao.due_day ?? "";
      form.limit_total.value = cartao.limit_total ?? "";
      form.annual_fee.value = cartao.annual_fee ?? "";
      form.status.value = cartao.status ?? "ativo";

      form.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
    }
  });

  atualizarBotoes();
}

function atualizarGraficosCartao(cartoes, transacoes) {
  const ctxGasto = document.getElementById("chart-gasto-cartao");
  const ctxLimite = document.getElementById("chart-limite-cartao");
  if (!ctxGasto || !ctxLimite) return;

  const gastosPorCartao = {};
  cartoes.forEach((c) => (gastosPorCartao[c.id] = 0));

  transacoes.forEach((t) => {
    const cardId = t.credit_card_id || t.cartao_id || t.card_id;
    if (cardId && gastosPorCartao.hasOwnProperty(cardId)) {
      const valor = Number(
        t.amount_installment ?? t.amount_total ?? t.amount ?? 0
      );
      gastosPorCartao[cardId] += valor;
    }
  });

  const labels = cartoes.map((c) => c.name || c.cartao);
  const gastos = cartoes.map((c) => gastosPorCartao[c.id] || 0);
  const limites = cartoes.map((c) => Number(c.limit_total ?? 0));
  const disponiveis = limites.map((lim, i) => Math.max(lim - gastos[i], 0));

  if (chartGastoCartao) chartGastoCartao.destroy();
  if (chartLimiteCartao) chartLimiteCartao.destroy();

  chartGastoCartao = new Chart(ctxGasto, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Gasto", data: gastos }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  chartLimiteCartao = new Chart(ctxLimite, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Limite disponível", data: disponiveis }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// garante que isso rode quando a tela carregar
window.addEventListener("load", () => {
  carregarCartoesResumo();
});

// ====================== MULTISELECT SEM CTRL (ANO/MÊS DASHBOARD) ======================
function enableMultiSelectWithoutCtrl(select) {
  if (!select) return;

  select.addEventListener("mousedown", function (e) {
    const option = e.target;
    if (option.tagName !== "OPTION") return;

    e.preventDefault(); // não deixa o browser trocar seleção sozinho
    option.selected = !option.selected; // alterna manualmente
    select.dispatchEvent(new Event("change")); // dispara para sua lógica atual ouvir
  });
}

window.addEventListener("load", () => {
  enableMultiSelectWithoutCtrl(document.getElementById("filter-year"));
  enableMultiSelectWithoutCtrl(document.getElementById("filter-months"));
});

  // carregar dados iniciais
  (async () => {
    await loadReceitas();
    await loadDespesas();
    await loadCartoes();
    await loadTransacoesCartao();
    await loadParametrosReceita();
    await loadParametrosDespesa();
  })();
});

// ====================== CARTÕES: TABELA + SELEÇÃO + AÇÕES ======================
const API = "http://127.0.0.1:8000";

let chartGastoCartao = null;
let chartLimiteCartao = null;

async function carregarCartoesResumo() {
  try {
    const [resCartoes, resTx] = await Promise.all([
      fetch(`${API}/api/cartoes`),
      fetch(`${API}/api/transacoes-cartao`)
    ]);

    if (!resCartoes.ok) throw new Error("Erro ao carregar cartões");
    if (!resTx.ok) throw new Error("Erro ao carregar transações de cartão");

    const cartoes = await resCartoes.json();
    const transacoes = await resTx.json();

    renderTabelaCartoes(cartoes);
    popularSelectCartaoTransacao(cartoes);
    configurarSelecaoCartoes();
    atualizarGraficosCartao(cartoes, transacoes);
  } catch (err) {
    console.error(err);
  }
}

function renderTabelaCartoes(cartoes) {
  const tbody = document.querySelector("#table-cartoes tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  cartoes.forEach((c) => {
    const tr = document.createElement("tr");
    const iniciais = (c.name || c.cartao || "").toString().slice(0, 2).toUpperCase();

    tr.innerHTML = `
      <td><input type="checkbox" class="row-select-cartao" data-id="${c.id}" /></td>
      <td>
        <div class="card-logo-wrap">
          <div class="card-logo-badge">${iniciais}</div>
          <span>${c.name || c.cartao}</span>
        </div>
      </td>
      <td>${c.closing_day ?? ""}</td>
      <td>${c.due_day ?? ""}</td>
      <td>${formatCurrency(c.limit_total ?? 0)}</td>
      <td>${c.status ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function popularSelectCartaoTransacao(cartoes) {
  const select = document.getElementById("select-cartao-transacao");
  if (!select) return;

  const current = select.value;
  select.innerHTML = `<option value="">Selecione um cartão</option>`;

  cartoes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name || c.cartao;
    select.appendChild(opt);
  });

  if (current) select.value = current;
}

function configurarSelecaoCartoes() {
  const chkAll = document.getElementById("chk-all-cartoes");
  const btnEdit = document.getElementById("btn-edit-cartao");
  const btnDelete = document.getElementById("btn-delete-cartao");

  if (!chkAll || !btnEdit || !btnDelete) return;

  function getSelecionados() {
    return Array.from(
      document.querySelectorAll(".row-select-cartao:checked")
    ).map((el) => el.dataset.id);
  }

  function atualizarBotoes() {
    const selecionados = getSelecionados();
    btnDelete.disabled = selecionados.length === 0;
    btnEdit.disabled = selecionados.length !== 1; // só permite editar 1 por vez
  }

  chkAll.addEventListener("change", () => {
    const checks = document.querySelectorAll(".row-select-cartao");
    checks.forEach((c) => (c.checked = chkAll.checked));
    atualizarBotoes();
  });

  document
    .querySelector("#table-cartoes tbody")
    .addEventListener("change", (e) => {
      if (e.target.classList.contains("row-select-cartao")) {
        atualizarBotoes();
        if (!e.target.checked) chkAll.checked = false;
      }
    });

  btnDelete.addEventListener("click", async () => {
    const ids = getSelecionados();
    if (!ids.length) return;

    if (!confirm(`Confirma excluir ${ids.length} cartão(ões)?`)) return;

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`${API}/api/cartoes/${id}`, {
            method: "DELETE",
          })
        )
      );
      await carregarCartoesResumo();
    } catch (err) {
      alert("Erro ao excluir cartões. Verifique se o backend tem DELETE /api/cartoes/{id}.");
      console.error(err);
    }
  });

  btnEdit.addEventListener("click", async () => {
    const ids = getSelecionados();
    if (ids.length !== 1) return;

    const id = ids[0];

    // Para edição simples: preenche o formulário de cartão com os dados atuais
    try {
      const res = await fetch(`${API}/api/cartoes`);
      if (!res.ok) throw new Error();
      const cartoes = await res.json();
      const cartao = cartoes.find((c) => String(c.id) === String(id));
      if (!cartao) return;

      const form = document.getElementById("form-cartao");
      if (!form) return;

      form.dataset.editId = id; // flag para sabermos que é edição
      form.name.value = cartao.name || cartao.cartao || "";
      form.closing_day.value = cartao.closing_day ?? "";
      form.due_day.value = cartao.due_day ?? "";
      form.limit_total.value = cartao.limit_total ?? "";
      form.annual_fee.value = cartao.annual_fee ?? "";
      form.status.value = cartao.status ?? "ativo";

      form.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
    }
  });

  atualizarBotoes();
}

// intercepta submit do form-cartao para tratar edição x criação
(function interceptFormCartao() {
  const form = document.getElementById("form-cartao");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    // só intercepta se estiver em modo edição
    if (!form.dataset.editId) return;

    e.preventDefault();

    const payload = {
      name: form.name.value,
      closing_day: Number(form.closing_day.value || 0),
      due_day: Number(form.due_day.value || 0),
      limit_total: Number(form.limit_total.value || 0),
      annual_fee: Number(form.annual_fee.value || 0),
      status: form.status.value,
    };

    try {
      const res = await fetch(`${API}/api/cartoes/${form.dataset.editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      form.reset();
      delete form.dataset.editId;
      await carregarCartoesResumo();
      alert("Cartão atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar cartão. Verifique se o backend tem PUT /api/cartoes/{id}.");
      console.error(err);
    }
  });
})();

// helper simples para moeda
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// chama isso quando a página carregar
window.addEventListener("load", () => {
  carregarCartoesResumo();
});

