/* Educational content for the SML Joka calculator prototype.
 * Keep calculation logic in tax-engine.js / calculators.js and explanatory content here.
 */
(function () {
  const SOURCES = {
    rates: { label: "SARS tax rates", url: "https://www.sars.gov.za/tax-rates/" },
    personal: { label: "SARS Personal Income Tax", url: "https://www.sars.gov.za/types-of-tax/personal-income-tax/" },
    employer2027: { label: "SARS Employees’ Tax Guide (2027)", url: "https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/" },
    medical: { label: "SARS Medical Tax Credit Rates", url: "https://www.sars.gov.za/tax-rates/medical-tax-credit-rates/" },
    medicalExtra: { label: "SARS Additional Medical Expenses Tax Credit", url: "https://www.sars.gov.za/types-of-tax/personal-income-tax/additional-medical-expenses-tax-credit/" },
    cgt: { label: "SARS Capital Gains Tax rates", url: "https://www.sars.gov.za/tax-rates/income-tax/capital-gains-tax-cgt/" },
    retirement: { label: "SARS Retirement Lump Sum Benefits", url: "https://www.sars.gov.za/tax-rates/income-tax/retirement-lump-sum-benefits/" },
    tfsa: { label: "SARS Tax-Free Investments", url: "https://www.sars.gov.za/types-of-tax/personal-income-tax/tax-free-investments/" },
    travel: { label: "SARS Rates per kilometre", url: "https://www.sars.gov.za/tax-rates/employers/rates-per-kilometre/" },
    donations: { label: "SARS Donations Tax", url: "https://www.sars.gov.za/types-of-tax/donations-tax/" },
    vat: { label: "SARS Value-Added Tax", url: "https://www.sars.gov.za/types-of-tax/value-added-tax/" },
    sbc: { label: "SARS Companies, Trusts & SBC rates", url: "https://www.sars.gov.za/tax-rates/income-tax/companies-trusts-and-small-business-corporations-sbc/" },
    turnover: { label: "SARS Turnover Tax rates", url: "https://www.sars.gov.za/tax-rates/turnover-tax/" },
    transfer: { label: "SARS Transfer Duty rates", url: "https://www.sars.gov.za/tax-rates/transfer-duty/" },
    filing: { label: "SARS Filing Season", url: "https://www.sars.gov.za/types-of-tax/personal-income-tax/filing-season/" },
    provisional: { label: "SARS Provisional Tax", url: "https://www.sars.gov.za/types-of-tax/provisional-tax/" },
    uif: { label: "SARS UIF contributions", url: "https://www.sars.gov.za/latest-news/unemployment-insurance-fund-uif-contributions/" }
  };

  const INFO = {
    "salary-tax": {
      summary: "Estimate PAYE, UIF and take-home pay from your gross remuneration, age, retirement contributions, medical scheme members and travel allowance.",
      how: "The tool annualises your pay, applies qualifying retirement deductions, calculates tax using the selected SARS year’s brackets and rebates, subtracts medical scheme tax credits, and estimates UIF. Travel allowance PAYE inclusion can be set to 80% or 20% where the employer expects at least 80% business use.",
      limits: "This is a planning estimate. Payroll can differ because of fringe benefits, directives, irregular payments, employer-specific payroll treatment and information not entered here.",
      sources: ["employer2027", "medical", "personal"],
      related: ["tax-bracket", "hourly-to-salary", "net-to-gross", "bonus-tax"]
    },
    "tax-bracket": {
      summary: "See the marginal SARS tax bracket that applies to annual taxable income and compare it with your age-based tax threshold.",
      how: "South Africa uses progressive rates. Your marginal rate applies only to the portion of taxable income inside the highest band you reach; it is not the rate applied to all of your income.",
      limits: "Taxable income is not always the same as gross salary. Deductions and certain income types can change the final amount assessed by SARS.",
      sources: ["rates", "personal"], related: ["salary-tax", "tax-refund"]
    },
    "hourly-to-salary": {
      summary: "Convert an hourly rate to gross annual and monthly pay—or work backwards from monthly salary—and estimate PAYE, UIF and take-home pay.",
      how: "Gross pay is annualised using your weekly hours and paid weeks. The tool then uses the same personal-income-tax logic as the salary calculator for an indicative after-tax view.",
      limits: "Overtime, unpaid leave, benefits, bonuses and employer payroll rules are not modelled unless entered through a more specific calculator.",
      sources: ["employer2027", "personal"], related: ["salary-tax", "net-to-gross"]
    },
    "net-to-gross": {
      summary: "Estimate the gross monthly salary needed to achieve a target take-home amount after PAYE, UIF and the retirement contribution entered.",
      how: "The calculator repeatedly tests gross salary values until the estimated net pay is close to your target, using the selected year’s personal tax rules.",
      limits: "It is not a payroll quotation. Fringe benefits, employer deductions, garnishees and other payroll items can change the salary required.",
      sources: ["employer2027", "personal"], related: ["salary-tax", "hourly-to-salary"]
    },
    "bonus-tax": {
      summary: "Estimate the extra income tax created by adding a once-off bonus to your regular annual salary.",
      how: "The tool compares estimated tax on your salary alone with tax on salary plus bonus. The difference is the estimated tax attributable to the bonus.",
      limits: "Actual PAYE on an annual payment can differ because employers use SARS annual-payment rules and payroll reconciliation methods.",
      sources: ["employer2027", "personal"], related: ["salary-tax", "tax-bracket"]
    },
    "uif": {
      summary: "Estimate monthly employee and employer UIF contributions using the current contribution ceiling used by the prototype.",
      how: "UIF is calculated at 1% for the employee and 1% for the employer, subject to the monthly remuneration ceiling.",
      limits: "Confirm whether a worker and remuneration type are UIF-insurable before using this for payroll compliance.",
      sources: ["uif"], related: ["salary-tax", "payroll-tax"]
    },
    "taxable-interest": {
      summary: "Estimate how much South African-source interest remains taxable after the annual age-based interest exemption.",
      how: "The annual exemption is deducted from qualifying local interest, then the remaining amount is treated as additional taxable income for an indicative tax effect.",
      limits: "Different rules can apply to non-residents, tax-free investments and non-interest investment returns.",
      sources: ["personal"], related: ["tax-refund", "tfsa"]
    },
    "foreign-dividends": {
      summary: "Estimate South African tax on taxable foreign dividends for an individual, including an entered foreign withholding-tax credit.",
      how: "For shareholdings below 10%, the prototype applies the commonly used foreign-dividend exemption fraction so the maximum effective South African rate is approximately 20%, then allows the entered foreign-tax credit up to the calculated SA tax.",
      limits: "Participation exemptions, double-tax agreements, company structures and foreign-tax-credit limitations can materially change the result.",
      sources: ["personal", "rates"], related: ["taxable-interest", "capital-gains"]
    },
    "rental-income": {
      summary: "Estimate tax on your share of rental profit after common property expenses such as bond interest, rates, levies, insurance and repairs.",
      how: "The calculator subtracts entered deductible expenses from rental received, applies your ownership share, then estimates the incremental personal income tax on a positive rental profit.",
      limits: "Capital improvements and bond capital repayments are not ordinary rental deductions. Ring-fencing and mixed private use can affect what SARS allows.",
      sources: ["personal"], related: ["provisional-check", "provisional-tax", "tax-refund"]
    },
    "company-car": {
      summary: "Estimate the taxable fringe benefit and additional personal tax associated with employer-provided vehicle use.",
      how: "A monthly fringe-benefit percentage is applied to the vehicle’s determined value, reduced by the employee contribution entered, then the annual benefit is added to other income to estimate incremental tax.",
      limits: "Fuel, maintenance, licence, business-use reductions, employee cost-sharing and final assessment adjustments are simplified here.",
      sources: ["employer2027"], related: ["salary-tax", "travel-deduction"]
    },
    "tax-refund": {
      summary: "Estimate whether PAYE already withheld may exceed your final tax liability for the return you are preparing.",
      how: "The tool estimates taxable income after entered deductions, applies the selected year’s brackets and rebates, subtracts medical credits, then compares the result with PAYE already paid.",
      limits: "A refund is never guaranteed. SARS uses third-party certificates and your full return, and may verify or audit supporting documents. During Filing Season 2026, select the 2026 tax year.",
      sources: ["filing", "personal", "medical", "medicalExtra"], related: ["salary-tax", "medical-credits", "travel-deduction", "retirement-savings"]
    },
    "medical-credits": {
      summary: "Estimate the fixed medical scheme fees tax credit and a simplified additional medical expenses tax credit.",
      how: "The fixed credit depends on the number of covered people. Additional medical-expense credits depend on age/disability status, contributions, qualifying out-of-pocket costs and taxable income.",
      limits: "Only qualifying medical expenditure counts. Disability treatment and dependant rules are more detailed than this prototype can capture in a short form.",
      sources: ["medical", "medicalExtra"], related: ["tax-refund", "salary-tax"]
    },
    "travel-deduction": {
      summary: "Compare a SARS cost-table estimate with your entered actual vehicle costs for business travel against a travel allowance.",
      how: "Business kilometres are divided by total kilometres to estimate business-use share. The tool compares the selected tax year’s SARS cost table with an actual-cost method and displays the stronger indicative deduction, limited to the allowance entered.",
      limits: "A compliant logbook is essential. The R/km reimbursement rule is different from a fixed travel allowance, and employer-paid fuel can change the table method.",
      sources: ["travel", "employer2027"], related: ["salary-tax", "tax-refund", "company-car"]
    },
    "home-office": {
      summary: "Estimate a floor-area-based home-office expense allocation and the possible tax effect for a qualifying employee scenario.",
      how: "The prototype allocates selected household costs by office floor area and estimates the tax saving only where the commission-income condition in the form is selected.",
      limits: "Home-office deductions have strict requirements, and salaried employees can face different limitations. Exclusive and regular use, the nature of employment and individual expense rules matter.",
      sources: ["personal"], related: ["tax-refund", "wear-and-tear"]
    },
    "wear-and-tear": {
      summary: "Estimate a straight-line annual wear-and-tear allowance for an asset used in earning income.",
      how: "Asset cost is spread over the useful life entered, apportioned for first-year months and business-use percentage.",
      limits: "SARS write-off periods and special allowances differ by asset type and circumstances. Confirm the appropriate period before filing.",
      sources: ["rates"], related: ["home-office", "tax-refund"]
    },
    "donations-tax": {
      summary: "Estimate donations tax after the selected year’s annual natural-person exemption and cumulative R30 million rate threshold.",
      how: "The annual exemption is deducted first. Taxable donations are then charged at 20% up to the cumulative threshold and 25% above it.",
      limits: "Many donations are specifically exempt, including certain spouse and approved public-benefit-organisation transfers. The donor normally carries the liability and filing obligation.",
      sources: ["donations"], related: ["tax-refund"]
    },
    "capital-gains": {
      summary: "Estimate capital gain, available exclusions, taxable inclusion and indicative tax when an asset is disposed of.",
      how: "Proceeds are reduced by base cost and entered improvement/selling costs. Applicable exclusions and assessed capital losses are considered before the entity-specific inclusion rate is applied.",
      limits: "Base-cost rules, valuation dates, rollovers, connected-person transactions and exclusions can be complex. Property and business disposals often need professional review.",
      sources: ["cgt"], related: ["crypto-tax", "transfer-cost", "tax-refund"]
    },
    "crypto-tax": {
      summary: "Compare a simplified capital-gain treatment with ordinary-income treatment for a crypto disposal.",
      how: "The selected intention determines whether the prototype routes the profit through CGT-style inclusion or treats it as additional ordinary taxable income.",
      limits: "SARS classification depends on facts and intention, not a user-selected label alone. Multiple trades, staking, mining, airdrops, exchange fees and cost-basis records are not fully modelled.",
      sources: ["personal", "cgt"], related: ["capital-gains", "provisional-check"]
    },
    "tfsa": {
      summary: "Project tax-free investment growth while checking annual and lifetime contribution limits for the selected tax year.",
      how: "Monthly contributions are accumulated and compounded using the return assumption. Contributions are limited to the selected year’s annual ceiling and the R500,000 lifetime cap.",
      limits: "The investment return is only an assumption. Actual product fees and performance are not modelled, and exceeding contribution limits can trigger a 40% tax charge on the excess.",
      sources: ["tfsa"], related: ["taxable-interest", "retirement-savings"]
    },
    "retirement-lump-sum": {
      summary: "Estimate tax on a retirement/death benefit or a pre-retirement withdrawal using the SARS lump-sum tables.",
      how: "SARS determines the rate cumulatively, so prior lump sums reduce the remaining lower-tax bands. The prototype subtracts the entered non-deductible contribution portion before applying the selected table.",
      limits: "A SARS tax directive is normally required for fund lump sums. Historical benefits and directive information can change the final tax.",
      sources: ["retirement"], related: ["two-pot", "retirement-savings", "retrenchment"]
    },
    "two-pot": {
      summary: "Estimate the income-tax effect of a retirement savings-component withdrawal and show an indicative split of new contributions between the two pots.",
      how: "Savings-component withdrawals are added to taxable income and taxed at the individual’s marginal income-tax rates rather than the retirement lump-sum table.",
      limits: "SARS issues a directive and may take outstanding tax debt into account. Fund fees, directive rates and actual fund balances are not confirmed by this tool.",
      sources: ["personal", "retirement"], related: ["retirement-lump-sum", "retirement-savings"]
    },
    "retirement-savings": {
      summary: "Estimate the section 11F retirement-fund deduction, unused contribution amount and possible income-tax saving.",
      how: "The deductible amount is limited using the selected year’s percentage and annual cap, then estimated tax before and after the deduction is compared.",
      limits: "The legal deduction also considers taxable-income limitations and prior excess contributions. This tool is an indicator, not a contribution recommendation.",
      sources: ["employer2027", "personal"], related: ["salary-tax", "tax-refund", "tfsa"]
    },
    "retrenchment": {
      summary: "Estimate the split between severance taxed under the retirement/severance lump-sum table and notice/leave pay taxed as ordinary income.",
      how: "The tool can use one week per completed year as a simple minimum-severance scenario, then applies the lump-sum table to severance and ordinary income rates to notice and leave pay.",
      limits: "Actual retrenchment packages, labour-law entitlements and SARS directives are fact-specific. This calculator is not labour-law advice.",
      sources: ["retirement", "employer2027"], related: ["retirement-lump-sum", "salary-tax"]
    },
    "transfer-cost": {
      summary: "Estimate SARS transfer duty on a property acquisition using the current transfer-duty table in the prototype.",
      how: "The property value is passed through the SARS progressive transfer-duty bands. The result is transfer duty only.",
      limits: "Conveyancing fees, Deeds Office charges, bond registration and other transaction costs are intentionally excluded. Transactions subject to VAT may not attract transfer duty.",
      sources: ["transfer"], related: ["capital-gains", "rental-income"]
    },
    "provisional-tax": {
      summary: "Create a simple annual tax estimate and indicative first and second provisional-tax payments after PAYE credits.",
      how: "The selected year’s personal tax table, rebates and medical credits are applied to estimated taxable income. The remaining liability is split into two indicative instalments.",
      limits: "IRP6 calculations use basic-amount and estimation rules, and underestimation can create penalties. Use this as planning support, not as a completed IRP6 calculation.",
      sources: ["provisional", "personal"], related: ["provisional-check", "rental-income", "small-business"]
    },
    "provisional-check": {
      summary: "A short screening tool for whether income outside ordinary salary PAYE may make you a provisional taxpayer.",
      how: "The questions test common salary-only and limited non-salary-income scenarios and return an indicative answer.",
      limits: "Provisional-tax definitions and exemptions contain detailed conditions. A ‘probably not’ result is not a SARS ruling.",
      sources: ["provisional"], related: ["provisional-tax", "rental-income"]
    },
    "vat": {
      summary: "Add 15% VAT to an exclusive amount or extract the VAT portion from an inclusive amount.",
      how: "For VAT-exclusive prices the tool multiplies by 1.15. For VAT-inclusive prices it divides by 1.15 to find the base amount and VAT portion.",
      limits: "Not every supply is standard-rated. Zero-rated, exempt and out-of-scope supplies require different treatment, and registration thresholds have eligibility conditions.",
      sources: ["vat"], related: ["small-business", "payroll-tax"]
    },
    "small-business": {
      summary: "Compare a selected tax regime: qualifying Small Business Corporation rates, standard 27% company tax, or turnover tax.",
      how: "The prototype applies the chosen SARS rate table to the amount entered. Turnover tax uses turnover, while company/SBC modes use taxable income.",
      limits: "SBC and turnover-tax status are subject to qualification tests. Do not choose a regime solely because this calculator shows a lower number.",
      sources: ["sbc", "turnover"], related: ["vat", "provisional-tax", "payroll-tax"]
    },
    "payroll-tax": {
      summary: "Estimate monthly PAYE, employee/employer UIF, SDL and employer cost for a simple equal-salary staff scenario.",
      how: "The tool multiplies a representative employee’s estimated PAYE and UIF by the number of staff and applies SDL where the annual payroll threshold is exceeded.",
      limits: "This is not a payroll engine. It assumes every employee earns the same salary and uses a simplified age/medical profile, so actual EMP201 values must be calculated employee by employee.",
      sources: ["employer2027", "uif"], related: ["salary-tax", "vat", "small-business"]
    }
  };

  const api = { SOURCES, INFO };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.CALC_INFO = api;
})();
