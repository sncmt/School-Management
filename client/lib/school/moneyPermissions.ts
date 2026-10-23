// Who sees the Fees and Finance pages (any one permission of each list); usable on the server
// (pages) and in the browser.

// collecting fees, payments, dues, what each class pays, fee types, online payment, fee rules
export const FEES_PERMISSIONS = [
  "payment:create",
  "payment:view",
  "student_fee:view",
  "fee_structure:view",
  "fee_type:view",
  "finance_report:view",
  "online_payment:manage",
];

// the school's funds, expenses, ledger and the money report
export const FINANCE_PERMISSIONS = ["fund:view", "fund:ledger", "expense:view", "finance_report:view"];
