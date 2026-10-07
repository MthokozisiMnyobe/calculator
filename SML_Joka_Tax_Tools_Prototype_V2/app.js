(function () {
  "use strict";

  const { calculators, CATEGORIES } = window.CALCS;
  const { INFO, SOURCES } = window.CALC_INFO;
  const T = window.TAX;
  const app = document.getElementById("app");

  let activeCategory = "All";
  let query = "";
  let selectedYear = 2027;
  let hasCalculated = false;

  const CONTACT_URL = "https://jokatax.co.za/contact.php";
  const CONSULT_URL = "https://jokatax.co.za/contact.php?type=consultation";

  const tools = [
    { id: "deadlines", title: "SARS Tax Deadlines", desc: "Current filing dates plus recurring employer and VAT reminders.", icon: "CAL" },
    { id: "checklist", title: "Tax Return Documents Checklist", desc: "A practical list of records to gather before you file.", icon: "CHK" },
    { id: "refund-guide", title: "Where Is My SARS Refund?", desc: "Understand common refund statuses and the next checks to make.", icon: "REF" }
  ];

  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const zar = (value) => "R " + (Math.round((Number(value) || 0) * 100) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (value, digits = 0) => ((Number(value) || 0) * 100).toFixed(digits) + "%";

  function setYear(year, { preserveView = true } = {}) {
    selectedYear = Number(year) === 2026 ? 2026 : 2027;
    T.setYear(selectedYear);
    document.querySelectorAll("[data-year-select]").forEach((el) => { el.value = String(selectedYear); });
    if (!preserveView) renderRoute();
  }

  function yearOptions() {
    return `<option value="2027" ${selectedYear === 2027 ? "selected" : ""}>2027 · 1 Mar 2026 – 28 Feb 2027</option>
            <option value="2026" ${selectedYear === 2026 ? "selected" : ""}>2026 · 1 Mar 2025 – 28 Feb 2026</option>`;
  }

  function bindGlobalControls() {
    document.querySelectorAll("[data-year-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const currentHash = location.hash;
        setYear(select.value);
        if (currentHash.startsWith("#calc=")) {
          const values = readCurrentForm();
          renderCalculator(currentHash.slice(6), values);
        } else {
          renderHome();
        }
      });
    });

    const menu = document.querySelector("[data-mobile-menu]");
    const nav = document.querySelector(".nav-inner");
    if (menu && nav) {
      menu.addEventListener("click", () => {
        const open = nav.classList.toggle("mobile-open");
        menu.setAttribute("aria-expanded", String(open));
      });
    }
  }

  function shell(content, { hero = false } = {}) {
    return `
      <div class="site-top">
        <div class="top-inner">
          <span>Vincent, KuGompo · 043 721 0309</span>
          <div class="top-actions"><a href="https://jokatax.co.za/admin/login.php">Staff Login</a><a href="${CONSULT_URL}">Book a Consultation</a></div>
        </div>
      </div>
      <nav class="main-nav" aria-label="Primary navigation">
        <div class="nav-inner">
          <a class="brand" href="https://jokatax.co.za/" aria-label="SML Joka home">
            <img src="assets/sml-joka-logo.jpeg" alt="SML Joka Tax and Accounting Services logo">
            <span class="brand-copy"><strong>SML Joka</strong><span>Tax &amp; Accounting Services</span></span>
          </a>
          <button class="mobile-nav" type="button" data-mobile-menu aria-expanded="false">Menu</button>
          <div class="nav-links">
            <a href="https://jokatax.co.za/">Home</a>
            <a href="https://jokatax.co.za/services.php">Services</a>
            <a href="#">Tax Tools</a>
            <a href="https://jokatax.co.za/resources.php">Resources</a>
            <a href="${CONTACT_URL}">Contact</a>
            <a class="nav-cta" href="${CONSULT_URL}">Book a Consultation</a>
          </div>
        </div>
      </nav>
      ${hero ? heroMarkup() : ""}
      ${content}
      <footer class="site-footer">
        <div class="footer-inner">
          <div>
            <h3>SML Joka Tax &amp; Accounting Services</h3>
            <p>These calculators are planning tools. They do not constitute a SARS assessment, tax directive, tax return, legal advice or a guarantee of any refund. Tax treatment depends on your complete facts and supporting records.</p>
            <div class="copyright">Rates in this prototype were reviewed against SARS material on 6 October 2026. Re-check official SARS guidance before each annual release.</div>
          </div>
          <div class="footer-links">
            <a href="https://jokatax.co.za/">Home</a><a href="https://jokatax.co.za/services.php">Services</a><a href="https://jokatax.co.za/resources.php">Resources</a><a href="${CONTACT_URL}">Contact</a>
          </div>
        </div>
      </footer>`;
  }

  function heroMarkup() {
    return `<section class="hero">
      <div class="hero-inner">
        <div>
          <p class="eyebrow">Tax tools · South Africa</p>
          <h1>Understand the numbers before you make the next move.</h1>
          <p class="hero-lead">Practical tax calculators for individuals and businesses, with tax-year context, plain-language explanations and direct access to SML Joka when your situation needs professional review.</p>
        </div>
        <aside class="hero-panel">
          <strong>Important tax-year distinction</strong>
          <p><b>2027</b> is the current tax year (1 Mar 2026 – 28 Feb 2027). If you are filing an individual return during Filing Season 2026, that return is generally for the <b>2026</b> year of assessment (1 Mar 2025 – 28 Feb 2026).</p>
        </aside>
      </div>
    </section>
    <div class="trust-strip">
      <div class="trust-inner">
        <div class="trust-item"><span class="trust-dot"></span><span><strong>29 calculators</strong><br>No sign-in required</span></div>
        <div class="trust-item"><span class="trust-dot"></span><span><strong>2026 + 2027</strong><br>Year-aware rates</span></div>
        <div class="trust-item"><span class="trust-dot"></span><span><strong>Official sources</strong><br>SARS links included</span></div>
        <div class="trust-item"><span class="trust-dot"></span><span><strong>Private by design</strong><br>Calculations stay in your browser</span></div>
      </div>
    </div>`;
  }

  function yearBanner() {
    return `<div class="tax-year-banner">
      <div>
        <h2>Choose the year that matches what you are calculating.</h2>
        <p>Planning current salary or business tax? Use <b>2027</b>. Preparing the individual return being filed in the 2026 Filing Season? Start with <b>2026</b>.</p>
      </div>
      <div class="year-control"><label for="home-year">Tax year</label><select id="home-year" data-year-select>${yearOptions()}</select></div>
    </div>`;
  }

  function renderHome() {
    hasCalculated = false;
    const startIds = ["salary-tax", "tax-refund", "provisional-tax", "vat"];
    const start = startIds.map((id, i) => {
      const calc = calculators.find((c) => c.id === id);
      return `<a class="start-card" href="#calc=${calc.id}"><span class="number">0${i + 1}</span><h3>${esc(calc.title)}</h3><p>${esc(INFO[id]?.summary || calc.desc)}</p><span class="arrow">Open tool →</span></a>`;
    }).join("");

    const content = `<main class="page-shell">
      ${yearBanner()}
      <section>
        <div class="section-head"><div><div class="section-kicker">Start here</div><h2>Four useful starting points</h2><p>Use the tool that best matches the question you are trying to answer, then move to the more specific calculators if needed.</p></div></div>
        <div class="start-grid">${start}</div>
      </section>
      <section id="calculator-directory">
        <div class="section-head"><div><div class="section-kicker">Calculator directory</div><h2>Find the right calculator</h2><p>Search by name or filter by category. Each calculator now includes what it does, what you need, limitations and official SARS source links.</p></div></div>
        <div class="filter-bar">
          <div class="filter-row"><div class="search-wrap"><span class="search-icon" aria-hidden="true">⌕</span><label class="sr-only" for="calc-search">Search calculators</label><input id="calc-search" type="search" placeholder="Search calculators…" value="${esc(query)}"></div></div>
          <div class="chips" id="category-chips">${["All", ...CATEGORIES].map((cat) => `<button type="button" class="chip" data-cat="${esc(cat)}" aria-pressed="${activeCategory === cat}">${esc(cat)}</button>`).join("")}</div>
        </div>
        <div class="calc-grid" id="calc-grid">${calculatorCards()}</div>
      </section>
      <section>
        <div class="section-head"><div><div class="section-kicker">Tools &amp; trackers</div><h2>More than the calculation</h2><p>Prepare documents, understand current filing dates and know what to check when a refund is delayed.</p></div></div>
        <div class="tools-grid">${tools.map((tool) => `<a class="tool-card" href="#tool=${tool.id}"><span class="tool-icon">${tool.icon}</span><h3>${esc(tool.title)}</h3><p>${esc(tool.desc)}</p></a>`).join("")}</div>
      </section>
      ${faqMarkup()}
      ${ctaBand("Need help interpreting a result?", "A calculator can give you an estimate. SML Joka can help review the actual documents, tax year and facts behind the number.")}
    </main>`;

    app.innerHTML = shell(content, { hero: true });
    bindGlobalControls();
    bindHomeControls();
  }

  function calculatorCards() {
    const q = query.trim().toLowerCase();
    const matches = calculators.filter((calc) => {
      const catOk = activeCategory === "All" || calc.cat === activeCategory;
      const qOk = !q || `${calc.title} ${calc.desc} ${calc.cat}`.toLowerCase().includes(q);
      return catOk && qOk;
    });
    if (!matches.length) return `<div class="empty-state">No calculator matches that search. Try another keyword or choose “All”.</div>`;
    return matches.map((calc) => `<a class="calc-card" href="#calc=${calc.id}">
      <div class="calc-meta"><span class="calc-cat">${esc(calc.cat)}</span>${calc.popular ? '<span class="popular">Popular</span>' : ""}</div>
      <h3>${esc(calc.title)}</h3><p>${esc(calc.desc)}</p><span class="open">Open calculator →</span></a>`).join("");
  }

  function bindHomeControls() {
    const search = document.getElementById("calc-search");
    const grid = document.getElementById("calc-grid");
    if (search && grid) {
      search.addEventListener("input", () => { query = search.value; grid.innerHTML = calculatorCards(); });
    }
    document.querySelectorAll("[data-cat]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.cat;
        document.querySelectorAll("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        grid.innerHTML = calculatorCards();
      });
    });
  }

  function faqMarkup() {
    return `<section class="faq">
      <div class="section-head"><div><div class="section-kicker">Before you calculate</div><h2>Common questions</h2></div></div>
      <details><summary>Which tax year should I choose?</summary><p>Choose the year of assessment that matches the income or transaction you are calculating. The 2027 tax year runs from 1 March 2026 to 28 February 2027. The individual return being filed in Filing Season 2026 generally relates to the 2026 tax year, which ran from 1 March 2025 to 28 February 2026.</p></details>
      <details><summary>Are these figures the same as a SARS assessment?</summary><p>No. They are planning estimates based on the information you enter and selected SARS rates. SARS may hold additional third-party information, apply directives, request supporting documents or use rules not captured by a short calculator.</p></details>
      <details><summary>Does this prototype send my numbers anywhere?</summary><p>No. The calculator arithmetic runs in your browser. The document checklist stores ticked items only in that browser. The prototype does not submit calculator inputs to the SML Joka database.</p></details>
      <details><summary>Can I file my tax return from these tools?</summary><p>No. These tools do not submit returns to SARS. Use SARS eFiling or work with an authorised tax practitioner for actual filing and submissions.</p></details>
      <details><summary>How are the rates maintained?</summary><p>Rates are centralised by tax year in one JavaScript configuration file. Before every annual release, SML Joka / MH Websites should review the new SARS Budget and tax guides, update the rate configuration, run the regression tests and record the review date.</p></details>
    </section>`;
  }

  function getCalculator(id) { return calculators.find((calc) => calc.id === id); }

  function fieldMarkup(field, value) {
    const id = `field-${field.id}`;
    const val = value !== undefined ? value : (field.default !== undefined ? field.default : "");
    const req = field.required ? '<span class="required" aria-hidden="true"> *</span>' : "";
    const requiredAttr = field.required ? " required" : "";
    const min = field.min !== undefined ? ` min="${esc(field.min)}"` : "";
    const max = field.max !== undefined ? ` max="${esc(field.max)}"` : "";
    const hint = field.hint ? `<small class="hint">${esc(field.hint)}</small>` : "";

    if (field.type === "select") {
      return `<div class="field"><label for="${id}">${esc(field.label)}${req}</label><select id="${id}" name="${esc(field.id)}"${requiredAttr}>${(field.options || []).map(([v, label]) => `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(label)}</option>`).join("")}</select>${hint}</div>`;
    }
    if (field.type === "checkbox") {
      return `<div class="field check-field"><label for="${id}"><input id="${id}" name="${esc(field.id)}" type="checkbox" ${val ? "checked" : ""}> <span>${esc(field.label)}${req}${hint}</span></label></div>`;
    }
    return `<div class="field"><label for="${id}">${esc(field.label)}${req}</label><input id="${id}" name="${esc(field.id)}" type="number" step="any" inputmode="decimal" value="${esc(val)}"${requiredAttr}${min}${max}>${hint}</div>`;
  }

  function readForm(calc) {
    const form = document.getElementById("calculator-form");
    const values = {};
    for (const field of calc.fields) {
      const el = form.elements[field.id];
      if (!el) continue;
      if (field.type === "checkbox") values[field.id] = el.checked;
      else if (field.type === "number" || !field.type) values[field.id] = el.value === "" ? 0 : Number(el.value);
      else values[field.id] = el.value;
    }
    return values;
  }

  function readCurrentForm() {
    const hash = location.hash;
    if (!hash.startsWith("#calc=")) return null;
    const calc = getCalculator(hash.slice(6));
    if (!calc || !document.getElementById("calculator-form")) return null;
    return readForm(calc);
  }

  function validate(calc, values) {
    for (const field of calc.fields) {
      if (!field.required) continue;
      const v = values[field.id];
      if (field.type === "checkbox") {
        if (!v) return `${field.label} is required.`;
      } else if (field.type === "number" || !field.type) {
        if (!(Number(v) > 0)) return `Enter a value greater than zero for “${field.label}”.`;
      } else if (!String(v || "").trim()) return `Complete “${field.label}”.`;
    }
    for (const field of calc.fields) {
      if (field.type !== "number" && field.type) continue;
      const v = Number(values[field.id]);
      if (field.min !== undefined && v < Number(field.min)) return `“${field.label}” must be at least ${field.min}.`;
      if (field.max !== undefined && v > Number(field.max)) return `“${field.label}” cannot be more than ${field.max}.`;
      if (v < 0) return `“${field.label}” cannot be negative.`;
    }
    if (calc.id === "travel-deduction" && values.biz > values.total) return "Business kilometres cannot be greater than total kilometres.";
    if (calc.id === "home-office" && values.office > values.home) return "Office floor area cannot be greater than total home floor area.";
    if (calc.id === "rental-income" && values.share > 100) return "Ownership share cannot be more than 100%.";
    return "";
  }

  function resultMarkup(result) {
    if (!result) return `<div class="result-empty">Complete the required fields and choose <b>Calculate estimate</b>. Your result will appear here.</div><p class="result-disclaimer">Planning estimate only — not a SARS assessment or filing result.</p>`;
    const rows = (result.rows || []).map(([label, value]) => `<div class="result-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
    const notes = (result.notes || []).length ? `<div class="result-notes">${result.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : "";
    return `<div class="result-label">${esc(result.headline?.label || "Estimate")}</div><div class="result-big">${esc(result.headline?.value || "—")}</div>${result.headline?.sub ? `<div class="result-sub">${esc(result.headline.sub)}</div>` : '<div class="result-sub">Based on the information entered</div>'}${rows}${notes}<p class="result-disclaimer">Estimate only. Confirm the final tax treatment against your complete records and current SARS guidance.</p><a class="consult-link" href="${CONSULT_URL}">Discuss this result with SML Joka →</a>`;
  }

  function rateSnapshot(id) {
    const C = T.CONFIG;
    const general = [`Tax year ${C.yearLabel}`, C.periodLabel];
    const map = {
      "salary-tax": [`Under-65 threshold: ${zar(C.thresholds.under65)}`, `Primary rebate: ${zar(C.rebates.primary)}`, `Retirement cap: ${zar(C.retirement.annualCap)}`, `UIF max employee: ${zar(C.uif.monthlyCeiling * C.uif.rate)}/month`],
      "tax-bracket": [`Under-65 threshold: ${zar(C.thresholds.under65)}`, `Top marginal rate: ${pct(C.brackets.at(-1).rate)}`],
      "tax-refund": [`Primary rebate: ${zar(C.rebates.primary)}`, `Medical credit first two: ${zar(C.medicalCredit.firstTwo)}/month`, `Retirement cap: ${zar(C.retirement.annualCap)}`],
      "medical-credits": [`First two covered persons: ${zar(C.medicalCredit.firstTwo)}/month each`, `Additional dependants: ${zar(C.medicalCredit.additional)}/month each`],
      "travel-deduction": [`Simplified reimbursement rate: R ${C.perKmRate.toFixed(2)}/km`, `Travel PAYE inclusion: usually ${pct(C.travelTaxablePct)}`],
      "tfsa": [`Annual contribution limit: ${zar(C.tfsa.annual)}`, `Lifetime contribution limit: ${zar(C.tfsa.lifetime)}`, `Excess contribution tax: ${pct(C.tfsa.penalty)}`],
      "donations-tax": [`Natural-person annual exemption: ${zar(C.donations.exemptIndividual)}`, `Rate up to cumulative R30m: ${pct(C.donations.lowRate)}`, `Rate above cumulative R30m: ${pct(C.donations.highRate)}`],
      "capital-gains": [`Individual annual exclusion: ${zar(C.cgt.annualExclusion)}`, `Primary-residence exclusion: ${zar(C.cgt.primaryResidence)}`],
      "retirement-savings": [`Deduction percentage: ${pct(C.retirement.pct, 1)}`, `Annual cap: ${zar(C.retirement.annualCap)}`],
      "vat": [`Standard VAT rate: ${pct(C.vatRate)}`, `Compulsory registration threshold: ${zar(C.vatRegistration.compulsory)}`, `Voluntary threshold: ${zar(C.vatRegistration.voluntary)}`],
      "small-business": [`Standard company rate: ${pct(C.companyRate)}`, `Turnover-tax ceiling used: ${zar(C.turnoverEligibility)}`],
      "transfer-cost": [`Transfer-duty table effective: ${C.transferDutyEffective}`, `0% band: up to ${zar(C.transferDuty[0].upTo)}`],
      "uif": [`Employee: ${pct(C.uif.rate)}`, `Employer: ${pct(C.uif.rate)}`, `Monthly earnings ceiling: ${zar(C.uif.monthlyCeiling)}`]
    };
    return [...general, ...(map[id] || [])];
  }

  function infoMarkup(calc) {
    const info = INFO[calc.id] || {};
    const needed = calc.fields.map((field) => field.label.replace(/\s*\([^)]*\)\s*$/, ""));
    const sourceLinks = (info.sources || []).map((key) => SOURCES[key]).filter(Boolean).map((src) => `<a class="source-link" href="${src.url}" target="_blank" rel="noopener">${esc(src.label)} ↗</a>`).join("");
    const related = (info.related || []).map((id) => getCalculator(id)).filter(Boolean).map((item) => `<a href="#calc=${item.id}">${esc(item.title)}</a>`).join("");
    return `<div class="info-grid">
      <article class="info-card"><h3>What this calculator does</h3><p>${esc(info.summary || calc.desc)}</p></article>
      <article class="info-card"><h3>What you’ll need</h3><ul>${needed.slice(0, 8).map((item) => `<li>${esc(item)}</li>`).join("")}${needed.length > 8 ? `<li>Plus ${needed.length - 8} additional input${needed.length - 8 === 1 ? "" : "s"}</li>` : ""}</ul></article>
      <article class="info-card"><h3>Selected rate snapshot</h3><ul>${rateSnapshot(calc.id).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></article>
      <article class="info-card"><h3>How it works</h3><p>${esc(info.how || "The calculator applies the selected tax-year configuration to the information you enter.")}</p></article>
      <article class="info-card"><h3>Important limitations</h3><p>${esc(info.limits || "This is an estimate and does not replace a complete tax calculation or professional review.")}</p></article>
      <article class="info-card"><h3>Official SARS sources</h3><p>Use these links to verify the rules before relying on a result for filing or payment.</p><div class="source-list">${sourceLinks || `<a class="source-link" href="${SOURCES.rates.url}" target="_blank" rel="noopener">SARS tax rates ↗</a>`}</div></article>
    </div>${related ? `<div class="related"><h3>Related calculators</h3><div class="related-links">${related}</div></div>` : ""}`;
  }

  function renderCalculator(id, retainedValues = null) {
    hasCalculated = false;
    const calc = getCalculator(id);
    if (!calc) { location.hash = ""; return; }
    const values = retainedValues || {};
    const filingNote = calc.id === "tax-refund" && selectedYear === 2027 ? `<div class="context-note"><span><b>Filing Season 2026?</b> The individual return currently being filed is generally for the 2026 year of assessment, not 2027.</span><button type="button" data-switch-2026>Switch to 2026</button></div>` : "";

    const content = `<main class="page-shell">
      <a class="back-link" href="#">← Back to all tax tools</a>
      <div class="view-head"><div><div class="section-kicker">${esc(calc.cat)}</div><h1 class="view-title">${esc(calc.title)}</h1><p class="view-lead">${esc(INFO[id]?.summary || calc.desc)}</p></div><div class="year-pill"><label for="calc-year">Tax year</label><select id="calc-year" data-year-select>${yearOptions()}</select></div></div>
      ${filingNote}
      <div class="calc-layout">
        <section class="panel"><h2>Your information</h2><p class="panel-intro">Fields marked with <span class="required">*</span> are required. Enter amounts that match the selected year.</p><div id="form-error" class="form-error" role="alert"></div><form id="calculator-form" novalidate>${calc.fields.map((f) => fieldMarkup(f, values[f.id])).join("")}<div class="actions"><button class="primary-btn" type="submit">Calculate estimate</button><button class="secondary-btn" type="reset">Reset</button></div></form></section>
        <aside class="panel result-panel" id="result-panel" aria-live="polite"><div id="result-content">${resultMarkup(null)}</div></aside>
      </div>
      ${infoMarkup(calc)}
      ${ctaBand("The number is only the starting point.", "If this result affects a return, payment, business decision or SARS submission, let SML Joka review the facts behind it.")}
    </main>`;

    app.innerHTML = shell(content);
    bindGlobalControls();
    bindCalculator(calc);
  }

  function bindCalculator(calc) {
    const form = document.getElementById("calculator-form");
    const error = document.getElementById("form-error");
    const resultContent = document.getElementById("result-content");
    const switchBtn = document.querySelector("[data-switch-2026]");
    if (switchBtn) switchBtn.addEventListener("click", () => { setYear(2026); renderCalculator(calc.id, readForm(calc)); });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = readForm(calc);
      const message = validate(calc, values);
      if (message) {
        error.textContent = message;
        error.classList.add("show");
        resultContent.innerHTML = resultMarkup(null);
        return;
      }
      error.classList.remove("show");
      let result = null;
      try { result = calc.calc(values); }
      catch (err) {
        error.textContent = "This estimate could not be calculated. Check the values and try again.";
        error.classList.add("show");
      }
      if (!result) {
        if (!error.classList.contains("show")) {
          error.textContent = "Add the required values before calculating.";
          error.classList.add("show");
        }
        resultContent.innerHTML = resultMarkup(null);
        return;
      }
      hasCalculated = true;
      resultContent.innerHTML = resultMarkup(result);
    });

    form.addEventListener("reset", () => {
      setTimeout(() => {
        hasCalculated = false;
        error.classList.remove("show");
        error.textContent = "";
        resultContent.innerHTML = resultMarkup(null);
      }, 0);
    });

    form.addEventListener("input", () => {
      if (!hasCalculated) return;
      const values = readForm(calc);
      const message = validate(calc, values);
      if (message) return;
      const result = calc.calc(values);
      if (result) resultContent.innerHTML = resultMarkup(result);
    });
  }

  function ctaBand(title, text) {
    return `<section class="cta-band"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div><a href="${CONSULT_URL}">Book a consultation →</a></section>`;
  }

  function renderDeadlines() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dates = [
      ["2026-07-01", "Auto Assessment period begins", "Selected individual taxpayers"],
      ["2026-07-13", "Individual Filing Season opens", "Non-provisional and provisional individuals"],
      ["2026-08-31", "First provisional tax payment (period 1)", "Individual provisional taxpayers"],
      ["2026-09-19", "Trust Filing Season opens", "Trusts"],
      ["2026-10-23", "Individual income-tax return deadline", "Non-provisional individuals"],
      ["2027-01-22", "Income-tax return deadline", "Provisional taxpayers and trusts"],
      ["2027-02-28", "Second provisional tax period ends", "Individual provisional taxpayers — confirm weekend/business-day payment rule"],
      ["2027-09-30", "Third provisional top-up period", "Where a voluntary top-up is relevant"]
    ];
    const rows = dates.map(([iso, label, who]) => {
      const d = new Date(`${iso}T00:00:00`); const diff = Math.round((d - today) / 86400000); const past = diff < 0;
      const when = d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
      const status = past ? "Passed" : diff === 0 ? "Today" : `${diff} days left`;
      return `<tr class="${past ? "passed" : ""}"><td><strong>${when}</strong><br><span class="${past ? "" : "due"}">${status}</span></td><td>${esc(label)}</td><td>${esc(who)}</td></tr>`;
    }).join("");
    return toolShell("SARS Tax Deadlines", "A practical calendar for current filing and recurring obligations. Always confirm the actual due date on your SARS profile or official notice.", `
      <section class="tool-page"><h2>Filing Season 2026 and provisional tax</h2><div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Obligation</th><th>Who</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="panel"><h2>Recurring business obligations</h2><ul>
        <li><b>EMP201:</b> generally due by the 7th of the following month; if that day is a weekend/public holiday, SARS requires the preceding working day.</li>
        <li><b>VAT201 via eFiling:</b> return and eFiling payment are generally due by the last business day of the month following the tax period. Other payment channels can have a 25th-of-month deadline.</li>
        <li><b>Company ITR14:</b> generally within 12 months after the company’s financial year-end.</li>
        <li><b>Employer reconciliation:</b> SARS announces the annual/interim employer filing windows; confirm the current notice before submission.</li>
      </ul><div class="source-list"><a class="source-link" href="${SOURCES.filing.url}" target="_blank" rel="noopener">SARS Filing Season ↗</a><a class="source-link" href="https://www.sars.gov.za/individuals/i-need-help-with-my-tax/calendar/" target="_blank" rel="noopener">SARS Tax Calendar ↗</a><a class="source-link" href="https://www.sars.gov.za/types-of-tax/value-added-tax/obligations-of-a-vat-vendor/" target="_blank" rel="noopener">VAT obligations ↗</a></div></div></section>`);
  }

  const checklist = {
    "Identity & banking": ["Identity document", "Proof of banking details", "Current contact details"],
    "Employment & income": ["IRP5 / IT3(a) certificates", "Annuity or pension income certificates", "Local interest and investment certificates", "Foreign income / foreign tax certificates", "Rental income and expense records", "Freelance or business income records"],
    "Deductions & credits": ["Retirement fund contribution certificates", "Medical scheme tax certificate", "Qualifying out-of-pocket medical records", "Section 18A donation receipts", "Travel logbook and vehicle information", "Home-office records where relevant", "Asset invoices for wear-and-tear claims"],
    "Assets & other matters": ["Property / capital-gain purchase and sale records", "Crypto transaction history", "Previous ITA34 / Statement of Account", "SARS correspondence or verification requests"]
  };

  function renderChecklist() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem("smlJokaTaxChecklist") || "{}"); } catch (_) { stored = {}; }
    const groups = Object.entries(checklist).map(([name, items]) => `<div class="checklist-group"><h3>${esc(name)}</h3><ul class="checklist-list">${items.map((item) => `<li><label><input type="checkbox" data-check-item="${esc(item)}" ${stored[item] ? "checked" : ""}> <span>${esc(item)}</span></label></li>`).join("")}</ul></div>`).join("");
    toolShell("Tax Return Documents Checklist", "Use this as a preparation list before filing or meeting your adviser. Ticks are stored only in this browser and are not sent to SML Joka.", `<section class="tool-page"><div class="panel"><p class="panel-intro">The exact documents depend on your tax affairs. SARS can request supporting records even when information is pre-populated.</p>${groups}<div class="actions"><button class="secondary-btn" type="button" data-clear-checklist>Clear all ticks</button></div></div><div class="source-list"><a class="source-link" href="${SOURCES.filing.url}" target="_blank" rel="noopener">SARS Filing Season ↗</a></div></section>`, () => {
      document.querySelectorAll("[data-check-item]").forEach((box) => box.addEventListener("change", () => {
        const data = {}; document.querySelectorAll("[data-check-item]").forEach((b) => { data[b.dataset.checkItem] = b.checked; });
        try { localStorage.setItem("smlJokaTaxChecklist", JSON.stringify(data)); } catch (_) {}
      }));
      const clear = document.querySelector("[data-clear-checklist]");
      if (clear) clear.addEventListener("click", () => { document.querySelectorAll("[data-check-item]").forEach((b) => { b.checked = false; }); try { localStorage.removeItem("smlJokaTaxChecklist"); } catch (_) {} });
    });
  }

  function renderRefundGuide() {
    toolShell("Where Is My SARS Refund?", "This site cannot access your SARS account. Use the checks below to understand what to look for and when professional help may be useful.", `<section class="tool-page"><div class="panel"><h2>Start with these checks</h2><ol class="steps"><li>Open SARS eFiling or the SARS MobiApp and check that the return is successfully submitted.</li><li>Read your <b>Notice of Assessment (ITA34)</b>. Confirm whether it shows an amount due to you and whether SARS has requested verification.</li><li>Check that your banking details are valid and verified. A refund can be held if bank verification is outstanding.</li><li>Look for a verification/audit letter or a request for supporting documents and note its deadline.</li><li>Check your <b>Statement of Account (SOA)</b> for offsets against other SARS debt or movements after assessment.</li></ol></div><div class="panel"><h2>When the estimate and SARS result differ</h2><p>The calculator only knows the values you entered. SARS can have IRP5/IT3 data, provisional payments, directives, prior balances and verification adjustments that the calculator does not see.</p><p>If you cannot reconcile the difference, collect the ITA34, SOA, relevant certificates and supporting documents before contacting SML Joka.</p><div class="source-list"><a class="source-link" href="${SOURCES.filing.url}" target="_blank" rel="noopener">SARS Filing Season ↗</a><a class="source-link" href="https://www.sars.gov.za/individuals/i-need-help-with-my-tax/" target="_blank" rel="noopener">SARS individual help ↗</a></div></div></section>`);
  }

  function toolShell(title, lead, body, afterRender) {
    const content = `<main class="page-shell"><a class="back-link" href="#">← Back to all tax tools</a><div class="view-head"><div><div class="section-kicker">Tools &amp; trackers</div><h1 class="view-title">${esc(title)}</h1><p class="view-lead">${esc(lead)}</p></div></div>${body}${ctaBand("Need help with the next step?", "Bring the relevant records and SARS correspondence to SML Joka for a more complete review.")}</main>`;
    app.innerHTML = shell(content);
    bindGlobalControls();
    if (afterRender) afterRender();
  }

  function renderTool(id) {
    if (id === "deadlines") renderDeadlines();
    else if (id === "checklist") renderChecklist();
    else if (id === "refund-guide") renderRefundGuide();
    else location.hash = "";
  }

  function renderRoute() {
    T.setYear(selectedYear);
    const hash = location.hash || "";
    if (hash.startsWith("#calc=")) renderCalculator(hash.slice(6));
    else if (hash.startsWith("#tool=")) renderTool(hash.slice(6));
    else renderHome();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
