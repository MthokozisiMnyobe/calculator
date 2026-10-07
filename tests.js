const assert = require('assert');
const T = require('./tax-engine.js');
const { calculators } = require('./calculators.js');

function near(actual, expected, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${expected}, got ${actual}`);
}

// 2027 personal tax bracket boundaries.
T.setYear(2027);
near(T.taxOnIncome(245100), 44118);
near(T.taxOnIncome(383100), 79998);
near(T.taxOnIncome(530200), 125599);
assert.equal(T.taxThresholdFor(40), 99000);
assert.equal(T.taxThresholdFor(67), 153250);
assert.equal(T.taxThresholdFor(78), 171300);
near(T.uifMonthly(50000), 177.12);
near(T.transferDuty(1210000), 0);
near(T.transferDuty(1663800), 13614);
near(T.table(T.CONFIG.turnoverTax, 1200000), 8500);

// TaxTim/SARS-style worked salary example: age 40, R30k pm, no other deductions.
const salary = T.calcSalaryTax({ salary: 30000, frequency: 'monthly', age: 40, medicalMembers: 0, retirement: 0, travelAllowance: 0 });
near(salary.incomeTax, 56172);
near(salary.uifAnnual, 2125.44);
near(salary.netPerPeriod, 25141.88, 0.1);

// 2026 table still available for the current filing return.
T.setYear(2026);
near(T.taxOnIncome(237100), 42678);
near(T.taxOnIncome(370500), 77362);
assert.equal(T.CONFIG.tfsa.annual, 36000);
assert.equal(T.CONFIG.retirement.annualCap, 350000);

// All calculators should execute with representative field values without throwing.
for (const year of [2026, 2027]) {
  T.setYear(year);
  for (const calc of calculators) {
    const values = {};
    for (const field of calc.fields) {
      if (field.type === 'select') values[field.id] = field.options?.[0]?.[0] ?? '';
      else if (field.type === 'checkbox') values[field.id] = false;
      else if (field.default !== undefined) values[field.id] = field.default;
      else values[field.id] = field.required ? 100000 : 0;
    }
    // Avoid deliberately inconsistent representative inputs.
    if (calc.id === 'travel-deduction') { values.allowance = 60000; values.value = 350000; values.total = 20000; values.biz = 8000; values.income = 500000; }
    if (calc.id === 'home-office') { values.office = 12; values.home = 120; values.income = 500000; values.comm = true; }
    if (calc.id === 'rental-income') { values.rent = 10000; values.months = 12; values.share = 100; values.income = 400000; }
    if (calc.id === 'capital-gains') { values.proceeds = 800000; values.base = 500000; values.income = 400000; }
    if (calc.id === 'tfsa') { values.monthly = 3000; values.years = 5; values.ret = 8; }
    if (calc.id === 'retrenchment') { values.weekly = 5000; values.years = 5; values.income = 400000; }
    if (calc.id === 'provisional-check') { values.other = 'yes'; values.amount = 100000; }
    assert.doesNotThrow(() => calc.calc(values), `${calc.id} threw for ${year}`);
  }
}

console.log('All SML Joka tax prototype regression checks passed.');
