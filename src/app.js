(function () {
  'use strict';
  const offlinePage = '<!doctype html>\n' + document.documentElement.outerHTML;
  const $ = id => document.getElementById(id);
  const form = $('calculator-form'), scenarioForm = $('scenario-form');
  const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const whole = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
  const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value));
  let period = 12, current = null, comparison = null, scenarioEdited = false;
  const field = name => form.elements.namedItem(name);
  const scenario = name => scenarioForm.elements.namedItem(name);
  const visible = (id, show) => { $(id).hidden = !show; };
  function setupFields() {
    const type = field('incomeType').value;
    const employed = type === 'employed', pensionIncome = type === 'pension';
    for (const option of field('pensionMethod').options) option.disabled = !employed && ['salary-sacrifice','net-pay'].includes(option.value);
    if (field('pensionMethod').selectedOptions[0].disabled) field('pensionMethod').value = 'relief-at-source';
    if (pensionIncome) field('pensionMethod').value = 'none';
    const method = field('pensionMethod').value;
    const inputMode = field('pensionInputMode').value;
    if (method === 'none') field('pension').value = '0';
    if (!employed) { field('employerPension').value = '0'; field('employerNIShare').value = '0'; }
    if (type !== 'self-employed') field('voluntaryClass2').checked = false;
    if (pensionIncome) field('niExempt').checked = false;
    visible('pension-fields', !pensionIncome);
    visible('contribution-field', method !== 'none');
    visible('pension-amount-field', inputMode === 'amount');
    visible('pension-percentage-field', inputMode === 'percentage');
    visible('employer-field', employed);
    visible('sacrifice-fields', employed); // Hours and sharing also apply to alternative scenarios.
    visible('class2-field', type === 'self-employed');
    visible('ni-field', !pensionIncome);
    $('ni-label').textContent = type === 'self-employed' ? 'Reached State Pension age before this tax year' : 'State Pension age for the whole year';
    $('income-label').textContent = type === 'self-employed' ? 'Annual taxable profit' : pensionIncome ? 'Annual taxable pension income' : 'Annual gross salary';
    $('income-help').textContent = type === 'self-employed' ? 'Profit after allowable business expenses, before personal pensions or tax. Not turnover.' : pensionIncome ? 'Taxable amount only, including State Pension. Exclude tax-free lump sums.' : 'Before tax and pension contributions, including bonuses.';
    $('pension-help').textContent = inputMode === 'percentage' ? 'The engine converts this to a gross annual contribution from the income above.' : method === 'relief-at-source' ? 'Include the provider’s 20% relief: if you pay £4,000, enter £5,000. Any extra relief is included in the take-home estimate.' : 'Gross annual amount from your salary. Exclude employer contributions. Use the actual amount, not an assumed qualifying-earnings percentage.';
    for (const option of scenario('scenarioMethod').options) option.disabled = (!employed && ['salary-sacrifice','net-pay'].includes(option.value)) || (pensionIncome && option.value !== 'none');
    if (scenario('scenarioMethod').selectedOptions[0].disabled) scenario('scenarioMethod').value = pensionIncome ? 'none' : 'relief-at-source';
    visible('scenario-method-label', !pensionIncome);
    visible('scenario-pension-label', !pensionIncome);
    visible('switch-sacrifice', employed);
    visible('extra-pension', !pensionIncome);
    visible('restore-allowance', !pensionIncome);
  }
  function getInput() {
    const x = {};
    for (const key of Object.keys(Taxman.defaults)) {
      if (key === 'studentPlans') x[key] = Array.from(form.querySelectorAll('[name="studentPlans"]:checked'), el => el.value);
      else if (typeof Taxman.defaults[key] === 'boolean') x[key] = field(key).checked;
      else if (typeof Taxman.defaults[key] === 'number') {
        if (field(key).value.trim() === '') throw new Error('Enter a value for ' + field(key).closest('label').textContent.trim() + '.');
        x[key] = field(key).valueAsNumber;
      } else x[key] = field(key).value;
    }
    return x;
  }
  function resetScenario(x) {
    scenario('scenarioIncome').value = x.income;
    scenario('scenarioMethod').value = x.incomeType === 'pension' ? 'none' : x.pensionMethod !== 'none' ? x.pensionMethod : x.incomeType === 'employed' ? 'salary-sacrifice' : 'relief-at-source';
    scenario('scenarioPension').value = x.incomeType === 'pension' ? 0 : Math.min(x.pension + 5000, x.income);
  }
  function addRow(parent, label, value) {
    const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value; div.append(dt, dd); parent.append(div);
  }
  function renderResult() {
    const a = current.annual;
    $('take-home').textContent = money(a.takeHome / period);
    $('period-label').textContent = period === 1 ? 'per year' : period === 12 ? 'per month, annual average' : 'per week, annual average';
    $('take-home-note').textContent = a.additionalRelief > 0 ? 'Includes ' + money(a.additionalRelief / period) + ' additional pension tax relief to claim from HMRC.' : current.input.incomeType === 'self-employed' ? 'After estimated annual tax, NI, pensions and loans. Set tax aside yourself.' : 'After Income Tax, National Insurance, pensions and loans.';
    $('breakdown').replaceChildren();
    const rows = [['Gross income', a.grossIncome], ['Income Tax', -a.incomeTax], ['National Insurance', -a.nationalInsurance]];
    if (a.class2) rows.push(['Voluntary Class 2 NI', -a.class2]);
    if (a.salarySacrifice) rows.push(['Pension salary sacrifice', -a.salarySacrifice]);
    if (a.pensionPaidFromCash) rows.push(['Pension paid from cash', -a.pensionPaidFromCash]);
    if (current.input.studentPlans.length) rows.push(['Student loan repayments', -a.studentLoan]);
    if (current.input.postgraduate) rows.push(['Postgraduate loan', -a.postgraduateLoan]);
    for (const [label, amount] of rows) addRow($('breakdown'), label, money(amount / period));
    $('pension-total').textContent = money(a.totalPension / period);
    $('effective-rate').textContent = a.overallEffectiveTaxRate + '%';
    $('allowance-value').textContent = money(a.personalAllowance);
    $('allowance-impact').textContent = a.personalAllowance < 12570 ? money(12570 - a.personalAllowance) + ' lost to the £100k taper' : 'Full standard allowance';
    $('allocation').replaceChildren();
    const allocation = [['cash', a.takeHome], ['tax', a.taxAndNI], ['pension', a.salarySacrifice + a.pensionPaidFromCash], ['loans', a.studentLoan + a.postgraduateLoan]];
    const total = allocation.reduce((sum, [,n]) => sum + Math.max(0,n), 0);
    for (const [name, value] of allocation) {
      const span = document.createElement('span'); span.className = name; span.style.width = (total ? Math.max(0,value) / total * 100 : 0) + '%'; $('allocation').append(span);
    }
    $('tax-bands').replaceChildren();
    for (const b of current.taxBands) {
      const tr = document.createElement('tr');
      for (const [index, text] of [b.name, Math.round(b.rate * 100) + '%', money(b.amount), money(b.tax)].entries()) {
        const td = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) td.scope = 'row'; td.textContent = text; tr.append(td);
      }
      $('tax-bands').append(tr);
    }
    $('marginal-blocks').replaceChildren();
    for (const block of a.marginalBlocks) {
      const tr = document.createElement('tr');
      const end = block.to >= Math.max(current.input.income, 125140) ? 'and above' : '– ' + money(block.to);
      [money(block.from) + ' ' + end, block.incomeTaxRate + '%', block.niRate + '%', block.loanRate + '%', block.rate + '%', block.label].forEach((text, index) => { const td = document.createElement(index === 0 ? 'th' : 'td'); if(index===0) td.scope='row'; td.textContent=text; tr.append(td); });
      $('marginal-blocks').append(tr);
    }
    $('allowance-note').textContent = 'Adjusted net income: ' + money(a.adjustedNetIncome) + '. Personal Allowance: ' + money(a.personalAllowance) + '. Taxable income: ' + money(a.taxableIncome) + '. All figures below are annual.';
    $('assumptions').replaceChildren(...current.assumptions.map(message => { const li = document.createElement('li'); li.textContent = message; return li; }));
    $('warnings').replaceChildren(...current.warnings.map(message => { const p = document.createElement('p'); p.className = 'warning'; p.textContent = message; return p; }));
    $('restore-allowance').disabled = a.adjustedNetIncome <= 100000;
  }
  function renderComparison() {
    comparison = null;
    $('comparison').replaceChildren(); $('scenario-explanation').textContent = '';
    try {
      if (!scenarioForm.checkValidity()) throw new Error('Enter valid non-negative income and pension amounts for the alternative.');
      const method = scenario('scenarioMethod').value;
      scenario('scenarioPension').disabled = method === 'none';
      if (method === 'none') scenario('scenarioPension').value = '0';
      comparison = Taxman.compare(current.input, { income: scenario('scenarioIncome').valueAsNumber, pension: scenario('scenarioPension').valueAsNumber, pensionMethod: method, pensionInputMode: 'amount' });
      visible('scenario-error', false);
      const d = comparison.difference, a = comparison.after.annual, b = current.annual;
      const grid = document.createElement('div'); grid.className = 'comparison-grid';
      for (const [label, value] of [['Change to take-home', d.takeHome], ['Change to pension', d.totalPension]]) {
        const card = document.createElement('div'); card.className = 'delta';
        const title = document.createElement('small'); title.textContent = label;
        const amount = document.createElement('strong'); amount.textContent = signed(value / period); if (value < 0) amount.className = 'negative';
        const time = document.createElement('span'); time.textContent = period === 1 ? 'per year' : period === 12 ? 'per month on average' : 'per week on average';
        card.append(title, amount, time); grid.append(card);
      }
      $('comparison').append(grid);
      const table = document.createElement('table'); table.className = 'comparison-table';
      const head = document.createElement('thead'); const hr = document.createElement('tr');
      for (const text of ['Annual amounts', 'Current', 'Alternative']) { const th = document.createElement('th'); th.scope='col'; th.textContent=text; hr.append(th); } head.append(hr); table.append(head);
      const body = document.createElement('tbody');
      for (const [label, key] of [['Take-home', 'takeHome'], ['Into pension', 'totalPension'], ['Income Tax + NI', 'taxAndNI'], ['Student + postgrad loans', 'loans']]) {
        const tr = document.createElement('tr');
        const values = [label, money(key === 'loans' ? b.studentLoan + b.postgraduateLoan : b[key]), money(key === 'loans' ? a.studentLoan + a.postgraduateLoan : a[key])];
        values.forEach((text, index) => { const td = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) td.scope='row'; td.textContent=text; tr.append(td); }); body.append(tr);
      }
      table.append(body); $('comparison').append(table);
      const relief = comparison.taxAndNISaved + comparison.additionalProviderRelief;
      $('scenario-explanation').textContent = (relief >= 0 ? whole(relief) + ' less tax and NI, including any additional provider pension relief.' : whole(-relief) + ' more tax and NI, net of any provider pension relief.') + (comparison.loanRepaymentsReduced ? ' Loan repayments change by ' + signed(-comparison.loanRepaymentsReduced) + ' per year.' : '') + (d.takeHome < 0 && d.totalPension > 0 ? ' You exchange ' + whole(-d.takeHome) + ' of annual take-home for ' + whole(d.totalPension) + ' more in your pension.' : '');
      for (const message of comparison.after.warnings) { const p = document.createElement('p'); p.className = 'warning'; p.textContent = 'Alternative: ' + message; $('comparison').append(p); }
    } catch (error) { $('scenario-error').textContent = error.message; visible('scenario-error', true); }
    publishJSON();
  }
  function publishJSON() {
    $('taxman-result').textContent = JSON.stringify(current ? { result: current, comparison } : null);
  }
  function update() {
    try {
      setupFields();
      const x = getInput(); current = Taxman.calculate(x);
      visible('error', false); document.querySelector('.results-column').classList.remove('invalid');
      $('download-results').disabled = false;
      if (!scenarioEdited) resetScenario(x);
      renderResult(); renderComparison();
    } catch (error) {
      current = null; comparison = null; publishJSON();
      $('error').textContent = error.message; visible('error', true);
      document.querySelector('.results-column').classList.add('invalid'); $('download-results').disabled = true;
    }
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  form.addEventListener('submit', event => event.preventDefault());
  scenarioForm.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', update);
  scenarioForm.addEventListener('input', () => { scenarioEdited = true; if (current) renderComparison(); });
  for (const button of document.querySelectorAll('[data-period]')) button.addEventListener('click', () => {
    period = Number(button.dataset.period);
    for (const other of document.querySelectorAll('[data-period]')) other.setAttribute('aria-pressed', String(other === button));
    if (current) { renderResult(); renderComparison(); }
  });
  $('reset').addEventListener('click', () => { form.reset(); scenarioForm.reset(); scenarioEdited = false; $('status').textContent = ''; update(); });
  function quickScenario(action) {
    if (!current) return;
    const x = current.input; resetScenario(x); scenarioEdited = true;
    if (action === 'switch') { scenario('scenarioMethod').value = 'salary-sacrifice'; scenario('scenarioPension').value = x.pension || Math.min(5000,x.income); }
    if (action === 'extra') scenario('scenarioPension').value = x.pension + 1000;
    if (action === 'allowance') scenario('scenarioPension').value = Math.round((x.pension + Math.max(0,current.annual.adjustedNetIncome - 100000)) * 100) / 100;
    renderComparison();
  }
  $('switch-sacrifice').addEventListener('click', () => quickScenario('switch'));
  $('extra-pension').addEventListener('click', () => quickScenario('extra'));
  $('restore-allowance').addEventListener('click', () => quickScenario('allowance'));
  $('download-results').addEventListener('click', () => { if (current) { download('taxman-results.json', JSON.stringify({result: current, comparison}, null, 2), 'application/json'); $('status').textContent = 'Results exported. This file contains the income and pension figures you entered.'; } });
  $('download-offline').addEventListener('click', () => { download('taxman-offline.html', offlinePage, 'text/html'); $('status').textContent = 'Offline page downloaded with example inputs. Open it directly in your browser; no connection needed.'; });
  $('print').addEventListener('click', () => window.print());
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      const ready = () => { if (navigator.serviceWorker.controller) $('status').textContent = 'This page is available for offline revisits in this browser. You can also download a standalone copy.'; };
      ready(); navigator.serviceWorker.addEventListener('controllerchange', ready);
    }).catch(() => { /* Direct file use and restrictive hosts still support the standalone download. */ });
  }
  update();
})();
