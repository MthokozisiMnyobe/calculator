/*
 * Calculator definitions. Each calculator = fields + a calc() that returns
 * { headline:{label,value,sub}, rows:[[label,value]], notes:[...] }
 * The page (index.html) renders them generically.
 */
(function () {
  const T = typeof module !== "undefined" && module.exports ? require("./tax-engine.js") : window.TAX;
  const C = T.CONFIG;

  const zar = (x) => "R " + (Math.round((x || 0) * 100) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (x, d = 1) => ((x || 0) * 100).toFixed(d) + "%";
  const num = (x) => (isFinite(+x) ? +x : 0);

  const AGE = { id: "age", label: "Your age", type: "number", default: 35, min: 16, max: 110 };
  const INCOME = (label) => ({ id: "income", label: label || "Your other taxable income per year (R)", type: "number", hint: "Salary or other income before this item. Used to find your tax bracket." });
  const MEMBERS = { id: "members", label: "Medical aid members (you + dependants)", type: "number", default: 0, min: 0 };

  const CATEGORIES = ["Salary & Income", "Refunds & Deductions", "Investments & Savings", "Retirement", "Property", "Self-employed", "Business"];

  const calculators = [
    /* ---------------- SALARY & INCOME ---------------- */
    {
      id: "salary-tax", cat: "Salary & Income", title: "Salary Tax (PAYE)", popular: true,
      desc: "Work out PAYE, UIF and your take-home pay.",
      fields: [
        { id: "salary", label: "Gross salary before deductions (R)", type: "number", required: true },
        { id: "frequency", label: "How often are you paid?", type: "select", options: [["monthly", "Monthly"], ["fortnightly", "Every 2 weeks"], ["weekly", "Weekly"], ["annually", "Annually"]] },
        AGE, MEMBERS,
        { id: "retirement", label: "Retirement annuity / pension contribution (R per month)", type: "number" },
        { id: "travel", label: "Travel allowance (R per year)", type: "number", hint: "Enter the annual fixed travel allowance, if any." },
        { id: "travelpct", label: "Travel allowance included for PAYE", type: "select", options: [["0.8", "80% (usual rule)"], ["0.2", "20% (employer expects at least 80% business use)"]], hint: "This affects PAYE withholding only; the final deduction is determined from your actual business travel claim." },
      ],
      calc(v) {
        if (!(v.salary > 0)) return null;
        const r = T.calcSalaryTax({ salary: v.salary, frequency: v.frequency, age: v.age, medicalMembers: v.members, retirement: v.retirement, travelAllowance: v.travel, travelTaxablePct: Number(v.travelpct) });
        const per = { monthly: "month", fortnightly: "fortnight", weekly: "week", annually: "year" }[v.frequency];
        return {
          headline: { label: "Estimated take-home pay", value: zar(r.netPerPeriod), sub: "per " + per },
          rows: [
            ["Gross income (annual)", zar(r.grossAnnual)],
            ["Retirement deduction", zar(r.retDeduction)],
            ["Taxable income", zar(r.taxableIncome)],
            ["Tax before rebates", zar(r.taxBeforeRebates)],
            ["Rebates", "– " + zar(r.rebates)],
            ["Medical tax credits", "– " + zar(r.medCredits)],
            ["Income tax (PAYE) per year", zar(r.incomeTax)],
            ["PAYE per " + per, zar(r.incomeTax / r.periods)],
            ["UIF per " + per, zar(r.uifAnnual / r.periods)],
            ["Effective tax rate", pct(r.effectiveRate)],
            ["Marginal rate", pct(r.marginal, 0)],
          ],
        };
      },
    },
    {
      id: "tax-bracket", cat: "Salary & Income", title: "Tax Bracket Finder",
      desc: "See which SARS bracket your income falls in.",
      fields: [{ id: "ti", label: "Annual taxable income (R)", type: "number", required: true }, AGE],
      calc(v) {
        if (!(v.ti > 0)) return null;
        const b = T.bracketFor(v.ti), tax = T.taxOnIncome(v.ti), after = T.taxAfterRebates(v.ti, v.age);
        const rows = [
          ["Your bracket", zar(b.from + (b.from ? 1 : 0)) + (b.upTo === Infinity ? " and above" : " – " + zar(b.upTo))],
          ["Tax before rebates", zar(tax)], ["Rebates", "– " + zar(T.rebatesFor(v.age))],
          ["Tax payable", zar(after)], ["Tax-free threshold for your age", zar(T.taxThresholdFor(v.age))], ["Average rate", pct(after / v.ti)],
          ["Next R1,000 earned is taxed at", pct(b.rate, 0)],
        ];
        return { headline: { label: "Your marginal tax rate", value: pct(b.rate, 0) }, rows };
      },
    },
    {
      id: "hourly-to-salary", cat: "Salary & Income", title: "Hourly to Salary",
      desc: "Convert an hourly rate to a daily, weekly, monthly and yearly salary.",
      fields: [
        { id: "mode", label: "Convert", type: "select", options: [["h2s", "Hourly rate → salary"], ["s2h", "Monthly salary → hourly rate"]] },
        { id: "amount", label: "Hourly rate or monthly salary (R)", type: "number", required: true },
        { id: "hours", label: "Hours worked per week", type: "number", default: 40 },
        { id: "weeks", label: "Paid weeks per year", type: "number", default: 52 },
        AGE, MEMBERS,
        { id: "retirement", label: "Retirement contribution (R per month)", type: "number" },
      ],
      calc(v) {
        if (!(v.amount > 0) || !(v.hours > 0) || !(v.weeks > 0)) return null;
        const hourly = v.mode === "h2s" ? v.amount : (v.amount * 12) / (v.hours * v.weeks);
        const weekly = hourly * v.hours, annual = weekly * v.weeks, monthly = annual / 12;
        const tax = T.calcSalaryTax({ salary: monthly, frequency: "monthly", age: v.age, medicalMembers: v.members, retirement: v.retirement });
        return {
          headline: v.mode === "h2s" ? { label: "Estimated monthly take-home", value: zar(tax.netPerPeriod) } : { label: "Equivalent hourly rate", value: zar(hourly) },
          rows: [["Hourly gross", zar(hourly)], ["Daily gross (8h)", zar(hourly * 8)], ["Weekly gross", zar(weekly)], ["Monthly gross", zar(monthly)], ["Annual gross", zar(annual)], ["Estimated PAYE per month", zar(tax.incomeTax / 12)], ["UIF per month", zar(tax.uifAnnual / 12)], ["Estimated take-home per month", zar(tax.netPerPeriod)]],
          notes: ["Take-home is an estimate using the selected tax year and the assumptions entered above."],
        };
      },
    },
    {
      id: "net-to-gross", cat: "Salary & Income", title: "Net to Gross Salary",
      desc: "Find the gross salary needed to take home a target amount.",
      fields: [
        { id: "net", label: "Desired take-home pay per month (R)", type: "number", required: true },
        AGE, MEMBERS,
        { id: "ret", label: "Retirement contribution (R per month)", type: "number" },
      ],
      calc(v) {
        if (!(v.net > 0)) return null;
        const o = { age: v.age, medicalMembers: v.members, retirement: v.ret, retirementIsMonthly: true };
        const g = T.grossForNet(v.net, o), r = T.calcSalaryTax({ ...o, salary: g, frequency: "monthly" });
        return {
          headline: { label: "Gross salary needed", value: zar(g), sub: "per month" },
          rows: [["Gross per year", zar(g * 12)], ["PAYE per month", zar(r.incomeTax / 12)], ["UIF per month", zar(r.uifAnnual / 12)], ["Retirement per month", zar(v.ret)], ["Take-home per month", zar(r.netPerPeriod)]],
        };
      },
    },
    {
      id: "bonus-tax", cat: "Salary & Income", title: "Bonus Tax",
      desc: "How much of your bonus you actually keep.",
      fields: [
        { id: "bonus", label: "Bonus (gross, R)", type: "number", required: true },
        { id: "annual", label: "Regular annual salary (R)", type: "number", required: true },
        AGE,
      ],
      calc(v) {
        if (!(v.bonus > 0) || !(v.annual > 0)) return null;
        const tax = T.incrementalTax(v.annual, v.bonus, v.age);
        return {
          headline: { label: "Bonus you keep (after tax)", value: zar(v.bonus - tax) },
          rows: [["Tax on bonus", zar(tax)], ["Effective rate on bonus", pct(tax / v.bonus)], ["Your marginal rate", pct(T.marginalRate(v.annual + v.bonus), 0)]],
          notes: ["Uses the SARS approach: tax on (salary + bonus) minus tax on salary. Your employer may withhold slightly differently, but it settles at assessment."],
        };
      },
    },
    {
      id: "uif", cat: "Salary & Income", title: "UIF Calculator",
      desc: "Employee and employer UIF contributions.",
      fields: [{ id: "gross", label: "Gross monthly salary (R)", type: "number", required: true }],
      calc(v) {
        if (!(v.gross > 0)) return null;
        const u = T.uifMonthly(v.gross);
        return {
          headline: { label: "UIF deducted from you", value: zar(u), sub: "per month" },
          rows: [["Employee (1%)", zar(u)], ["Employer (1%)", zar(u)], ["Total paid to UIF", zar(u * 2)], ["Monthly ceiling used", zar(C.uif.monthlyCeiling)]],
          notes: ["UIF is 1% for the employee and 1% for the employer, subject to the current monthly remuneration ceiling."],
        };
      },
    },
    {
      id: "taxable-interest", cat: "Investments & Savings", title: "Taxable Local Interest",
      desc: "Interest tax after the annual exemption.",
      fields: [{ id: "interest", label: "Local interest earned this year (R)", type: "number", required: true }, AGE, INCOME()],
      calc(v) {
        if (!(v.interest > 0)) return null;
        const ex = v.age >= 65 ? C.interestExemption.over65 : C.interestExemption.under65;
        const taxable = Math.max(0, v.interest - ex), tax = T.incrementalTax(v.income, taxable, v.age);
        return {
          headline: { label: "Tax on your interest", value: zar(tax) },
          rows: [["Interest earned", zar(v.interest)], ["Annual exemption", "– " + zar(Math.min(ex, v.interest))], ["Taxable interest", zar(taxable)], ["Tax rate applied", pct(T.marginalRate(v.income + taxable), 0)]],
        };
      },
    },
    {
      id: "foreign-dividends", cat: "Investments & Savings", title: "Foreign Dividends",
      desc: "Tax on dividends from foreign companies.",
      fields: [
        { id: "div", label: "Foreign dividends received (R)", type: "number", required: true },
        { id: "holding", label: "Your shareholding in the company", type: "select", options: [["small", "Less than 10%"], ["big", "10% or more (participation exemption may apply)"]] },
        { id: "fwt", label: "Foreign tax already withheld (R)", type: "number" },
        AGE, INCOME(),
      ],
      calc(v) {
        if (!(v.div > 0)) return null;
        if (v.holding === "big") return { headline: { label: "SA tax", value: zar(0) }, rows: [["Foreign dividends", zar(v.div)]], notes: ["A 10%+ holding in a foreign company may qualify for the participation exemption (fully exempt). Confirm with your accountant."] };
        const taxable = v.div * (1 - C.foreignDividendExemptFraction);
        const gross = T.incrementalTax(v.income, taxable, v.age);
        const credit = Math.min(v.fwt, gross), tax = gross - credit;
        return {
          headline: { label: "SA tax on foreign dividends", value: zar(tax) },
          rows: [["Dividends", zar(v.div)], ["Exempt portion (25/45)", "– " + zar(v.div - taxable)], ["Taxable portion", zar(taxable)], ["Tax before credit", zar(gross)], ["Foreign tax credit", "– " + zar(credit)], ["Effective rate on dividend", pct(gross / v.div)]],
          notes: ["Effective SA rate is at most 20% for individuals."],
        };
      },
    },
    {
      id: "rental-income", cat: "Property", title: "Rental Income Tax",
      desc: "Tax on income from a rental property.",
      fields: [
        { id: "rent", label: "Rent received per month (R)", type: "number", required: true },
        { id: "months", label: "Months rented per year", type: "number", default: 12, max: 12 },
        { id: "interest", label: "Bond interest per year (R)", type: "number" },
        { id: "levies", label: "Rates, levies & insurance per year (R)", type: "number" },
        { id: "repairs", label: "Repairs, agent fees & other per year (R)", type: "number" },
        { id: "share", label: "Your ownership share (%)", type: "number", default: 100 },
        AGE, INCOME("Your other taxable income per year (R)"),
      ],
      calc(v) {
        if (!(v.rent > 0)) return null;
        const s = v.share / 100, gross = v.rent * v.months * s, exp = (v.interest + v.levies + v.repairs) * s, net = gross - exp;
        const tax = net > 0 ? T.incrementalTax(v.income, net, v.age) : 0;
        return {
          headline: { label: "Tax on rental income", value: zar(tax), sub: "per year" },
          rows: [["Your share of rent", zar(gross)], ["Your share of expenses", "– " + zar(exp)], ["Net rental income", zar(net)], ["Tax per month", zar(tax / 12)], ["Rate applied", pct(T.marginalRate(v.income + Math.max(net, 0)), 0)]],
          notes: ["A rental loss can be set off against other income unless ring-fenced. Bond capital repayments are not deductible. Provisional tax may apply."],
        };
      },
    },
    {
      id: "company-car", cat: "Salary & Income", title: "Company Car Tax",
      desc: "Fringe-benefit tax on a company car.",
      fields: [
        { id: "value", label: "Vehicle determined value incl. VAT (R)", type: "number", required: true },
        { id: "plan", label: "Includes a maintenance plan at purchase?", type: "select", options: [["no", "No (3.5%)"], ["yes", "Yes (3.25%)"]] },
        { id: "contrib", label: "Your monthly contribution to the employer (R)", type: "number" },
        AGE, INCOME("Your annual salary (R)"),
      ],
      calc(v) {
        if (!(v.value > 0)) return null;
        const rate = v.plan === "yes" ? C.companyCar.rateWithPlan : C.companyCar.rate;
        const benefit = Math.max(0, v.value * rate - v.contrib), annual = benefit * 12;
        const tax = T.incrementalTax(v.income, annual, v.age);
        return {
          headline: { label: "Extra tax per month", value: zar(tax / 12) },
          rows: [["Taxable benefit per month", zar(benefit)], ["Taxable benefit per year", zar(annual)], ["Extra tax per year", zar(tax)], ["PAYE inclusion (80% of benefit)", zar(benefit * 0.8)]],
          notes: ["Employer pays 80% inclusion on PAYE unless 80%+ business use is confirmed (then 20%). Reductions for paying your own fuel/licence are not modelled."],
        };
      },
    },

    /* ---------------- REFUNDS & DEDUCTIONS ---------------- */
    {
      id: "tax-refund", cat: "Refunds & Deductions", title: "Tax Refund", popular: true,
      desc: "Estimate your refund (or amount owed) when you file.",
      fields: [
        { id: "income", label: "Total taxable income for the year (R)", type: "number", required: true },
        { id: "paye", label: "PAYE already paid (from IRP5, R)", type: "number", required: true },
        { id: "ra", label: "Retirement annuity contributions (R per year)", type: "number" },
        { id: "don", label: "Section 18A donations (R)", type: "number" },
        { id: "home", label: "Other deductions (travel, home office, etc., R)", type: "number" },
        AGE, MEMBERS,
        { id: "contrib", label: "Medical scheme contributions paid by you (R per year)", type: "number" },
        { id: "oop", label: "Out-of-pocket medical expenses (R per year)", type: "number" },
        { id: "dis", label: "You or a dependant has a disability", type: "checkbox" },
      ],
      calc(v) {
        if (!(v.income > 0)) return null;
        const ra = T.retirementDeduction(v.ra, v.income, v.income).allowed;
        const donations = Math.min(v.don, 0.10 * v.income);
        const ti = Math.max(0, v.income - ra - donations - v.home);
        const before = T.taxOnIncome(ti), reb = T.rebatesFor(v.age), mtc = T.mtcAnnual(v.members);
        const mt = T.metc({ age: v.age, disability: v.dis, contributions: v.contrib, oop: v.oop, taxableIncome: ti, members: v.members });
        const liability = Math.max(0, before - reb - mtc - mt), result = v.paye - liability;
        return {
          headline: { label: result >= 0 ? "Estimated refund" : "Estimated amount you owe", value: zar(Math.abs(result)) },
          rows: [["Taxable income", zar(ti)], ["Tax before rebates", zar(before)], ["Rebates", "– " + zar(reb)], ["Medical scheme fees credit", "– " + zar(mtc)], ["Additional medical expenses credit", "– " + zar(mt)], ["Tax liability", zar(liability)], ["PAYE already paid", zar(v.paye)]],
          notes: ["Estimate only. SARS' final assessment can differ."],
        };
      },
    },
    {
      id: "medical-credits", cat: "Refunds & Deductions", title: "Medical Aid Credits", popular: true,
      desc: "See how medical tax credits reduce your tax.",
      fields: [
        MEMBERS, AGE,
        { id: "contrib", label: "Medical scheme contributions paid by you (R per month)", type: "number" },
        { id: "oop", label: "Out-of-pocket medical expenses (R per year)", type: "number" },
        { id: "ti", label: "Taxable income (R per year)", type: "number", required: true },
        { id: "dis", label: "You or a dependant has a disability", type: "checkbox" },
      ],
      calc(v) {
        if (!(v.ti > 0)) return null;
        const mtc = T.mtcAnnual(v.members);
        const mt = T.metc({ age: v.age, disability: v.dis, contributions: v.contrib * 12, oop: v.oop, taxableIncome: v.ti, members: v.members });
        return {
          headline: { label: "Total medical tax credits", value: zar(mtc + mt), sub: "per year" },
          rows: [["Medical scheme fees credit", zar(mtc)], ["  per month", zar(mtc / 12)], ["Additional expenses credit", zar(mt)]],
          notes: ["Credits reduce your tax directly (rand for rand), and are not deductions from income."],
        };
      },
    },
    {
      id: "travel-deduction", cat: "Refunds & Deductions", title: "Travel Deduction", popular: true,
      desc: "Compare methods to claim your business travel.",
      fields: [
        { id: "allowance", label: "Travel allowance received (R per year)", type: "number", required: true },
        { id: "value", label: "Vehicle value incl. VAT (R)", type: "number", required: true },
        { id: "total", label: "Total km driven (logbook)", type: "number", required: true },
        { id: "biz", label: "Business km (logbook)", type: "number", required: true },
        { id: "actual", label: "Actual running costs for the year (R)", type: "number", hint: "Fuel, service, insurance, licence, finance, depreciation." },
        { id: "fuel", label: "Does your employer pay for fuel?", type: "select", options: [["no", "No"], ["yes", "Yes"]] },
        AGE, INCOME("Your annual salary (R)"),
      ],
      calc(v) {
        if (!(v.value > 0) || !(v.total > 0)) return null;
        const t = T.calcTravel({ vehicleValue: v.value, totalKm: v.total, businessKm: v.biz, actualCosts: v.actual, employerPaysFuel: v.fuel === "yes" });
        const best = Math.max(t.tableDed, t.actualDed);
        const claim = Math.min(best, v.allowance);
        const taxable = Math.max(0, v.allowance - claim);
        const baseTax = T.taxAfterRebates(v.income + v.allowance, v.age);
        const saving = baseTax - T.taxAfterRebates(v.income + taxable, v.age);
        return {
          headline: { label: "Best deduction you can claim", value: zar(claim) },
          rows: [["Business use", pct(t.share)], ["SARS table method", zar(t.tableDed)], ["Actual-cost method", zar(t.actualDed)], ["Simplified R4.95/km (reimbursements)", zar(t.simplified)], ["Allowance still taxable", zar(taxable)], ["Estimated tax saved", zar(saving)]],
          notes: ["A deduction can't exceed the allowance received. A logbook is required. The simplified rate applies only to reimbursements, not allowances."],
        };
      },
    },
    {
      id: "home-office", cat: "Refunds & Deductions", title: "Home Office",
      desc: "Estimate your home-office deduction.",
      fields: [
        { id: "office", label: "Office floor area (m²)", type: "number", required: true },
        { id: "home", label: "Total home floor area (m²)", type: "number", required: true },
        { id: "rent", label: "Rent or bond interest (R per month)", type: "number" },
        { id: "rates", label: "Rates, levies & insurance (R per month)", type: "number" },
        { id: "utilities", label: "Electricity, water, cleaning, internet share (R per month)", type: "number" },
        { id: "comm", label: "You earn more than 50% of your income as commission", type: "checkbox" },
        AGE, INCOME("Your annual income (R)"),
      ],
      calc(v) {
        if (!(v.office > 0) || !(v.home > 0)) return null;
        const ratio = Math.min(1, v.office / v.home), annual = (v.rent + v.rates + v.utilities) * 12 * ratio;
        const eligible = v.comm;
        const saving = eligible ? T.taxAfterRebates(v.income, v.age) - T.taxAfterRebates(Math.max(0, v.income - annual), v.age) : 0;
        return {
          headline: { label: "Potential deduction per year", value: zar(annual) },
          rows: [["Office share of home", pct(ratio)], ["Deduction per month", zar(annual / 12)], ["Estimated tax saving", zar(saving)]],
          notes: [eligible ? "Room must be regularly and exclusively used for work and specially equipped. Bond capital repayments are not deductible." : "Salaried employees generally don't qualify. The claim is for commission earners (50%+ of income) and the self-employed."],
        };
      },
    },
    {
      id: "wear-and-tear", cat: "Refunds & Deductions", title: "Wear and Tear",
      desc: "Annual allowance on equipment you use for work.",
      fields: [
        { id: "cost", label: "Cost of the asset (R)", type: "number", required: true },
        { id: "life", label: "Useful life (years)", type: "number", default: 5, hint: "E.g. laptop 3, furniture 6, vehicle 5." },
        { id: "months", label: "Months used in the first year", type: "number", default: 12, max: 12 },
        { id: "biz", label: "Business use (%)", type: "number", default: 100 },
      ],
      calc(v) {
        if (!(v.cost > 0) || !(v.life > 0)) return null;
        const small = v.cost <= 7000, base = v.cost * v.biz / 100, yr = small ? base : base / v.life;
        const first = small ? base : yr * v.months / 12;
        return {
          headline: { label: "First-year allowance", value: zar(first) },
          rows: [["Full-year allowance", zar(yr)], ["Business portion of cost", zar(base)], ["Method", small ? "Full write-off (asset R7,000 or less)" : "Straight-line over " + v.life + " years"]],
          notes: ["Only for assets used to earn taxable business income. Accelerated allowances (s12B, s12E) may apply to some assets."],
        };
      },
    },
    {
      id: "donations-tax", cat: "Refunds & Deductions", title: "Donations Tax",
      desc: "Tax on donations to family and others.",
      fields: [
        { id: "don", label: "Donations this tax year (R)", type: "number", required: true },
        { id: "prior", label: "Taxable donations made in earlier years (R)", type: "number" },
      ],
      calc(v) {
        if (!(v.don > 0)) return null;
        const taxable = Math.max(0, v.don - C.donations.exemptIndividual), d = C.donations;
        const low = Math.max(0, Math.min(v.prior + taxable, d.highAbove) - v.prior);
        const high = Math.max(0, taxable - low), tax = low * d.lowRate + high * d.highRate;
        return {
          headline: { label: "Donations tax payable", value: zar(tax) },
          rows: [["Donations", zar(v.don)], ["Annual exemption", "– " + zar(Math.min(v.don, d.exemptIndividual))], ["Taxable donations", zar(taxable)]],
          notes: ["Donations to a spouse, approved PBOs and some others are exempt. SARS states donations tax is generally due by the end of the month following the month in which the donation takes effect."],
        };
      },
    },

    /* ---------------- INVESTMENTS & SAVINGS ---------------- */
    {
      id: "capital-gains", cat: "Investments & Savings", title: "Capital Gains Tax", popular: true,
      desc: "Tax on selling an asset or property.",
      fields: [
        { id: "entity", label: "Who is selling?", type: "select", options: [["individual", "Individual"], ["company", "Company"], ["trust", "Trust"]] },
        { id: "proceeds", label: "Sale proceeds (R)", type: "number", required: true },
        { id: "base", label: "Purchase price / base cost (R)", type: "number", required: true },
        { id: "costs", label: "Improvements & selling costs (R)", type: "number" },
        { id: "res", label: "This is my primary residence", type: "checkbox" },
        { id: "loss", label: "Assessed capital loss brought forward (R)", type: "number" },
        AGE, INCOME("Your other taxable income per year (R)"),
      ],
      calc(v) {
        if (!(v.proceeds > 0)) return null;
        const r = T.calcCgt({ entity: v.entity, proceeds: v.proceeds, baseCost: v.base, costs: v.costs, primaryResidence: v.res, priorLoss: v.loss, otherIncome: v.income, age: v.age });
        return {
          headline: { label: "Capital gains tax", value: zar(r.tax) },
          rows: [["Capital gain", zar(r.rawGain)], ["Primary residence exclusion", "– " + zar(r.exclusionUsed)], ["Annual exclusion", "– " + zar(r.annualExclusion)], ["Net gain", zar(r.netGain)], ["Inclusion rate", pct(r.inclusion, 0)], ["Included in taxable income", zar(r.included)], ["Effective rate on gain", pct(r.effective)]],
        };
      },
    },
    {
      id: "crypto-tax", cat: "Investments & Savings", title: "Crypto Tax",
      desc: "Income tax vs capital gains on crypto profits.",
      fields: [
        { id: "proceeds", label: "Total proceeds from selling/trading (R)", type: "number", required: true },
        { id: "cost", label: "Cost of that crypto (R)", type: "number", required: true },
        { id: "intent", label: "How do you treat it?", type: "select", options: [["capital", "Long-term investor (capital gain)"], ["income", "Active trader / short-term (income)"]] },
        AGE, INCOME("Your other taxable income per year (R)"),
      ],
      calc(v) {
        if (!(v.proceeds > 0)) return null;
        const profit = v.proceeds - v.cost;
        const incomeTax = profit > 0 ? T.incrementalTax(v.income, profit, v.age) : 0;
        const incl = Math.max(0, profit - C.cgt.annualExclusion) * C.cgt.inclusion.individual;
        const cgt = incl > 0 ? T.incrementalTax(v.income, incl, v.age) : 0;
        const tax = v.intent === "income" ? incomeTax : cgt;
        return {
          headline: { label: "Estimated tax", value: zar(tax) },
          rows: [["Profit", zar(profit)], ["Tax if treated as income", zar(incomeTax)], ["Tax if treated as capital gain", zar(cgt)]],
          notes: ["SARS treats crypto like any asset. Frequent trading usually means income. Keep full records of every transaction."],
        };
      },
    },
    {
      id: "tfsa", cat: "Investments & Savings", title: "TFSA Calculator",
      desc: "Plan tax-free savings within the annual and lifetime limits.",
      fields: [
        { id: "monthly", label: "Monthly contribution (R)", type: "number", required: true },
        { id: "years", label: "Years to invest", type: "number", default: 10 },
        { id: "ret", label: "Expected annual return (%)", type: "number", default: 9 },
        { id: "existing", label: "Already contributed to date (R)", type: "number" },
      ],
      calc(v) {
        if (!(v.monthly > 0)) return null;
        const t = C.tfsa; let contributed = v.existing, value = v.existing, over = 0, hit = false;
        const mr = Math.pow(1 + v.ret / 100, 1 / 12) - 1;
        for (let y = 0; y < v.years; y++) {
          let yr = 0;
          for (let m = 0; m < 12; m++) {
            let c = v.monthly;
            const room = Math.max(0, Math.min(t.annual - yr, t.lifetime - contributed));
            if (c > room) { over += c - room; c = room; hit = true; }
            yr += c; contributed += c; value = (value + c) * (1 + mr);
          }
        }
        return {
          headline: { label: "Tax-free value after " + v.years + " years", value: zar(value) },
          rows: [["Total contributed", zar(contributed)], ["Growth (tax-free)", zar(value - contributed)], ["Annual limit", zar(t.annual)], ["Lifetime limit", zar(t.lifetime)], ["Excess you could not contribute", zar(over)]],
          notes: [hit ? "Your plan exceeds a limit. Only the allowed amount is modelled. Over-contributing triggers a 40% penalty on the excess." : "Within limits."],
        };
      },
    },

    /* ---------------- RETIREMENT ---------------- */
    {
      id: "retirement-lump-sum", cat: "Retirement", title: "Retirement Lump Sum", popular: true,
      desc: "Tax on a retirement, death or severance lump sum.",
      fields: [
        { id: "kind", label: "Type of lump sum", type: "select", options: [["retire", "Retirement / death"], ["withdraw", "Withdrawal before retirement"]] },
        { id: "amount", label: "Lump sum (R)", type: "number", required: true },
        { id: "prior", label: "Previous lump sums taxed since 1 March 2009 (R)", type: "number" },
        { id: "free", label: "Tax-free portion (non-deductible contributions, R)", type: "number" },
      ],
      calc(v) {
        if (!(v.amount > 0)) return null;
        const taxable = Math.max(0, v.amount - v.free);
        const tax = T.lumpTax(v.kind === "withdraw" ? "withdrawal" : "retire", taxable, v.prior);
        return {
          headline: { label: "Tax on lump sum", value: zar(tax) },
          rows: [["Lump sum", zar(v.amount)], ["Taxable amount", zar(taxable)], ["You receive", zar(v.amount - tax)], ["Average tax rate", pct(tax / v.amount)]],
          notes: ["SARS aggregates all lump sums since 2009, so earlier amounts use up your tax-free bands."],
        };
      },
    },
    {
      id: "two-pot", cat: "Retirement", title: "Two-Pot Calculator", popular: true,
      desc: "Model a savings-pot withdrawal.",
      fields: [
        { id: "amount", label: "Savings-pot withdrawal (R)", type: "number", required: true },
        { id: "income", label: "Your taxable income per year (R)", type: "number", required: true },
        { id: "fee", label: "Administration fee charged (R)", type: "number" },
        AGE,
        { id: "contrib", label: "Monthly retirement contribution (R, optional)", type: "number", hint: "To see the split between pots." },
      ],
      calc(v) {
        if (!(v.amount > 0)) return null;
        const tax = T.incrementalTax(v.income, v.amount, v.age);
        const rows = [["Withdrawal", zar(v.amount)], ["Tax at your marginal rate", zar(tax)], ["Admin fee", zar(v.fee)], ["Tax rate on withdrawal", pct(tax / v.amount)]];
        if (v.contrib > 0) rows.push(["Contribution to savings pot", zar(v.contrib * C.twoPot.savingsShare) + " per month"], ["Contribution to retirement pot", zar(v.contrib * (1 - C.twoPot.savingsShare)) + " per month"]);
        const notes = ["Savings-pot withdrawals are taxed as income at your marginal rate, not under the lump-sum tables."];
        if (v.amount < C.twoPot.minWithdrawal) notes.unshift("Minimum withdrawal is " + zar(C.twoPot.minWithdrawal) + ".");
        return { headline: { label: "You receive after tax and fees", value: zar(v.amount - tax - v.fee) }, rows, notes };
      },
    },
    {
      id: "retirement-savings", cat: "Retirement", title: "Retirement Savings (RA)",
      desc: "Your RA deduction and tax saving.",
      fields: [
        { id: "contrib", label: "Contributions (R per year)", type: "number", required: true },
        { id: "income", label: "Annual remuneration / taxable income (R)", type: "number", required: true },
        AGE,
      ],
      calc(v) {
        if (!(v.contrib > 0) || !(v.income > 0)) return null;
        const d = T.retirementDeduction(v.contrib, v.income, v.income);
        const saving = T.taxAfterRebates(v.income, v.age) - T.taxAfterRebates(v.income - d.allowed, v.age);
        return {
          headline: { label: "Tax you save", value: zar(saving), sub: "per year" },
          rows: [["Deduction allowed", zar(d.allowed)], ["Deduction limit (27.5%, capped)", zar(d.limit)], ["Excess carried forward", zar(d.excess)], ["Effective saving on contributions", pct(saving / v.contrib)]],
        };
      },
    },
    {
      id: "retrenchment", cat: "Retirement", title: "Retrenchment Tax",
      desc: "Severance, notice and leave pay after retrenchment.",
      fields: [
        { id: "weekly", label: "Weekly salary (R)", type: "number", required: true },
        { id: "years", label: "Completed years of service", type: "number", required: true },
        { id: "severance", label: "Severance pay agreed (R, leave blank for the legal minimum)", type: "number" },
        { id: "notice", label: "Notice pay (R)", type: "number" },
        { id: "leave", label: "Leave pay (R)", type: "number" },
        { id: "prior", label: "Previous lump sums since 2009 (R)", type: "number" },
        AGE, INCOME("Your annual salary (R)"),
      ],
      calc(v) {
        if (!(v.weekly > 0)) return null;
        const minimum = v.weekly * v.years, sev = v.severance > 0 ? v.severance : minimum;
        const sevTax = T.lumpTax("retire", sev, v.prior);
        const incomeTax = T.incrementalTax(v.income, v.notice + v.leave, v.age);
        const gross = sev + v.notice + v.leave;
        return {
          headline: { label: "You receive after tax", value: zar(gross - sevTax - incomeTax) },
          rows: [["Legal minimum severance (1 week per year)", zar(minimum)], ["Severance used", zar(sev)], ["Tax on severance", zar(sevTax)], ["Notice + leave pay", zar(v.notice + v.leave)], ["Tax on notice + leave (as income)", zar(incomeTax)], ["Total tax", zar(sevTax + incomeTax)]],
          notes: ["First R550,000 of severance is tax-free (lifetime, aggregated with retirement lumps). Leave and notice pay are taxed as ordinary income."],
        };
      },
    },

    /* ---------------- PROPERTY ---------------- */
    {
      id: "transfer-cost", cat: "Property", title: "Property Transfer Cost",
      desc: "Estimate SARS transfer duty on a property purchase.",
      fields: [{ id: "price", label: "Purchase price / property value (R)", type: "number", required: true }],
      calc(v) {
        if (!(v.price > 0)) return null;
        const duty = T.transferDuty(v.price);
        return {
          headline: { label: "Transfer duty", value: zar(duty) },
          rows: [["Property value", zar(v.price)], ["Transfer duty", zar(duty)], ["Duty as % of property value", pct(duty / v.price)]],
          notes: ["This tool estimates transfer duty only. Conveyancing, deeds-office, bond-registration and other transaction costs are not included. Transactions subject to VAT may be exempt from transfer duty."],
        };
      },
    },

    /* ---------------- SELF-EMPLOYED ---------------- */
    {
      id: "provisional-tax", cat: "Self-employed", title: "Provisional Tax", popular: true,
      desc: "Estimate your two IRP6 payments.",
      fields: [
        { id: "ti", label: "Estimated taxable income for the year (R)", type: "number", required: true },
        { id: "paye", label: "PAYE for the full year (R, if you also earn a salary)", type: "number" },
        AGE, MEMBERS,
      ],
      calc(v) {
        if (!(v.ti > 0)) return null;
        const total = Math.max(0, T.taxOnIncome(v.ti) - T.rebatesFor(v.age) - T.mtcAnnual(v.members));
        const p1 = Math.max(0, total / 2 - v.paye / 2), p2 = Math.max(0, total - v.paye - p1);
        return {
          headline: { label: "Total provisional tax for the year", value: zar(Math.max(0, total - v.paye)) },
          rows: [["Tax for the year", zar(total)], ["PAYE credit", "– " + zar(v.paye)], ["1st payment (31 Aug)", zar(p1)], ["2nd payment (end Feb)", zar(p2)]],
          notes: ["This is a planning estimate, not a substitute for completing IRP6. SARS basic-amount and under-estimation rules can affect penalties and the amount you should declare."],
        };
      },
    },
    {
      id: "provisional-check", cat: "Self-employed", title: "Provisional Taxpayer Check",
      desc: "Find out whether you must register as a provisional taxpayer.",
      fields: [
        { id: "other", label: "Do you earn income other than a salary (business, rental, freelance, commission)?", type: "select", options: [["no", "No, salary only"], ["yes", "Yes"]] },
        { id: "amount", label: "Estimated taxable income from those sources (R per year)", type: "number" },
        { id: "senior", label: "You are 65 or older and only earn interest, dividends or rent below R500,000", type: "checkbox" },
      ],
      calc(v) {
        let verdict, why;
        if (v.other === "no") { verdict = "Probably not required"; why = "Salary-only earners whose employer deducts PAYE are normally not provisional taxpayers."; }
        else if (v.senior) { verdict = "Probably not required"; why = "Taxpayers 65+ with only interest, dividends and rent under R500,000 are generally exempt."; }
        else if (v.amount > 0 && v.amount <= 30000) { verdict = "Probably not required"; why = "Taxable income from non-salary sources of R30,000 or less is generally excluded."; }
        else { verdict = "You likely must register"; why = "Income beyond a salary (above the exclusions) makes you a provisional taxpayer. You'd pay twice a year and file by 22 January."; }
        return { headline: { label: "Result", value: verdict }, rows: [["Why", why]], notes: ["A guide only. Confirm with SARS or your accountant."] };
      },
    },

    /* ---------------- BUSINESS ---------------- */
    {
      id: "vat", cat: "Business", title: "VAT Calculator",
      desc: "Add or remove 15% VAT.",
      fields: [
        { id: "amount", label: "Amount (R)", type: "number", required: true },
        { id: "mode", label: "What do you want?", type: "select", options: [["add", "Add VAT"], ["remove", "Remove VAT (price includes VAT)"]] },
      ],
      calc(v) {
        if (!(v.amount > 0)) return null;
        const r = C.vatRate, net = v.mode === "add" ? v.amount : v.amount / (1 + r), gross = v.mode === "add" ? v.amount * (1 + r) : v.amount;
        return { headline: { label: "Total", value: zar(gross) }, rows: [["Excl. VAT", zar(net)], ["VAT (15%)", zar(gross - net)], ["Incl. VAT", zar(gross)]], notes: ["For the selected ruleset, compulsory VAT registration generally applies above " + zar(C.vatRegistration.compulsory) + " taxable supplies in a 12-month period; voluntary registration may be available from " + zar(C.vatRegistration.voluntary) + " subject to SARS requirements."] };
      },
    },
    {
      id: "small-business", cat: "Business", title: "Small Business Income Tax",
      desc: "Company, small business corporation or turnover tax.",
      fields: [
        { id: "mode", label: "Tax regime", type: "select", options: [["sbc", "Small business corporation"], ["company", "Standard company (27%)"], ["turnover", "Turnover tax (by turnover)"]] },
        { id: "amount", label: "Taxable income (or turnover, for turnover tax) (R)", type: "number", required: true },
      ],
      calc(v) {
        if (!(v.amount > 0)) return null;
        let tax;
        if (v.mode === "sbc") tax = T.table(C.sbc, v.amount);
        else if (v.mode === "company") tax = v.amount * C.companyRate;
        else tax = v.amount > C.turnoverEligibility ? NaN : T.table(C.turnoverTax, v.amount);
        if (isNaN(tax)) return { headline: { label: "Outside turnover-tax limit", value: "Above " + zar(C.turnoverEligibility) }, rows: [], notes: ["Turnover tax has eligibility rules in addition to the turnover ceiling. Confirm qualification before relying on this estimate."] };
        return { headline: { label: "Tax payable", value: zar(tax) }, rows: [["Effective rate", pct(tax / v.amount)], ["After-tax profit", zar(v.amount - tax)]], notes: ["Small Business Corporation and turnover-tax status each have qualification tests beyond the tax rate table. Confirm eligibility with SARS or your tax practitioner."] };
      },
    },
    {
      id: "payroll-tax", cat: "Business", title: "Payroll Tax (Employer Cost)",
      desc: "PAYE, UIF and SDL for your staff.",
      fields: [
        { id: "staff", label: "Number of employees", type: "number", required: true },
        { id: "avg", label: "Average gross monthly salary per employee (R)", type: "number", required: true },
      ],
      calc(v) {
        if (!(v.staff > 0) || !(v.avg > 0)) return null;
        const paye = T.calcSalaryTax({ salary: v.avg, frequency: "monthly", age: 35 }).incomeTax / 12 * v.staff;
        const uifEmp = T.uifMonthly(v.avg) * v.staff, payroll = v.avg * v.staff;
        const sdl = payroll * 12 > C.sdl.annualPayrollThreshold ? payroll * C.sdl.rate : 0;
        return {
          headline: { label: "Total to pay SARS each month (EMP201)", value: zar(paye + uifEmp * 2 + sdl) },
          rows: [["Gross payroll per month", zar(payroll)], ["PAYE (employee tax)", zar(paye)], ["UIF (employee + employer)", zar(uifEmp * 2)], ["SDL (employer, 1%)", zar(sdl)], ["Real employer cost (salary + UIF + SDL)", zar(payroll + uifEmp + sdl)]],
          notes: ["Scenario estimate only: PAYE is calculated as if every employee earns the same average salary, is age 35 and has no medical credits. Use employee-level payroll data for actual EMP201 calculations."],
        };
      },
    },
  ];

  const api = { calculators, CATEGORIES, zar, pct };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.CALCS = api;
})();
