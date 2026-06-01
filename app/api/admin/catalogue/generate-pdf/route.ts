import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const Schema = z.object({
  product_ids: z.array(z.string().uuid()).min(1).max(30),
  buyer_name: z.string().optional(),
  presentation_title: z.string().optional(),
  save_presentation: z.boolean().default(false),
  buyer_id: z.string().uuid().optional(),
});

type ProductRow = {
  id: string;
  product_name: string;
  brand_name: string | null;
  format: string | null;
  catalogue_image_url: string | null;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSlot(product: ProductRow, layout: 1 | 2 | 3): string {
  const hasImage = !!product.catalogue_image_url;
  const displayName = escapeHtml(product.brand_name ?? product.product_name);
  const format = escapeHtml(product.format ?? "");

  if (hasImage) {
    return `
      <div class="product-slot">
        <img
          class="product-img"
          src="${escapeHtml(product.catalogue_image_url!)}"
          alt="${escapeHtml(product.product_name)}"
          loading="eager"
        />
      </div>`;
  }

  const placeholderHeight = layout === 1 ? "80%" : layout === 2 ? "75%" : "70%";
  return `
    <div class="product-slot">
      <div style="
        display:flex;align-items:center;justify-content:center;
        background:#f8fafc;border-radius:16px;
        flex:1;height:${placeholderHeight};width:100%;
      ">
        <div style="text-align:center;color:#94a3b8;padding:24px;">
          <div style="font-size:48px;margin-bottom:12px">📦</div>
          <div style="font-size:14px;font-weight:600;color:#64748b;">
            ${displayName}
          </div>
          ${format ? `<div style="font-size:12px;margin-top:4px;color:#94a3b8">${format}</div>` : ""}
        </div>
      </div>
    </div>`;
}

function buildPage(products: ProductRow[], layout: 1 | 2 | 3): string {
  const slots = products.map((p) => buildSlot(p, layout)).join("\n");
  return `
    <div class="page">
      <div class="layout-${layout}">
        ${slots}
      </div>
    </div>`;
}

function buildProductPages(products: ProductRow[]): string {
  let html = "";
  let i = 0;

  while (i < products.length) {
    const remaining = products.length - i;
    let layout: 1 | 2 | 3;
    if (remaining === 1) layout = 1;
    else if (remaining === 2) layout = 2;
    else layout = 3;

    const pageProducts = products.slice(i, i + layout);
    html += buildPage(pageProducts, layout);
    i += layout;
  }

  return html;
}

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 297mm;
  background: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

.page {
  width: 297mm;
  height: 210mm;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  page-break-after: always;
  page-break-inside: avoid;
  position: relative;
  overflow: hidden;
}

.page:last-child { page-break-after: auto; }

.layout-1 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20mm;
}

.layout-1 .product-img {
  max-width: 160mm;
  max-height: 170mm;
  object-fit: contain;
}

.layout-2 {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  padding: 15mm 20mm;
  gap: 15mm;
}

.layout-2 .product-slot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.layout-2 .product-img {
  max-width: 115mm;
  max-height: 170mm;
  object-fit: contain;
}

.layout-3 {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  padding: 12mm 15mm;
  gap: 8mm;
}

.layout-3 .product-slot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.layout-3 .product-img {
  max-width: 80mm;
  max-height: 170mm;
  object-fit: contain;
}

.qr-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: white;
}

.qr-logo {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.qr-logo span { color: #ea580c; }

.qr-tagline {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 32px;
  letter-spacing: 0.3px;
}

.qr-image {
  width: 160px;
  height: 160px;
  margin-bottom: 24px;
}

.qr-url {
  font-size: 14px;
  color: #ea580c;
  font-weight: 500;
  margin-bottom: 8px;
}

.qr-instruction {
  font-size: 12px;
  color: #94a3b8;
}

.qr-contact {
  margin-top: 24px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
  line-height: 1.8;
}

.print-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  gap: 10px;
}

.btn-print {
  background: #ea580c;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-close {
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
}

@media print {
  html, body { margin: 0; }
  .page { page-break-after: always; margin: 0; }
  .print-controls { display: none; }
}
`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { product_ids, buyer_name, presentation_title, save_presentation, buyer_id } = parsed.data;

  const { data: rawProducts, error } = await supabaseAdmin
    .from("catalogue_products")
    .select("id, product_name, brand_name, format, catalogue_image_url")
    .in("id", product_ids)
    .eq("status", "ready");

  if (error) {
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }

  // Preserve the order specified by product_ids
  const productMap = new Map((rawProducts ?? []).map((p) => [p.id as string, p as ProductRow]));
  const products = product_ids
    .map((id) => productMap.get(id))
    .filter((p): p is ProductRow => p !== undefined);

  if (products.length === 0) {
    return Response.json({ error: "No ready products found" }, { status: 400 });
  }

  const title = presentation_title ?? "FoodXchange — Product Selection";
  const productPages = buildProductPages(products);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${CSS}</style>
</head>
<body>

<div class="print-controls">
  <button class="btn-print" onclick="window.print()">Save as PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

${productPages}

<div class="page">
  <div class="qr-page">
    <div class="qr-logo">Food<span>X</span>change</div>
    <div class="qr-tagline">Strategic Sourcing · Israeli Market Entry</div>
    <img
      class="qr-image"
      src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://fdx.trading/c/udi"
      alt="Contact QR code"
    />
    <div class="qr-url">fdx.trading/c/udi</div>
    <div class="qr-instruction">Scan to save contact details</div>
    <div class="qr-contact">
      Udi Stryk · FoodXchange<br>
      info@foodz-x.com<br>
      fdx.trading
    </div>
  </div>
</div>

</body>
</html>`;

  if (save_presentation) {
    Promise.resolve(
      supabaseAdmin.from("catalogue_presentations").insert({
        buyer_id: buyer_id ?? null,
        buyer_name: buyer_name ?? null,
        product_ids,
        title,
        status: "draft",
      })
    ).catch(console.error);
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
