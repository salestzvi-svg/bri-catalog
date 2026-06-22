import { NextResponse } from "next/server";
import { requireAgentSession } from "@/lib/auth";
import {
  createRivhitCustomer,
  fetchRivhitCustomers,
  updateRivhitCustomerAgent,
} from "@/lib/rivhit-documents";

function customerLabel(c: {
  last_name: string | null;
  first_name: string | null;
  customer_id: number;
}) {
  const store = (c.last_name ?? "").trim();
  const manager = (c.first_name ?? "").trim();
  if (store && manager) return `${store} (${manager})`;
  return store || manager || `#${c.customer_id}`;
}

function mapCustomer(c: {
  customer_id: number;
  last_name: string | null;
  first_name: string | null;
  phone: string | null;
  city: string | null;
  email: string | null;
  agent_id: number;
}) {
  return {
    id: c.customer_id,
    storeName: c.last_name ?? "",
    managerName: c.first_name ?? "",
    label: customerLabel(c),
    phone: c.phone ?? "",
    city: c.city ?? "",
    email: c.email ?? "",
    agentId: c.agent_id ?? 0,
  };
}

export async function GET() {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const customers = await fetchRivhitCustomers(1);
    return NextResponse.json({
      customers: customers.map(mapCustomer),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בטעינה" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = await request.json();
  const storeName = String(body.storeName ?? "").trim();
  const managerName = String(body.managerName ?? "").trim();

  if (!storeName || !managerName) {
    return NextResponse.json(
      { error: "שם חנות ושם מנהל הם שדות חובה" },
      { status: 400 },
    );
  }

  try {
    const idNumber = parseInt(String(body.idNumber ?? ""), 10);
    const vatNumber = parseInt(String(body.vatNumber ?? ""), 10);

    const result = await createRivhitCustomer({
      storeName,
      managerName,
      phone: body.phone,
      address: body.address,
      city: body.city,
      email: body.email,
      idNumber: Number.isFinite(idNumber) ? idNumber : undefined,
      vatNumber: Number.isFinite(vatNumber) ? vatNumber : undefined,
      agentId: session.rivhitAgentId!,
    });

    return NextResponse.json({
      customer: {
        id: result.customer_id,
        storeName,
        managerName,
        label: `${storeName} (${managerName})`,
        agentId: session.rivhitAgentId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה ביצירת לקוח" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { customerId } = await request.json();
  if (!customerId) {
    return NextResponse.json({ error: "חסר מזהה לקוח" }, { status: 400 });
  }

  try {
    await updateRivhitCustomerAgent(
      Number(customerId),
      session.rivhitAgentId!,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בעדכון" },
      { status: 500 },
    );
  }
}
