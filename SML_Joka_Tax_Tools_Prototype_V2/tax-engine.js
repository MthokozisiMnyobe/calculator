/*
 * SML Joka SARS tax engine
 * ------------------------
 * Supported assessment years:
 *   2026 = 1 Mar 2025 – 28 Feb 2026
 *   2027 = 1 Mar 2026 – 28 Feb 2027
 *
 * Rates are centralised in YEAR_CONFIGS so annual maintenance is controlled.
 * Last reviewed: 6 October 2026 against SARS published rates/guides.
 */
(function () {
  const SHARED = {
    uif: { rate: 0.01, monthlyCeiling: 17712 },
    sdl: { rate: 0.01, annualPayrollThreshold: 500000 },
    interestExemption: { under65: 23800, over65: 34500 },
    foreignDividendExemptFraction: 25 / 45,
    dividendsTax: 0.20,
    companyRate: 0.27,
    companyCar: { rate: 0.035, rateWithPlan: 0.0325 },
    lumpRetirement: [
      { upTo: 550000, base: 0, rate: 0, from: 0 },
      { upTo: 770000, base: 0, rate: 0.18, from: 550000 },
      { upTo: 1155000, base: 39600, rate: 0.27, from: 770000 },
      { upTo: Infinity, base: 143550, rate: 0.36, from: 1155000 },
    ],
    lumpWithdrawal: [
      { upTo: 27500, base: 0, rate: 0, from: 0 },
      { upTo: 726000, base: 0, rate: 0.18, from: 27500 },
      { upTo: 1089000, base: 125730, rate: 0.27, from: 726000 },
      { upTo: Infinity, base: 223740, rate: 0.36, from: 1089000 },
    ],
    twoPot: { savingsShare: 1 / 3, minWithdrawal: 2000 },
    transferDuty: [
      { upTo: 1210000, base: 0, rate: 0, from: 0 },
      { upTo: 1663800, base: 0, rate: 0.03, from: 1210000 },
      { upTo: 2329300, base: 13614, rate: 0.06, from: 1663800 },
      { upTo: 2994800, base: 53544, rate: 0.08, from: 2329300 },
      { upTo: 13310000, base: 106784, rate: 0.11, from: 2994800 },
      { upTo: Infinity, base: 1241456, rate: 0.13, from: 13310000 },
    ],
    transferDutyEffective: "1 April 2025",
    vatRate: 0.15,
  };

  const YEAR_CONFIGS = {
    2026: {
      taxYear: 2026,
      yearLabel: "2026",
      periodLabel: "1 Mar 2025 – 28 Feb 2026",
      filingLabel: "2026 filing season",
      brackets: [
        { upTo: 237100, base: 0, rate: 0.18, from: 0 },
        { upTo: 370500, base: 42678, rate: 0.26, from: 237100 },
        { upTo: 512800, base: 77362, rate: 0.31, from: 370500 },
        { upTo: 673000, base: 121475, rate: 0.36, from: 512800 },
        { upTo: 857900, base: 179147, rate: 0.39, from: 673000 },
        { upTo: 1817000, base: 251258, rate: 0.41, from: 857900 },
        { upTo: Infinity, base: 644489, rate: 0.45, from: 1817000 },
      ],
      rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
      thresholds: { under65: 95750, age65: 148217, age75: 165689 },
      medicalCredit: { firstTwo: 364, additional: 246 },
      metc: { under65Pct: 0.25, over65Pct: 1 / 3, under65Multiple: 4, over65Multiple: 3, incomePct: 0.075 },
      retirement: { pct: 0.275, annualCap: 350000 },
      travelTaxablePct: 0.8,
      cgt: {
        annualExclusion: 40000,
        primaryResidence: 2000000,
        deathExclusion: 300000,
        inclusion: { individual: 0.40, company: 0.80, trust: 0.80 },
        topRate: { individual: 0.45, company: 0.27, trust: 0.45 },
      },
      tfsa: { annual: 36000, lifetime: 500000, penalty: 0.40 },
      donations: { exemptIndividual: 100000, lowRate: 0.20, highRate: 0.25, highAbove: 30000000 },
      perKmRate: 4.76,
      travelTable: [
        { upTo: 100000, fixed: 33940, fuel: 146.7, maint: 47.4 },
        { upTo: 200000, fixed: 60688, fuel: 163.8, maint: 59.3 },
        { upTo: 300000, fixed: 87497, fuel: 177.9, maint: 65.4 },
        { upTo: 400000, fixed: 111273, fuel: 191.4, maint: 71.4 },
        { upTo: 500000, fixed: 135048, fuel: 204.8, maint: 83.9 },
        { upTo: 600000, fixed: 159934, fuel: 234.9, maint: 98.5 },
        { upTo: 700000, fixed: 184867, fuel: 238.9, maint: 110.5 },
        { upTo: 800000, fixed: 211121, fuel: 242.9, maint: 122.5 },
        { upTo: Infinity, fixed: 211121, fuel: 242.9, maint: 122.5 },
      ],
      sbc: [
        { upTo: 95750, base: 0, rate: 0, from: 0 },
        { upTo: 365000, base: 0, rate: 0.07, from: 95750 },
        { upTo: 550000, base: 18848, rate: 0.21, from: 365000 },
        { upTo: Infinity, base: 57698, rate: 0.27, from: 550000 },
      ],
      turnoverTax: [
        { upTo: 335000, base: 0, rate: 0, from: 0 },
        { upTo: 500000, base: 0, rate: 0.01, from: 335000 },
        { upTo: 750000, base: 1650, rate: 0.02, from: 500000 },
        { upTo: Infinity, base: 6650, rate: 0.03, from: 750000 },
      ],
      turnoverEligibility: 1000000,
      vatRegistration: { compulsory: 1000000, voluntary: 50000 },
    },
    2027: {
      taxYear: 2027,
      yearLabel: "2027",
      periodLabel: "1 Mar 2026 – 28 Feb 2027",
      filingLabel: "current 2027 tax year",
      brackets: [
        { upTo: 245100, base: 0, rate: 0.18, from: 0 },
        { upTo: 383100, base: 44118, rate: 0.26, from: 245100 },
        { upTo: 530200, base: 79998, rate: 0.31, from: 383100 },
        { upTo: 695800, base: 125599, rate: 0.36, from: 530200 },
        { upTo: 887000, base: 185215, rate: 0.39, from: 695800 },
        { upTo: 1878600, base: 259783, rate: 0.41, from: 887000 },
        { upTo: Infinity, base: 666339, rate: 0.45, from: 1878600 },
      ],
      rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
      thresholds: { under65: 99000, age65: 153250, age75: 171300 },
      medicalCredit: { firstTwo: 376, additional: 254 },
      metc: { under65Pct: 0.25, over65Pct: 1 / 3, under65Multiple: 4, over65Multiple: 3, incomePct: 0.075 },
      retirement: { pct: 0.275, annualCap: 430000 },
      travelTaxablePct: 0.8,
      cgt: {
        annualExclusion: 50000,
        primaryResidence: 3000000,
        deathExclusion: 440000,
        inclusion: { individual: 0.40, company: 0.80, trust: 0.80 },
        topRate: { individual: 0.45, company: 0.27, trust: 0.45 },
      },
      tfsa: { annual: 46000, lifetime: 500000, penalty: 0.40 },
      donations: { exemptIndividual: 150000, lowRate: 0.20, highRate: 0.25, highAbove: 30000000 },
      perKmRate: 4.95,
      travelTable: [
        { upTo: 115000, fixed: 38344, fuel: 132.9, maint: 49.1 },
        { upTo: 230000, fixed: 68487, fuel: 148.4, maint: 61.4 },
        { upTo: 345000, fixed: 98689, fuel: 161.2, maint: 67.8 },
        { upTo: 460000, fixed: 125393, fuel: 173.4, maint: 74.0 },
        { upTo: 575000, fixed: 152097, fuel: 185.5, maint: 86.9 },
        { upTo: 690000, fixed: 180078, fuel: 212.8, maint: 102.0 },
        { upTo: 805000, fixed: 208106, fuel: 216.5, maint: 114.5 },
        { upTo: 920000, fixed: 237679, fuel: 220.1, maint: 126.1 },
        { upTo: Infinity, fixed: 237679, fuel: 220.1, maint: 126.9 },
      ],
      sbc: [
        { upTo: 99000, base: 0, rate: 0, from: 0 },
        { upTo: 365000, base: 0, rate: 0.07, from: 99000 },
        { upTo: 550000, base: 18620, rate: 0.21, from: 365000 },
        { upTo: Infinity, base: 57470, rate: 0.27, from: 550000 },
      ],
      turnoverTax: [
        { upTo: 600000, base: 0, rate: 0, from: 0 },
        { upTo: 950000, base: 0, rate: 0.01, from: 600000 },
        { upTo: 1400000, base: 3500, rate: 0.02, from: 950000 },
        { upTo: Infinity, base: 12500, rate: 0.03, from: 1400000 },
      ],
      turnoverEligibility: 2300000,
      vatRegistration: { compulsory: 2300000, voluntary: 120000 },
    },
  };

  const CONFIG = {};

  function cloneConfig(obj) {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) out[key] = value.map((item) => ({ ...item }));
      else if (value && typeof value === "object") out[key] = { ...value };
      else out[key] = value;
    }
    return out;
  }

  function setYear(year) {
    const normalized = Number(year);
    const selected = YEAR_CONFIGS[normalized] || YEAR_CONFIGS[2027];
    for (const key of Object.keys(CONFIG)) delete CONFIG[key];
    Object.assign(CONFIG, cloneConfig(SHARED), cloneConfig(selected));
    return CONFIG;
  }

  setYear(2027);

  const PERIODS = { monthly: 12, weekly: 52, fortnightly: 26, annually: 1 };
  const n = (x) => (Number.isFinite(+x) ? +x : 0);

  function table(rows, x) {
    if (x <= 0) return 0;
    const b = rows.find((r) => x <= r.upTo) || rows[rows.length - 1];
    return b.base + (x - b.from) * b.rate;
  }

  const taxOnIncome = (t) => table(CONFIG.brackets, t);
  const marginalRate = (t) => (t <= 0 ? CONFIG.brackets[0].rate : (CONFIG.brackets.find((x) => t <= x.upTo) || CONFIG.brackets.at(-1)).rate);
  const bracketFor = (t) => CONFIG.brackets.find((x) => t <= x.upTo) || CONFIG.brackets.at(-1);

  function rebatesFor(age) {
    let r = CONFIG.rebates.primary;
    if (age >= 65) r += CONFIG.rebates.secondary;
    if (age >= 75) r += CONFIG.rebates.tertiary;
    return r;
  }

  const taxThresholdFor = (age) => age >= 75 ? CONFIG.thresholds.age75 : age >= 65 ? CONFIG.thresholds.age65 : CONFIG.thresholds.under65;
  const taxAfterRebates = (ti, age) => Math.max(0, taxOnIncome(ti) - rebatesFor(age || 35));
  const incrementalTax = (base, extra, age) => taxAfterRebates(base + extra, age) - taxAfterRebates(base, age);

  function mtcAnnual(members) {
    members = Math.max(0, Math.floor(members || 0));
    const m = CONFIG.medicalCredit;
    return (Math.min(members, 2) * m.firstTwo + Math.max(0, members - 2) * m.additional) * 12;
  }

  function metc({ age, disability, contributions, oop, taxableIncome, members }) {
    const mtc = mtcAnnual(members);
    const senior = age >= 65 || disability;
    const cfg = CONFIG.metc;
    if (senior) {
      const excess = Math.max(0, contributions - cfg.over65Multiple * mtc);
      return cfg.over65Pct * (excess + oop);
    }
    const excess = Math.max(0, contributions - cfg.under65Multiple * mtc);
    return Math.max(0, cfg.under65Pct * (excess + oop - cfg.incomePct * taxableIncome));
  }

  function retirementDeduction(contrib, remuneration, taxable) {
    const r = CONFIG.retirement;
    const limit = Math.min(r.pct * Math.max(remuneration, taxable || 0), r.annualCap);
    return { allowed: Math.min(contrib, limit), limit, excess: Math.max(0, contrib - limit) };
  }

  function calcSalaryTax(i) {
    const periods = PERIODS[i.frequency] || 12;
    const grossAnnual = n(i.salary) * periods;
    const travelAnnual = n(i.travelAllowance);
    const travelPct = Number.isFinite(+i.travelTaxablePct) ? Math.min(1, Math.max(0, +i.travelTaxablePct)) : CONFIG.travelTaxablePct;
    const remuneration = grossAnnual + travelAnnual * travelPct;
    const retContrib = n(i.retirement) * (i.retirementIsMonthly === false ? 1 : 12);
    const ret = retirementDeduction(retContrib, remuneration);
    const taxableIncome = Math.max(0, remuneration - ret.allowed);
    const taxBeforeRebates = taxOnIncome(taxableIncome);
    const rebates = rebatesFor(n(i.age) || 35);
    const medCredits = mtcAnnual(n(i.medicalMembers));
    const incomeTax = Math.max(0, taxBeforeRebates - rebates - medCredits);
    const uifAnnual = uifMonthly(grossAnnual / 12) * 12;
    const net = grossAnnual + travelAnnual - incomeTax - uifAnnual - retContrib;
    return {
      periods, grossAnnual, remuneration, retDeduction: ret.allowed, taxableIncome,
      taxBeforeRebates, rebates, medCredits, incomeTax, uifAnnual,
      netAnnual: net, netPerPeriod: net / periods,
      effectiveRate: grossAnnual > 0 ? incomeTax / grossAnnual : 0,
      marginal: marginalRate(taxableIncome), travelPct,
    };
  }

  function uifMonthly(monthlyGross) {
    return Math.min(Math.max(0, monthlyGross), CONFIG.uif.monthlyCeiling) * CONFIG.uif.rate;
  }

  function grossForNet(targetNetMonthly, opts) {
    let lo = 0, hi = 5000000;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      const r = calcSalaryTax({ ...opts, salary: mid, frequency: "monthly" });
      if (r.netPerPeriod < targetNetMonthly) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  const lumpTax = (kind, amount, prior) => {
    const t = kind === "withdrawal" ? CONFIG.lumpWithdrawal : CONFIG.lumpRetirement;
    return table(t, prior + amount) - table(t, prior);
  };

  function calcCgt(i) {
    const type = i.entity || "individual";
    let gain = n(i.proceeds) - n(i.baseCost) - n(i.costs);
    const raw = gain;
    let exclusionUsed = 0;
    if (i.primaryResidence && type === "individual") {
      const ex = Math.min(Math.max(gain, 0), CONFIG.cgt.primaryResidence * (n(i.residenceShare) || 100) / 100);
      exclusionUsed += ex;
      gain -= ex;
    }
    gain -= n(i.priorLoss);
    let annual = 0;
    if (type === "individual") {
      annual = Math.min(Math.max(gain, 0), CONFIG.cgt.annualExclusion);
      gain -= annual;
    }
    const netGain = gain;
    const inclusion = CONFIG.cgt.inclusion[type];
    const included = Math.max(0, netGain) * inclusion;
    let tax;
    if (type === "individual") tax = incrementalTax(n(i.otherIncome), included, n(i.age) || 35);
    else tax = included * CONFIG.cgt.topRate[type];
    return { rawGain: raw, exclusionUsed, annualExclusion: annual, netGain, inclusion, included, tax, effective: raw > 0 ? tax / raw : 0 };
  }

  function travelBand(value) {
    return CONFIG.travelTable.find((r) => value <= r.upTo) || CONFIG.travelTable.at(-1);
  }

  function calcTravel(i) {
    const total = Math.max(1, n(i.totalKm));
    const biz = Math.min(Math.max(0, n(i.businessKm)), total);
    const share = biz / total;
    const band = travelBand(n(i.vehicleValue));
    const tableFuel = i.employerPaysFuel ? 0 : band.fuel * biz / 100;
    const tableDed = band.fixed * share + tableFuel + band.maint * biz / 100;
    const actualDed = n(i.actualCosts) * share;
    const simplified = biz * CONFIG.perKmRate;
    return { share, band, tableDed, actualDed, simplified };
  }

  function transferDuty(value) {
    return table(CONFIG.transferDuty, value);
  }

  const api = {
    CONFIG, YEAR_CONFIGS, setYear, PERIODS, table, taxOnIncome, marginalRate, bracketFor,
    rebatesFor, taxThresholdFor, taxAfterRebates, incrementalTax, mtcAnnual, metc,
    retirementDeduction, calcSalaryTax, uifMonthly, grossForNet, lumpTax, calcCgt,
    calcTravel, transferDuty,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.TAX = api;
})();
