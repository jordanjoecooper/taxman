/* Taxman 1.0.0. Pure offline annual estimates. See SOURCES.md and API.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Taxman = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0';
  const VERIFIED = '2026-09-05';
  const RULES = {
    '2025/26': { scotland: [2827, 14921, 31092, 62430, 125140], loans: { '1': 26065, '2': 28470, '4': 32745, '5': null }, class2: 3.50, smallProfits: 6845, minimumWage: 12.21 },
    '2026/27': { scotland: [3967, 16956, 31092, 62430, 125140], loans: { '1': 26900, '2': 29385, '4': 33795, '5': 25000 }, class2: 3.65, smallProfits: 7105, minimumWage: 12.71 }
  };
  const DEFAULTS = Object.freeze({ year: '2026/27', country: 'england', incomeType: 'employed', income: 50000,
    pensionMethod: 'none', pensionInputMode: 'amount', pensionPercentage: 0, pension: 0, employerPension: 0, employerNIShare: 0,
    studentPlans: Object.freeze([]), postgraduate: false, niExempt: false, voluntaryClass2: false, hoursPerWeek: 37.5 });
  const assumptions = [
    'Annual estimate in GBP; monthly and weekly figures are annual averages, not payslip predictions. Payroll NI and loan rounding, bonuses and irregular pay can differ.',
    'One employment, sole-trader profit, or taxable pension income only. Full-year UK residence and standard Personal Allowance; no other income or tax-code adjustments.',
    'Excludes dividends, savings, capital gains, benefits in kind, Child Benefit charges, childcare/benefit eligibility, Gift Aid, marriage allowances, trading losses, payments on account and pension savings tax charges.',
    'Pension input is the gross annual contribution, including provider tax relief for relief at source. Assumes a registered defined-contribution scheme, eligibility for relief, and age under 75 for personal contributions.',
    'Relief-at-source take-home includes any additional Income Tax relief claimed from HMRC. This may arrive later than the payslip. Net-pay low-earner HMRC top-ups are not included.',
    'Student loans assume repayments are due throughout the tax year and the balance is not paid off during it; no interest or write-off forecast. Reduced repayments are cash-flow changes, not guaranteed lifetime savings.',
    'Annual allowance flags are indicative: carry-forward, defined-benefit accrual and the money purchase annual allowance are not modelled.'
  ];
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const positive = n => Math.max(0, n);
  const clone = x => JSON.parse(JSON.stringify(x));
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input must be a JSON object.');
    for (const key of Object.keys(input)) if (!Object.hasOwn(DEFAULTS, key)) throw new TypeError('Unknown field: ' + key);
    const x = { ...DEFAULTS, ...input };
    for (const [key, allowed] of Object.entries({year: Object.keys(RULES), country: ['england', 'scotland', 'wales', 'northern-ireland'], incomeType: ['employed', 'self-employed', 'pension'], pensionMethod: ['none', 'salary-sacrifice', 'net-pay', 'relief-at-source'], pensionInputMode: ['amount', 'percentage']})) {
      if (!allowed.includes(x[key])) throw new RangeError('Invalid ' + key + '. Expected: ' + allowed.join(', '));
    }
    for (const key of ['income', 'pension', 'pensionPercentage', 'employerPension', 'employerNIShare', 'hoursPerWeek']) {
      if (typeof x[key] !== 'number' || !Number.isFinite(x[key]) || x[key] < 0) throw new RangeError(key + ' must be a finite non-negative number.');
    }
    for (const key of ['income', 'pension', 'employerPension']) if (x[key] > 10000000) throw new RangeError(key + ' must be at most £10,000,000.');
    if (x.employerNIShare > 100) throw new RangeError('employerNIShare must be between 0 and 100.');
    if (x.pensionPercentage > 100) throw new RangeError('pensionPercentage must be between 0 and 100.');
    if (x.hoursPerWeek <= 0 || x.hoursPerWeek > 100) throw new RangeError('hoursPerWeek must be above 0 and at most 100.');
    for (const key of ['postgraduate', 'niExempt', 'voluntaryClass2']) if (typeof x[key] !== 'boolean') throw new TypeError(key + ' must be true or false.');
    if (!Array.isArray(x.studentPlans) || x.studentPlans.some(p => !['1','2','4','5'].includes(p)) || new Set(x.studentPlans).size !== x.studentPlans.length) throw new RangeError('studentPlans must contain unique strings from 1, 2, 4, 5.');
    if (x.pensionInputMode === 'percentage') {
      if (x.pensionMethod === 'none' && x.pensionPercentage !== 0) throw new RangeError('Choose a pension method for a non-zero contribution.');
      x.pension = round(x.income * x.pensionPercentage / 100);
    }
    if (x.pensionMethod === 'none' && x.pension !== 0) throw new RangeError('Choose a pension method for a non-zero contribution.');
    if (x.incomeType !== 'employed' && ['salary-sacrifice','net-pay'].includes(x.pensionMethod)) throw new RangeError('Salary sacrifice and net pay require employment.');
    if (x.incomeType !== 'employed' && (x.employerPension || x.employerNIShare)) throw new RangeError('Employer contributions require employment.');
    if (x.incomeType === 'pension' && x.pensionMethod !== 'none') throw new RangeError('Pension-income mode does not model new pension contributions.');
    if (x.incomeType !== 'self-employed' && x.voluntaryClass2) throw new RangeError('Voluntary Class 2 requires self-employment.');
    if (x.pension > (x.pensionMethod === 'relief-at-source' ? Math.max(3600, x.income) : x.income)) throw new RangeError('Contribution exceeds the supported earnings-based pension relief limit.');
    return { ...x, studentPlans: [...x.studentPlans] };
  }
  // Limits are cumulative TAXABLE income boundaries, not gross salary boundaries.
  // Relief at source extends the basic band; Scotland's starter width is unchanged.
  function incomeTax(income, allowance, country, rules, ras = 0) {
    const scot = country === 'scotland';
    const limits = scot ? [...rules.scotland, Infinity] : [37700, 125140, Infinity];
    const rates = scot ? [.19,.20,.21,.42,.45,.48] : [.20,.40,.45];
    const names = scot ? ['Starter','Basic','Intermediate','Higher','Advanced','Top'] : ['Basic','Higher','Additional'];
    const taxable = positive(income - allowance);
    let lower = 0;
    const bands = limits.map((limit, index) => {
      const upper = limit + (scot && index === 0 ? 0 : ras);
      const amount = positive(Math.min(taxable, upper) - lower);
      const row = { name: names[index], rate: rates[index], from: lower, to: Number.isFinite(upper) ? upper : null, amount: round(amount), tax: round(amount * rates[index]) };
      lower = upper;
      return row;
    });
    return { taxable: round(taxable), bands, total: round(bands.reduce((sum, b) => sum + b.tax, 0)) };
  }
  function calculate(input = {}) {
    const x = validate(input), r = RULES[x.year], warnings = [];
    const sacrifice = x.pensionMethod === 'salary-sacrifice' ? x.pension : 0;
    const netPay = x.pensionMethod === 'net-pay' ? x.pension : 0;
    const ras = x.pensionMethod === 'relief-at-source' ? x.pension : 0;
    const cashGross = x.income - sacrifice;
    const taxIncome = cashGross - netPay;
    const adjustedNetIncome = positive(taxIncome - ras);
    const personalAllowance = positive(12570 - positive(adjustedNetIncome - 100000) / 2);
    const tax = incomeTax(taxIncome, personalAllowance, x.country, r, ras);
    const noClaimTax = incomeTax(taxIncome, positive(12570 - positive(taxIncome - 100000) / 2), x.country, r).total;
    const additionalRelief = positive(noClaimTax - tax.total);
    const niBase = x.incomeType === 'employed' ? cashGross : x.income;
    const niMainRate = x.incomeType === 'self-employed' ? .06 : .08;
    const nationalInsurance = x.niExempt || x.incomeType === 'pension' ? 0 : round(positive(Math.min(niBase, 50270) - 12570) * niMainRate + positive(niBase - 50270) * .02);
    const class2 = x.incomeType === 'self-employed' && !x.niExempt && x.voluntaryClass2 && x.income < r.smallProfits ? round(r.class2 * 52) : 0;
    // Sole-trader SA pension deduction: SA110 notes K35/K37. PAYE uses NI earnings.
    const loanIncome = x.incomeType === 'self-employed' ? positive(x.income - ras) : cashGross;
    const activePlans = x.studentPlans.filter(p => r.loans[p] !== null);
    const loanThreshold = activePlans.length ? Math.min(...activePlans.map(p => r.loans[p])) : null;
    const studentLoan = loanThreshold === null ? 0 : round(positive(loanIncome - loanThreshold) * .09);
    const postgraduateLoan = x.postgraduate ? round(positive(loanIncome - 21000) * .06) : 0;
    const employerNISaving = round((positive(x.income - 5000) - positive(cashGross - 5000)) * .15);
    const employerNIReinvested = round(employerNISaving * x.employerNIShare / 100);
    const providerRelief = round(ras * .20);
    const pensionPaidFromCash = round(netPay + ras * .80);
    const totalPension = round(x.pension + x.employerPension + employerNIReinvested);
    const takeHome = round(cashGross - pensionPaidFromCash - tax.total - nationalInsurance - class2 - studentLoan - postgraduateLoan);
    const overallEffectiveTaxRate = x.income > 0 ? round((tax.total + nationalInsurance + class2 + studentLoan + postgraduateLoan) / x.income * 100) : 0;
    const marginalBlocks = [];
    const pa = personalAllowance;
    const taxEnds = x.country === 'scotland' ? r.scotland.map(n => n + pa) : [37700 + pa, 125140];
    const points = [...new Set([0, 100000, 125140, pa, ...taxEnds, loanThreshold, 21000].filter(n => Number.isFinite(n) && n > 0 && n < Math.max(x.income,125140)))].sort((a,b)=>a-b);
    const rateAt = gross => {
      let taxRate;
      if (gross <= 12570) taxRate = 0;
      else if (x.country === 'scotland') { let i=taxEnds.findIndex(end=>gross<=end); if(i<0)i=5; taxRate=[.19,.20,.21,.42,.45,.48][i]; }
      else taxRate = gross <= 50270 ? .20 : gross <= 125140 ? .40 : .45;
      if (gross > 100000 && gross <= 125140) taxRate += .20;
      const niRate = x.incomeType === 'pension' || x.niExempt ? 0 : gross <= 50270 ? (x.incomeType === 'self-employed' ? .06 : .08) : .02;
      return round((taxRate + niRate + (loanThreshold !== null && gross > loanThreshold ? .09 : 0) + (x.postgraduate && gross > 21000 ? .06 : 0)) * 100);
    };
    for (let i=0;i<points.length;i++) { const from=points[i], to=points[i+1] || Math.max(x.income,from); if(to>from) marginalBlocks.push({from,to,rate:rateAt((from+to)/2),label:from>=100000&&to<=125140?'Personal Allowance taper':'Marginal deductions'}); }
    const thresholdIncome = x.income - netPay - ras;
    const adjustedIncome = x.income + x.employerPension + employerNIReinvested;
    const annualAllowance = thresholdIncome > 200000 && adjustedIncome > 260000 ? Math.max(10000, 60000 - (adjustedIncome - 260000) / 2) : 60000;
    if (totalPension > annualAllowance) warnings.push('Pension contributions exceed the estimated annual allowance of £' + round(annualAllowance) + '. Results exclude any pension tax charge; carry-forward or other allowances may change this.');
    if (annualAllowance < 60000) warnings.push('A tapered pension annual allowance may apply. The estimate assumes modern salary-sacrifice arrangements and only the income entered.');
    if (sacrifice > 0 && cashGross < r.minimumWage * x.hoursPerWeek * 52) warnings.push('Salary sacrifice would put annual average pay below the age-21+ minimum-wage floor for these hours. This scenario may not be available; check each pay period with your employer.');
    if (sacrifice > 0) warnings.push('Salary sacrifice requires employer agreement. It can affect statutory pay and salary-linked benefits. Employer NI sharing is optional.');
    if (ras > 0 && additionalRelief > 0) warnings.push('Take-home includes £' + round(additionalRelief) + ' of additional annual pension tax relief, which you may need to claim from HMRC.');
    if (netPay > 0 && adjustedNetIncome < 12570) warnings.push('A low-earner net-pay pension top-up may be available from HMRC after the year. It is excluded here.');
    if (x.studentPlans.includes('5') && r.loans['5'] === null) warnings.push('Plan 5 repayments do not start until April 2026; no Plan 5 deduction for 2025/26.');
    if (x.niExempt) warnings.push(x.incomeType === 'self-employed' ? 'Class 4 exemption assumes State Pension age was reached before the start of this tax year.' : 'Employee NI exemption assumes State Pension age throughout the year.');
    if (x.incomeType === 'self-employed' && x.income < r.smallProfits && !x.voluntaryClass2 && !x.niExempt) warnings.push('Profits are below the Class 2 credit threshold. Consider whether voluntary Class 2 is needed for your NI record.');
    return { version: VERSION, rulesVerified: VERIFIED, input: x, basis: 'annual-estimate', currency: 'GBP',
      annual: { grossIncome: x.income, cashGross: round(cashGross), adjustedNetIncome: round(adjustedNetIncome), personalAllowance: round(personalAllowance), taxableIncome: tax.taxable,
        incomeTax: tax.total, nationalInsurance, class2, studentLoan, postgraduateLoan, loanIncome: round(loanIncome), loanThreshold,
        pensionContribution: x.pension, salarySacrifice: sacrifice, pensionPaidFromCash, providerRelief, additionalRelief: round(additionalRelief), employerPension: x.employerPension,
        employerNISaving, employerNIReinvested, totalPension, annualAllowance: round(annualAllowance), takeHome, takeHomeBeforeReliefClaim: round(takeHome - additionalRelief),
        taxAndNI: round(tax.total + nationalInsurance + class2), totalDeductions: round(x.income - takeHome), overallEffectiveTaxRate, marginalBlocks },
      averages: { monthlyTakeHome: round(takeHome / 12), weeklyTakeHome: round(takeHome / 52) },
      taxBands: tax.bands, warnings, assumptions: [...assumptions] };
  }
  function compare(baseline, changes) {
    const before = calculate(baseline), after = calculate({ ...before.input, ...changes });
    const difference = {};
    for (const key of ['takeHome','totalPension','incomeTax','nationalInsurance','class2','studentLoan','postgraduateLoan','adjustedNetIncome','providerRelief']) difference[key] = round(after.annual[key] - before.annual[key]);
    return { before, after, difference, taxAndNISaved: round(before.annual.taxAndNI - after.annual.taxAndNI),
      loanRepaymentsReduced: round(-difference.studentLoan - difference.postgraduateLoan),
      additionalProviderRelief: difference.providerRelief };
  }
  return Object.freeze({ version: VERSION, verified: VERIFIED, defaults: DEFAULTS, getRules: () => clone(RULES), calculate, compare });
});
