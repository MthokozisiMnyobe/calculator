# SML Joka Tax Tools Prototype V2

## Purpose
This prototype upgrades the original SML Joka calculator concept into a branded, information-rich tax tools hub designed to fit the existing SML Joka website.

It is intentionally still a **prototype**. The calculations are planning estimates and should be reviewed by SML Joka before production use, especially after SARS tax-year changes.

## What changed

### 1. SML Joka branding
- Replaced the generic “Your Firm Name” presentation.
- Uses the SML Joka navy/gold visual language and logo.
- Added links back to the live SML Joka website and consultation flow.

### 2. Better calculator discovery
- Preserves all 29 original calculators.
- Adds search and category filtering.
- Adds a “Start here” section for the most common journeys: Salary Tax, Tax Refund, Provisional Tax, and VAT.
- Adds related-calculator links inside each calculator.

### 3. Better information around every calculator
Every calculator now has supporting information including:
- what the calculator does;
- what information the user should have ready;
- how the estimate is calculated at a high level;
- important limitations;
- official SARS source links;
- related calculators;
- a clear consultation CTA.

### 4. Tax-year awareness
- Supports 2026 and 2027 tax years from one central configuration.
- Explains that the current 2027 tax year is different from Filing Season 2026, which relates to the 2026 tax year.
- The Tax Refund tool gives a visible reminder to switch to 2026 for Filing Season 2026 where appropriate.

### 5. Calculation and content corrections
The prototype was reviewed against current SARS material and several items were corrected or tightened:
- 2027 turnover-tax bands were corrected.
- Salary travel allowance supports 80% or 20% PAYE inclusion.
- Property Transfer Cost now estimates SARS transfer duty only instead of implying unsupported conveyancing/bond-cost precision.
- Donations-tax payment timing wording was corrected.
- VAT deadline guidance distinguishes eFiling from other filing/payment channels.
- Payroll and provisional-tax outputs are explicitly labelled as planning/scenario estimates.
- UIF, TFSA, retirement, CGT, SBC, transfer duty and personal-tax values are centralised in the tax engine.

### 6. Safer UX
- Required fields are marked and validated.
- Users click a clear **Calculate estimate** button instead of relying only on invisible auto-calculation.
- A **Reset** control is provided.
- Results are labelled as estimates and link users to SML Joka for professional assistance.
- The checklist tool stores its state only in the user’s browser.

## Project files
- `index.html` — prototype entry point.
- `styles.css` — SML Joka responsive styling.
- `app.js` — application UI, routing, filters, calculator rendering and tools.
- `tax-engine.js` — central tax-year configuration and shared calculation functions.
- `calculators.js` — definitions and calculation logic for the 29 calculators.
- `calculator-info.js` — educational copy, limitations, official source links and related calculators.
- `tests.js` — Node regression/smoke checks for the calculator engine.
- `assets/sml-joka-logo.jpeg` — SML Joka logo used by the prototype.

## How to preview locally
You can open `index.html` directly in a browser for a quick preview. For the most reliable local preview, serve the folder with any basic local web server, for example from PowerShell if Python is installed:

```powershell
cd "PATH_TO\SML_Joka_Tax_Tools_Prototype_V2"
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Test command
With Node.js installed:

```powershell
node tests.js
```

Expected result:

```text
All SML Joka tax prototype regression checks passed.
```

## Before integrating into jokatax.co.za
1. Have SML Joka review the tax explanations and outputs as the professional practice.
2. Confirm the tax-year values against SARS immediately before production deployment.
3. Keep `tax-engine.js` as the single source of truth for annual rates and thresholds.
4. Integrate the prototype into the existing PHP site as a dedicated Tax Tools page rather than replacing existing working pages.
5. Preserve the working admin/database system; the calculator prototype does not require the admin database to operate.
6. Add a visible “estimates only / not professional advice” notice in production.
7. Re-run `tests.js` after every tax-year update.

## Annual maintenance checklist
At the start of every new tax year, review at minimum:
- personal income-tax brackets, rebates and thresholds;
- medical scheme tax credits;
- retirement deduction cap;
- travel reimbursement/allowance tables;
- TFSA annual limit;
- CGT exclusions and inclusion rates;
- turnover-tax and SBC tables;
- VAT thresholds/rules;
- transfer duty rates;
- UIF ceiling/rates;
- filing-season dates.

## Deliberate scope decision
TaxTim also presents several specialist allowance calculators (for example advanced wear-and-tear / lease-related company allowances). Those were not copied into this prototype. They should only be added after SML Joka has reviewed the intended tax treatment and inputs, because they are more specialised than the current general-purpose calculator set.
