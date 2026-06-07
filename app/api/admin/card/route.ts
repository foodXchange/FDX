import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle") ?? "udi";

  const { data, error } = await supabaseAdmin
    .from("contact_cards")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !data) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  return Response.json({ ok: true, card: data });
}

export async function PUT(req: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const card = body as {
    handle: string;
    name: string;
    title: string;
    company: string;
    tagline: string;
    pitch: string;
    email: string;
    phone: string;
    whatsapp_buyer: string;
    whatsapp_manufacturer: string;
    website: string;
    linkedin: string;
    photos: unknown[];
    active_sourcing: string[];
  };

  if (!card.handle) {
    return Response.json({ error: "Missing handle" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contact_cards")
    .upsert(
      {
        handle: card.handle,
        name: card.name,
        title: card.title,
        company: card.company,
        tagline: card.tagline,
        pitch: card.pitch,
        email: card.email,
        phone: card.phone,
        whatsapp_buyer: card.whatsapp_buyer,
        whatsapp_manufacturer: card.whatsapp_manufacturer,
        website: card.website,
        linkedin: card.linkedin,
        photos: card.photos,
        active_sourcing: card.active_sourcing,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "handle" }
    );

  if (error) {
    console.error("Card save error:", error);
    return Response.json({ error: "Failed to save card" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
