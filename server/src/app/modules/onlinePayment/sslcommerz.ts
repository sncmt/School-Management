/*
 * The SSLCommerz API, as each school's own store uses it. Three calls:
 *   createSession   start a payment: SSLCommerz answers with the page to send the payer to
 *   validate        after a payment, confirm it with SSLCommerz by its val_id (never trust
 *                   what the browser brings back on its own)
 *   findByTranId    what SSLCommerz knows of one of our transactions (for payments left
 *                   hanging, and for testing a store's credentials)
 * Amounts are in BDT with two decimals.
 */

export type Store = { storeId: string; storePassword: string; sandbox: boolean };

const baseOf = (sandbox: boolean) => (sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com");

const TIMEOUT_MS = 20_000;

const request = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`SSLCommerz answered ${res.status} with no JSON`);
  }
};

export type SessionInput = {
  tranId: string;
  amount: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  productName: string;
  customer: { name: string; phone: string; email?: string | null; address?: string | null };
  // our own references, sent back to us with the result
  valueA?: string;
  valueB?: string;
};

export type SessionResult = { ok: true; gatewayUrl: string; sessionKey: string } | { ok: false; reason: string };

export const createSession = async (store: Store, input: SessionInput): Promise<SessionResult> => {
  const body = new URLSearchParams({
    store_id: store.storeId,
    store_passwd: store.storePassword,
    total_amount: input.amount,
    currency: "BDT",
    tran_id: input.tranId,
    success_url: input.successUrl,
    fail_url: input.failUrl,
    cancel_url: input.cancelUrl,
    ipn_url: input.ipnUrl,
    shipping_method: "NO",
    product_name: input.productName.slice(0, 250),
    product_category: "Education",
    product_profile: "non-physical-goods",
    num_of_item: "1",
    cus_name: input.customer.name.slice(0, 50) || "Guardian",
    cus_email: input.customer.email || "noreply@example.com",
    cus_add1: (input.customer.address || "Bangladesh").slice(0, 50),
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: input.customer.phone,
    ...(input.valueA ? { value_a: input.valueA } : {}),
    ...(input.valueB ? { value_b: input.valueB } : {}),
  });
  const data = await request(`${baseOf(store.sandbox)}/gwprocess/v4/api.php`, { method: "POST", body });
  if (data.status === "SUCCESS" && typeof data.GatewayPageURL === "string" && data.GatewayPageURL) {
    return { ok: true, gatewayUrl: data.GatewayPageURL, sessionKey: String(data.sessionkey ?? "") };
  }
  return { ok: false, reason: String(data.failedreason || data.status || "SSLCommerz refused the payment") };
};

export type Validation = {
  // VALID / VALIDATED: paid; anything else: not
  status: string;
  tranId: string;
  amount: string;
  currency: string;
  bankTranId: string | null;
  cardType: string | null;
  storeAmount: string | null;
  riskLevel: string | null;
  raw: Record<string, unknown>;
};

const toValidation = (d: Record<string, unknown>): Validation => ({
  status: String(d.status ?? ""),
  tranId: String(d.tran_id ?? ""),
  amount: String(d.amount ?? d.currency_amount ?? ""),
  currency: String(d.currency_type ?? d.currency ?? ""),
  bankTranId: d.bank_tran_id ? String(d.bank_tran_id) : null,
  cardType: d.card_type ? String(d.card_type) : null,
  storeAmount: d.store_amount ? String(d.store_amount) : null,
  riskLevel: d.risk_level !== undefined ? String(d.risk_level) : null,
  raw: d,
});

/* Confirms a payment by the val_id SSLCommerz gave us. */
export const validate = async (store: Store, valId: string) => {
  const params = new URLSearchParams({ val_id: valId, store_id: store.storeId, store_passwd: store.storePassword, v: "1", format: "json" });
  return toValidation(await request(`${baseOf(store.sandbox)}/validator/api/validationserverAPI.php?${params}`));
};

/*
 * What SSLCommerz knows of one of our transactions: its attempts, newest first (none when the
 * payer never got to pay). `apiOk` is false when SSLCommerz refused the store itself.
 */
export const findByTranId = async (store: Store, tranId: string) => {
  const params = new URLSearchParams({ tran_id: tranId, store_id: store.storeId, store_passwd: store.storePassword, format: "json" });
  const data = await request(`${baseOf(store.sandbox)}/validator/api/merchantTransIDvalidationAPI.php?${params}`);
  const rows = Array.isArray(data.element) ? (data.element as Record<string, unknown>[]) : [];
  return { apiOk: String(data.APIConnect ?? "").toUpperCase() === "DONE", apiStatus: String(data.APIConnect ?? data.status ?? ""), attempts: rows.map(toValidation) };
};

export const isPaid = (v: Pick<Validation, "status">) => v.status === "VALID" || v.status === "VALIDATED";
