import type {
  RivhitCustomer,
  RivhitDocumentType,
} from "./types";

const RIVHIT_BASE =
  process.env.RIVHIT_API_URL ??
  "https://api.rivhit.co.il/online/RivhitOnlineAPI.svc";

interface RivhitResponse<T> {
  error_code: number;
  client_message: string;
  debug_message: string;
  data: T;
}

async function rivhitRequest<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const apiToken = process.env.RIVHIT_API_TOKEN;
  if (!apiToken) {
    throw new Error("Missing RIVHIT_API_TOKEN");
  }

  const response = await fetch(`${RIVHIT_BASE}/${method}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ api_token: apiToken, ...body }),
    cache: "no-store",
  });

  const json = (await response.json()) as RivhitResponse<T>;

  if (!response.ok || json.error_code !== 0) {
    throw new Error(
      json.client_message ||
        json.debug_message ||
        `Rivhit HTTP error: ${response.status}`,
    );
  }

  return json.data;
}

/** סוג מסמך "הזמנה" בריווחית (Document.TypeList) */
export const RIVHIT_DEFAULT_ORDER_TYPE = 7;

/** סוגי מסמך זמינים לממשק סוכן */
export const AGENT_DOCUMENT_TYPE_IDS = [7, 1, 2, 3, 4, 6] as const;

export async function fetchRivhitCustomers(
  customerType = 1,
): Promise<RivhitCustomer[]> {
  const data = await rivhitRequest<{ customer_list: RivhitCustomer[] }>(
    "Customer.List",
    { customer_type: customerType },
  );
  return data.customer_list ?? [];
}

export async function fetchRivhitAgents(): Promise<RivhitCustomer[]> {
  return fetchRivhitCustomers(60);
}

export async function fetchRivhitDocumentTypes(): Promise<RivhitDocumentType[]> {
  const data = await rivhitRequest<{
    document_type_list: RivhitDocumentType[];
  }>("Document.TypeList", {});
  const list = data.document_type_list ?? [];
  return list.filter((t) =>
    (AGENT_DOCUMENT_TYPE_IDS as readonly number[]).includes(t.document_type),
  );
}

export interface NewRivhitCustomerInput {
  storeName: string;
  managerName: string;
  idNumber?: number;
  vatNumber?: number;
  phone?: string;
  address?: string;
  city?: string;
  email?: string;
  agentId: number;
}

export async function createRivhitCustomer(input: NewRivhitCustomerInput) {
  const body: Record<string, unknown> = {
    last_name: input.storeName.trim(),
    first_name: input.managerName.trim(),
    agent_id: input.agentId,
    customer_type: 1,
  };

  if (input.address?.trim()) body.street = input.address.trim();
  if (input.city?.trim()) body.city = input.city.trim();
  if (input.phone?.trim()) body.phone = input.phone.trim();
  if (input.email?.trim()) body.email = input.email.trim();
  if (input.idNumber && input.idNumber > 0) body.id_number = input.idNumber;
  if (input.vatNumber && input.vatNumber > 0) body.vat_number = input.vatNumber;

  return rivhitRequest<{ customer_id: number }>("Customer.New", body);
}

export async function updateRivhitCustomerAgent(
  customerId: number,
  agentId: number,
) {
  return rivhitRequest<{ customer_id: number }>("Customer.Update", {
    customer_id: customerId,
    agent_id: agentId,
  });
}

export interface DocumentItemInput {
  item_id: number;
  quantity: number;
  price_nis?: number;
}

export interface RivhitPaymentInput {
  payment_type: number;
  amount_nis: number;
  description?: string;
}

export async function createRivhitDocument(params: {
  documentType: number;
  customerId: number;
  agentId: number;
  items: DocumentItemInput[];
  comments?: string;
  payments?: RivhitPaymentInput[];
}) {
  const body: Record<string, unknown> = {
    document_type: params.documentType,
    customer_id: params.customerId,
    agent_id: params.agentId,
    items: params.items.map((item) => ({
      item_id: item.item_id,
      quantity: item.quantity,
      ...(item.price_nis && item.price_nis > 0
        ? { price_nis: item.price_nis }
        : {}),
    })),
  };

  if (params.comments?.trim()) {
    body.comments = params.comments.trim();
  }
  if (params.payments?.length) {
    body.payments = params.payments;
  }

  return rivhitRequest<{
    document_type: number;
    document_number: number;
    document_link?: string;
  }>("Document.New", body);
}
