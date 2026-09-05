# Taxman API v1.0.0

All calculations run offline. No HTTP calculation endpoint or API key is required. All monetary inputs and `annual` outputs are GBP **per year**. Monthly and weekly results are annual averages. Rules verified 2026-09-05 for explicitly selected tax years; do not substitute them for later years.

```js
// Node CommonJS (distribution):
const Taxman = require('./engine.js');
// Browser: the standalone page exposes window.Taxman.
const result = Taxman.calculate({
  year: '2026/27', country: 'england', incomeType: 'employed',
  income: 60000, pensionMethod: 'salary-sacrifice', pension: 6000,
  studentPlans: ['2'], postgraduate: false
});
const comparison = Taxman.compare(result.input, {
  pensionMethod: 'salary-sacrifice', pension: 10000
});
```

## Inputs

All fields are optional; defaults below. Unknown keys, unsupported enums, duplicate loan plans, non-finite amounts, strings in numeric fields and negative numbers are rejected. Invalid input throws, with no partial result. Do not silently translate unsupported income types into employment.

| Field | Default | Meaning |
|---|---|---|
| year | `2026/27` | `2025/26` or `2026/27` |
| country | `england` | `england`, `scotland`, `wales`, `northern-ireland`; tax residence |
| incomeType | `employed` | `employed`, `self-employed`, `pension`; one source only |
| income | `50000` | Gross salary before contributions, sole-trader taxable profit after expenses, or taxable pension income excluding tax-free amounts |
| pensionMethod | `none` | `none`, `salary-sacrifice`, `net-pay`, `relief-at-source` |
| pensionInputMode | `amount` | `amount` uses `pension`; `percentage` derives gross `pension` as `income × pensionPercentage ÷ 100` |
| pensionPercentage | `0` | 0–100 percentage of entered income, used when `pensionInputMode: "percentage"` |
| pension | `0` | Gross annual contribution; for RAS, £4,000 paid personally = £5,000 input |
| employerPension | `0` | Separate annual employer contribution, excluding salary sacrifice and NI sharing |
| employerNIShare | `0` | 0–100 percentage of employer NI savings added to pension; only used when salary sacrifice applies |
| studentPlans | `[]` | Unique strings from `1`, `2`, `4`, `5`; minimum active threshold applies once at 9% |
| postgraduate | `false` | Separate 6% postgraduate deduction |
| niExempt | `false` | State Pension age throughout employment year, or before tax-year start for Class 4; not other special NI categories |
| voluntaryClass2 | `false` | Sole traders only: add 52 weeks of Class 2 if below the year's small profits threshold and not exempt |
| hoursPerWeek | `37.5` | Above 0 up to 100; annual minimum-wage indication for salary sacrifice, assumes age 21+ and 52 paid weeks |

Amounts have a £10 million upper bound. Personal contributions require age under 75 and relief eligibility. Net pay and salary sacrifice require employment; pension-income mode does not accept new contributions. Employer contributions require employment. `none` requires `pension: 0`. Gross RAS contributions cannot exceed max(£3,600, relevant earnings); other contributions cannot exceed salary. Contribution allowances may impose additional tax charges, which are flagged but not calculated.

Input shape is also in `input.schema.json`. The engine enforces cross-field constraints beyond the base schema.

## Output

`calculate()` returns `version`, `rulesVerified`, normalized `input`, `basis: "annual-estimate"`, `currency`, `annual`, `averages`, `taxBands`, `warnings`, and `assumptions`. Read warnings and assumptions before presenting results as applicable to a person.

`annual.takeHome` is gross income minus Income Tax, NI, loans and pension cash cost (including salary sacrificed). RAS take-home includes additional claimable relief; `takeHomeBeforeReliefClaim` excludes it. This is an annual counterfactual, not a payroll calculation. The provider's basic relief goes into the pension, not take-home.

`annual.totalPension` includes gross personal/sacrificed contributions, employer contributions and reinvested employer NI. `pensionPaidFromCash` excludes salary sacrifice and excludes provider RAS relief. `taxAndNI` excludes loans and provider pension relief. `annualAllowance` is indicative, without carry-forward or MPAA. Band bounds are taxable-income amounts after Personal Allowance; `to: null` means unbounded. Tax bands remain present at zero income.

`compare(baseline, changes)` validates both scenarios and returns `before`, `after`, and `difference` (after minus before), plus `taxAndNISaved` (before minus after), `loanRepaymentsReduced`, and `additionalProviderRelief`. These separate real tax effects from deferred loan payments and pension savings. No automatic optimal decision is asserted.

`getRules()` returns a detached copy of bundled rates; modifying it does not affect the engine. `defaults` is the default input object. All calculations are deterministic and free of DOM, clock, network or storage dependencies.

## CLI

```sh
node cli.cjs --file input.json
node cli.cjs < input.json
node cli.cjs --help
```

Use a calculator input object, or `{"baseline": {"income": 60000}, "changes": {"pensionMethod": "salary-sacrifice", "pension": 6000}}`. Results go to stdout as JSON; failures return `{"error":"..."}` on stderr with exit code 1. For the source checkout, use `require('./src/engine.js')`; the distribution uses `require('./engine.js')`.

## Browser agents

Use labelled controls or invoke `window.Taxman.calculate` directly. Read the currently displayed result from `JSON.parse(document.getElementById('taxman-result').textContent)`: `{result, comparison}`. It is `null` when baseline input is invalid; `comparison` is null for an invalid alternative. It updates on input. Direct API calls return results without changing the UI. JSON exports have the same displayed-result envelope. The CLI accepts input objects, not export envelopes; pass the export's `result.input` to reproduce a result.
