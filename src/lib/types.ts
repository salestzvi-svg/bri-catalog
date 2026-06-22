export interface RivhitItem {
  item_id: number;
  item_name: string;
  item_part_num: string | null;
  barcode: string | null;
  sale_nis: number;
  picture_link: string | null;
  quantity: number;
  item_group_id: number;
}

export interface ProductOverride {
  rivhit_item_id: number;
  custom_name: string | null;
  custom_price: number | null;
  custom_image: string | null;
  is_hidden: boolean;
  updated_at?: string | null;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_staging?: boolean;
}

export interface CatalogProduct {
  itemId: number;
  sku: string;
  name: string;
  price: number;
  image: string | null;
  categoryId: string;
  categoryName: string;
  categorySortOrder: number;
}

export interface Store {
  id: string;
  store_name: string;
  username: string;
  created_at: string;
  signup_channel?: WhatsAppChannel;
  last_login_channel?: WhatsAppChannel;
}

export interface CartItem {
  sku: string;
  quantity: number;
}

export interface StoreOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface StoreOrder {
  id: string;
  store_id: string;
  store_name: string;
  username: string;
  items: StoreOrderItem[];
  total_amount: number;
  notes: string | null;
  whatsapp_channel: WhatsAppChannel;
  created_at: string;
}

export interface RivhitCustomer {
  customer_id: number;
  last_name: string | null;
  first_name: string | null;
  street: string | null;
  city: string | null;
  zipcode: string | null;
  phone: string | null;
  email: string | null;
  id_number: number;
  vat_number: number;
  customer_type: number;
  agent_id: number;
}

export interface RivhitDocumentType {
  document_type: number;
  document_name: string;
  document_english_name: string;
  is_invoice_receipt: boolean;
}

export interface AgentAccount {
  id: string;
  username: string;
  rivhit_agent_id: number;
  rivhit_agent_name: string;
  is_active: boolean;
  created_at: string;
}

export interface SessionData {
  role: "store" | "admin" | "super_admin" | "agent" | "agent_manager";
  storeId?: string;
  storeName?: string;
  username?: string;
  whatsappChannel?: WhatsAppChannel;
  agentAccountId?: string;
  rivhitAgentId?: number;
  rivhitAgentName?: string;
}

export type WhatsAppChannel = "default" | "b";
