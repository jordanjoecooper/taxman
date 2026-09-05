'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/engine.js');
const annual = x => T.calculate(x).annual;
const near = (a,b) => assert.ok(Math.abs(a-b)<.021, `${a} != ${b}`);

test('England £50,000 fixture: £7,486 tax, £2,994.40 NI', () => {
  const a = annual({income:50000});
  assert.equal(a.incomeTax,7486); assert.equal(a.nationalInsurance,2994.4); assert.equal(a.takeHome,39519.6);
});
test('zero and allowance boundary', () => {
  for (const country of ['england','scotland','wales','northern-ireland']) {
    for (const income of [0,1,12570]) {
      const a=annual({income,country}); assert.equal(a.incomeTax,0); assert.equal(a.nationalInsurance,0); assert.equal(a.takeHome,income);
    }
  }
});
test('Welsh and Northern Irish rates match English rates across both years', () => {
  for (const year of ['2025/26','2026/27']) for (const income of [16000,45000,50270,100000,110000,125140,200000]) {
    const a=annual({year,income});
    for (const country of ['wales','northern-ireland']) assert.deepEqual(annual({year,income,country}),a);
  }
});
test('Scottish independent £50k fixtures for both years', () => {
  // 2025: 537.13 + 2418.80 + 3395.91 + 2661.96.
  // 2026: 753.73 + 2597.80 + 2968.56 + 2661.96.
  assert.equal(annual({year:'2025/26',country:'scotland',income:50000}).incomeTax,9013.8);
  assert.equal(annual({year:'2026/27',country:'scotland',income:50000}).incomeTax,8982.05);
});
test('Scottish published gross boundaries before taper', () => {
  const cases=[[16537,753.73],[29526,3351.53],[43662,6320.09],[75000,19482.05]];
  for (const [income,tax] of cases) assert.equal(annual({country:'scotland',income}).incomeTax,tax);
});
test('allowance taper and additional rate use taxable boundaries correctly', () => {
  const a=annual({income:110000}); assert.equal(a.personalAllowance,7570); assert.equal(a.incomeTax,33432);
  assert.equal(annual({income:125140}).personalAllowance,0);
  assert.equal(annual({income:125140}).incomeTax,42516);
  assert.equal(annual({income:150000}).incomeTax,53703);
  assert.equal(annual({country:'scotland',income:125140}).incomeTax,47701.55);
  assert.equal(annual({country:'scotland',income:150000}).incomeTax,59634.35);
});
test('£60k with £6k sacrifice, Plan 2 and postgrad independent fixture', () => {
  const a=annual({income:60000,pensionMethod:'salary-sacrifice',pension:6000,studentPlans:['2'],postgraduate:true});
  assert.equal(a.incomeTax,9032); assert.equal(a.nationalInsurance,3090.6);
  assert.equal(a.studentLoan,2215.35); assert.equal(a.postgraduateLoan,1980); assert.equal(a.takeHome,37682.05);
});
test('net pay and RAS have equal take-home above basic rate; sacrifice saves NI', () => {
  for (const country of ['england','scotland']) {
    const base={country,income:60000,pension:6000};
    const net=annual({...base,pensionMethod:'net-pay'}), ras=annual({...base,pensionMethod:'relief-at-source'}), ss=annual({...base,pensionMethod:'salary-sacrifice'});
    near(net.takeHome,ras.takeHome); assert.equal(ras.providerRelief,1200); near(ss.takeHome-net.takeHome,120);
    assert.equal(ras.additionalRelief,country==='scotland'?1320:1200);
  }
});
test('Scottish RAS preserves starter band and gives intermediate relief', () => {
  const result=T.calculate({country:'scotland',income:32000,pensionMethod:'relief-at-source',pension:2000});
  assert.equal(result.taxBands[0].to,3967); assert.equal(result.annual.additionalRelief,20);
  const low=annual({country:'scotland',income:15000,pensionMethod:'relief-at-source',pension:1000});
  assert.equal(low.additionalRelief,0); assert.equal(low.providerRelief,200); assert.equal(low.incomeTax,461.7);
});
test('allowance restoration by pension and RAS double-count prevention', () => {
  for(const country of ['england','scotland']) {
    const ss=annual({country,income:110000,pensionMethod:'salary-sacrifice',pension:10000});
    const ras=annual({country,income:110000,pensionMethod:'relief-at-source',pension:10000});
    assert.equal(ss.personalAllowance,12570); assert.equal(ras.personalAllowance,12570);
    near(ss.takeHome-ras.takeHome,200);
  }
  assert.equal(annual({income:110000,pensionMethod:'relief-at-source',pension:10000}).additionalRelief,4000);
});
test('self-employed Class 4, RAS and loan base use Self Assessment rules', () => {
  const a=annual({incomeType:'self-employed',income:60000,pensionMethod:'relief-at-source',pension:6000,studentPlans:['2']});
  assert.equal(a.nationalInsurance,2456.6); assert.equal(a.incomeTax,10232); assert.equal(a.loanIncome,54000); assert.equal(a.studentLoan,2215.35);
  assert.equal(annual({incomeType:'self-employed',income:50000}).nationalInsurance,2245.8);
});
test('net pay and RAS do not reduce PAYE loan earnings', () => {
  for (const pensionMethod of ['net-pay','relief-at-source']) assert.equal(annual({income:60000,pensionMethod,pension:6000,studentPlans:['2']}).studentLoan,2755.35);
});
test('all undergraduate plan thresholds, year change and postgraduate stacking', () => {
  const thresholds={'2025/26':{'1':26065,'2':28470,'4':32745},'2026/27':{'1':26900,'2':29385,'4':33795,'5':25000}};
  for (const [year,plans] of Object.entries(thresholds)) for (const [plan,income] of Object.entries(plans)) {
    assert.equal(annual({year,income,studentPlans:[plan]}).studentLoan,0);
    assert.equal(annual({year,income:income+1000,studentPlans:[plan]}).studentLoan,90);
  }
  const a=annual({income:40000,studentPlans:['1','2','4','5'],postgraduate:true});
  assert.equal(a.studentLoan,1350); assert.equal(a.postgraduateLoan,1140);
  assert.equal(annual({year:'2025/26',income:100000,studentPlans:['5']}).studentLoan,0);
  assert.equal(annual({year:'2025/26',income:40000,studentPlans:['4','5']}).studentLoan,652.95);
});
test('voluntary Class 2 only when needed; no compulsory Class 2', () => {
  assert.equal(annual({incomeType:'self-employed',income:6000,voluntaryClass2:true}).class2,189.8);
  assert.equal(annual({year:'2025/26',incomeType:'self-employed',income:6000,voluntaryClass2:true}).class2,182);
  assert.equal(annual({incomeType:'self-employed',income:7105,voluntaryClass2:true}).class2,0);
  assert.equal(annual({incomeType:'self-employed',income:30000}).class2,0);
});
test('pension income and NI exemptions', () => {
  const a=annual({incomeType:'pension',income:30000}); assert.equal(a.incomeTax,3486); assert.equal(a.nationalInsurance,0); assert.equal(a.takeHome,26514);
  for(const incomeType of ['employed','self-employed']) assert.equal(annual({incomeType,income:60000,niExempt:true}).nationalInsurance,0);
});
test('employer NI sharing is pension funding, not extra cash', () => {
  const base={income:60000,pensionMethod:'salary-sacrifice',pension:6000,employerPension:3000};
  const a=annual({...base,employerNIShare:100}), b=annual(base);
  assert.equal(a.employerNISaving,900); assert.equal(a.totalPension,9900); assert.equal(a.takeHome,b.takeHome);
  assert.equal(annual({income:6000,pensionMethod:'salary-sacrifice',pension:2000}).employerNISaving,150);
});
test('allowance flags, taper and minimum wage warnings', () => {
  const r=T.calculate({income:300000,pensionMethod:'salary-sacrifice',pension:60000});
  assert.equal(r.annual.annualAllowance,40000); assert.ok(r.warnings.some(x=>x.includes('exceed')));
  assert.equal(annual({income:400000,pensionMethod:'salary-sacrifice',pension:60000}).annualAllowance,10000);
  assert.ok(T.calculate({income:25000,pensionMethod:'salary-sacrifice',pension:5000}).warnings.some(x=>x.includes('minimum-wage')));
});
test('zero earnings RAS relief and cash cost', () => {
  const a=annual({income:0,pensionMethod:'relief-at-source',pension:3600}); assert.equal(a.takeHome,-2880); assert.equal(a.providerRelief,720);
});
test('comparison distinguishes pension from cash and loan reduction', () => {
  const c=T.compare({income:60000,pensionMethod:'net-pay',pension:6000,studentPlans:['2']},{pensionMethod:'salary-sacrifice'});
  assert.equal(c.difference.totalPension,0); assert.equal(c.difference.takeHome,660); assert.equal(c.taxAndNISaved,120); assert.equal(c.loanRepaymentsReduced,540);
});
test('strict validation prevents unsupported inputs', () => {
  for(const input of [null,[],{income:-1},{income:NaN},{income:Infinity},{income:'50000'},{income:null},{year:'2027/28'},{country:'uk'},{studentPlans:['3']},{studentPlans:['1','1']},{postgraduate:'false'},{pension:1},{incomeType:'self-employed',pensionMethod:'salary-sacrifice'},{incomeType:'pension',pensionMethod:'relief-at-source'},{income:10000,pension:10001,pensionMethod:'net-pay'},{employerNIShare:101},{hoursPerWeek:0},{unknown:0}]) assert.throws(()=>T.calculate(input));
});
test('all band edges are continuous, and cash reconciles across a broad income grid', () => {
  const edges=[12570,15397,16537,27491,29526,43662,50270,75000,100000,125140];
  for(const country of ['england','scotland']) for(const year of ['2025/26','2026/27']) {
    for(const edge of edges) { const b=annual({country,year,income:edge-.01}), a=annual({country,year,income:edge+.01}); assert.ok(Math.abs(a.takeHome-b.takeHome)<.1); }
    for(const income of [0,10000,25000,50000,60000,100000,110000,125140,200000,500000]) for(const pensionMethod of ['none','salary-sacrifice','net-pay','relief-at-source']) {
      const a=annual({country,year,income,pensionMethod,pension:pensionMethod==='none'?0:Math.min(5000,income),studentPlans:['2'],postgraduate:true});
      near(a.takeHome+a.incomeTax+a.nationalInsurance+a.class2+a.studentLoan+a.postgraduateLoan+a.salarySacrifice+a.pensionPaidFromCash,income);
      assert.ok(Number.isFinite(a.takeHome));
    }
  }
});
test('public input, rules and results cannot mutate future calculations', () => {
  const input={income:60000,studentPlans:['2']}, first=T.calculate(input);
  input.studentPlans.push('1'); assert.deepEqual(first.input.studentPlans,['2']);
  T.getRules()['2026/27'].scotland[0]=0;
  first.input.studentPlans.push('5'); assert.equal(annual({income:50000,country:'scotland'}).incomeTax,8982.05);
  assert.throws(()=>T.defaults.studentPlans.push('1'));
});
