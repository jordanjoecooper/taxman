# Rules and methodology

Checked **5 September 2026**. Bundled rules apply only to 2025/26 and 2026/27. Government numerical data is attributed below; no external request is needed to calculate. Links require a connection.

## Rates

[HMRC 2026/27 employer rates](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027) and [2025/26 employer rates](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026) supply employee/employer NI and loan thresholds, and regional Income Tax rates. Standard allowance is £12,570. England, Wales and Northern Ireland taxable-income boundaries: £37,700 and £125,140, rates 20%, 40%, 45%. These are **not gross salary boundaries**.

[Scottish Government bands](https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/) and [current Scottish rates](https://www.mygov.scot/scottish-income-tax/current-income-tax-rates) supply the Scottish rates (19%, 20%, 21%, 42%, 45%, 48%). Cumulative taxable-income boundaries are £2,827 / £14,921 / £31,092 / £62,430 / £125,140 for 2025/26, and £3,967 / £16,956 / £31,092 / £62,430 / £125,140 for 2026/27.

Category A employee NI is annualised at 8% between £12,570 and £50,270, then 2%. Ordinary employer NI is 15% above £5,000; employer exemptions and Employment Allowance are excluded. Employer NI sharing is an assumed employer decision. Minimum-wage indication uses the age-21+ rate (£12.21 / £12.71) multiplied by hours × 52; it is not a pay-period compliance check.

[Self-employed NI](https://www.gov.uk/self-employed-national-insurance-rates) and [2025/26 self-employment notes](https://assets.publishing.service.gov.uk/media/69c26565cfa346b9d4704b35/SA103F_Notes_2026.pdf): Class 4 is 6% in the main band and 2% above £50,270. Class 2 credits start at £6,845 / £7,105. Below this, voluntary contributions are modelled at £3.50 / £3.65 × 52 weeks. Compulsory Class 2 is not deducted.

## Pensions and allowance taper

[HMRC adjusted net income](https://www.gov.uk/guidance/adjusted-net-income) defines allowance tapering. Personal Allowance falls by £1 per £2 of adjusted net income above £100,000, reaching zero at £125,140. This engine supports only the selected income source and pension deductions.

[Pension relief](https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief), [HMRC RAS manual](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044220), and [Scottish RAS guidance](https://www.gov.uk/government/publications/pension-schemes-relief-at-source-for-scottish-income-tax-newsletter-february-2018/pension-schemes-relief-at-source-for-scottish-income-tax-newsletter-february-2018) explain relief methods. Salary sacrifice reduces cash salary, taxable income and NI earnings. Net pay reduces taxable income but not NI earnings. RAS uses an 80% personal payment plus 20% provider relief, lowers adjusted net income and extends the basic band. Scotland's starter width stays unchanged. The engine assumes additional personal tax relief is claimed, and reports it separately. Low-income RAS relief is retained; net-pay HMRC top-ups are excluded.

[Salary sacrifice guidance](https://www.gov.uk/guidance/salary-sacrifice-and-the-effects-on-paye) explains employer agreement, minimum wage and effects on benefits. [The announced 2029 reform](https://www.gov.uk/government/publications/salary-sacrifice-reform-for-pension-contributions-effective-from-6-april-2029/salary-sacrifice-reform-for-pension-contributions) does not apply to the included years.

[Annual allowance](https://www.gov.uk/tax-on-your-private-pension/annual-allowance) and [taper manual](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm057100): indicative £60,000 allowance, tapering where threshold income exceeds £200,000 and adjusted income exceeds £260,000, with a £10,000 floor. Pension savings tax charges, carry-forward, MPAA and defined-benefit accrual are excluded. Warnings are not an eligibility determination. For threshold-income estimates, sacrificed salary is added back (assumes a post-8-July-2015 arrangement).

## Student loans

HMRC employer tables above give Plan 1 / 2 / 4 annual thresholds of £26,065 / £28,470 / £32,745 in 2025/26 and £26,900 / £29,385 / £33,795 in 2026/27. Plan 5 starts in April 2026 at £25,000. Undergraduate repayments are 9% above the lowest active plan threshold, with an independent 6% postgraduate deduction above £21,000. Plan choice is independent of tax residence. No balance, interest or write-off prediction is made.

[HMRC student-loan employer guidance](https://www.gov.uk/guidance/special-rules-for-student-loans) governs PAYE loan earnings. This model uses NI earnings for employment, so only salary sacrifice reduces its loan base. [SA110 calculation notes, section 21, boxes K35–K37](https://www.gov.uk/government/publications/self-assessment-tax-calculation-summary-sa110) deduct gross personal pension contributions in the sole-trader Self Assessment calculation. Pension-income mode uses taxable pension income in the loan base, consistent with [repayment guidance](https://www.gov.uk/repaying-your-student-loan/how-you-repay). PAYE versus Self Assessment reconciliations for employees are outside scope. The 2026 SA110 notes contain an inconsistent Plan 4 figure; this engine uses the year's employer threshold table instead.

## Estimate boundaries

Income Tax is calculated annually with band components rounded to pennies. NI and loans use annual thresholds and are rounded to pennies, rather than payroll whole-pound loan deductions or pay-period NI. Monthly/weekly views divide the annual figure. A bonus, multiple jobs, midyear retirement, temporary employment, special NI categories, repayment start/stop dates or a custom tax code can change actual deductions.

This is not a complete tax-return engine. It excludes mixed employment/self-employment, dividends, savings, gains, benefits in kind, foreign income, Gift Aid, marriage allowances, Child Benefit charges, childcare entitlements, tax-free pension withdrawal calculations, trading losses, basis-period transition profit and payments on account. Self-employed income means already-calculated taxable profit, not turnover. Pension income means the taxable amount, with no assumption that an arbitrary withdrawal is 25% tax-free.

When percentage input is selected, the percentage applies to the entered annual salary, taxable sole-trader profit or pension income. It is converted to a gross annual pension amount before the same relief, NI and loan calculations; employer contributions remain separate.

Tax savings, loan-payment reductions and pension increases are distinct outputs. Extra contributions commonly reduce spendable cash. Switching an existing contribution to salary sacrifice may improve cash while preserving pension funding. Any pension limit warnings must be considered before using a scenario.
