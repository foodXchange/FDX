import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CATEGORY_EMOJI: Record<string, string> = {
  "Oils & Fats": "🫒",
  "Fish & Seafood": "🐟",
  "Sauces & Condiments": "🍯",
  "Tomato Products": "🍅",
  Snacks: "🍿",
  "Spices & Herbs": "🌿",
  "Canned Foods": "🥫",
  Dairy: "🧀",
  Bakery: "🥖",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (!(await verifySession(session))) {
    return new Response("Unauthorised", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const bg = searchParams.get("bg") === "dark" ? "dark" : "light";

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("catalogue_products")
    .select(
      "id,product_name,brand_name,tagline,category,format,country_of_origin,certifications,catalogue_image_url"
    )
    .eq("id", id)
    .single();

  if (!data) {
    return new Response("Product not found", { status: 404 });
  }

  const certs = (data.certifications as string[]).slice(0, 3);
  const emoji = CATEGORY_EMOJI[data.category as string] ?? "📦";
  const isLight = bg === "light";

  const escapedName = escapeHtml(data.product_name as string);
  const escapedBrand = data.brand_name ? escapeHtml(data.brand_name as string) : null;
  const escapedTagline = data.tagline ? escapeHtml(data.tagline as string) : null;
  const escapedFormat = data.format ? escapeHtml(data.format as string) : null;
  const escapedCountry = data.country_of_origin
    ? escapeHtml(data.country_of_origin as string)
    : null;
  const detailRow = [escapedCountry, escapedFormat].filter(Boolean).join(" · ");

  const certBadgesHtml = certs
    .map((c) => {
      const isKosher = c.toLowerCase().includes("kosher");
      return `<div class="cert-badge${isKosher ? " kosher" : ""}">${escapeHtml(c)}</div>`;
    })
    .join("");

  const imageHtml = data.catalogue_image_url
    ? `<img class="product-image" src="${escapeHtml(data.catalogue_image_url as string)}" alt="${escapedName}" />`
    : `<div class="placeholder">${emoji}</div>`;

  const lightCard = `
<div class="card-light">
  <div class="accent-bar"></div>
  <div class="image-area">
    ${imageHtml}
  </div>
  <div class="bottom-strip">
    <div>
      ${escapedBrand ? `<div class="brand-name">${escapedBrand}</div>` : ""}
      <div class="product-name">${escapedName}</div>
      ${detailRow ? `<div class="detail-row">${detailRow}</div>` : ""}
    </div>
    <div class="meta-row">
      <div class="certs">${certBadgesHtml}</div>
      <div class="logo-area">
        <div class="logo">Food<span>X</span>change</div>
        <div class="logo-url">fdx.trading/en/products</div>
      </div>
    </div>
  </div>
</div>`;

  const darkCard = `
<div class="card-dark">
  <div style="height:8px;background:#ea580c"></div>
  <div class="image-area">
    <div class="image-bg">
      ${imageHtml}
    </div>
  </div>
  <div class="bottom-strip">
    <div>
      ${escapedBrand ? `<div class="brand-name">${escapedBrand}</div>` : ""}
      <div class="product-name">${escapedName}</div>
      ${detailRow ? `<div class="detail-row">${detailRow}</div>` : ""}
    </div>
    <div class="meta-row">
      <div class="certs">${certBadgesHtml}</div>
      <div>
        <div class="logo">Food<span>X</span>change</div>
        <div class="logo-url">fdx.trading/en/products</div>
      </div>
    </div>
  </div>
</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedBrand ?? escapedName} — Social Card</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
    }

    /* ─── LIGHT ─── */
    .card-light {
      width: 1080px;
      height: 1080px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .card-light .image-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 80px 40px;
    }
    .card-light .product-image {
      max-width: 700px;
      max-height: 700px;
      object-fit: contain;
    }
    .card-light .bottom-strip {
      height: 220px;
      padding: 24px 60px 36px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-light .brand-name {
      font-size: 18px;
      font-weight: 600;
      color: #ea580c;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .card-light .product-name {
      font-size: 42px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.1;
      margin-top: 6px;
    }
    .card-light .detail-row {
      font-size: 18px;
      color: #64748b;
      margin-top: 4px;
    }
    .card-light .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-light .certs {
      display: flex;
      gap: 10px;
    }
    .card-light .cert-badge {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 16px;
      color: #475569;
      font-weight: 500;
    }
    .card-light .cert-badge.kosher {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }
    .card-light .logo-area { text-align: right; }
    .card-light .logo {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .card-light .logo span { color: #ea580c; }
    .card-light .logo-url {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .card-light .placeholder {
      font-size: 120px;
      color: #e2e8f0;
    }

    /* ─── DARK ─── */
    .card-dark {
      width: 1080px;
      height: 1080px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .card-dark .image-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 50px 80px 30px;
    }
    .card-dark .image-bg {
      background: white;
      border-radius: 32px;
      padding: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 640px;
      height: 640px;
    }
    .card-dark .product-image {
      max-width: 560px;
      max-height: 560px;
      object-fit: contain;
    }
    .card-dark .bottom-strip {
      height: 220px;
      padding: 24px 60px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-dark .brand-name {
      font-size: 18px;
      font-weight: 600;
      color: #fb923c;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .card-dark .product-name {
      font-size: 42px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;
      margin-top: 6px;
    }
    .card-dark .detail-row {
      font-size: 18px;
      color: #64748b;
      margin-top: 4px;
    }
    .card-dark .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-dark .certs { display: flex; gap: 10px; }
    .card-dark .cert-badge {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 16px;
      color: #94a3b8;
      font-weight: 500;
    }
    .card-dark .cert-badge.kosher {
      background: rgba(59,130,246,0.15);
      border-color: rgba(59,130,246,0.3);
      color: #93c5fd;
    }
    .card-dark .logo {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      text-align: right;
    }
    .card-dark .logo span { color: #ea580c; }
    .card-dark .logo-url {
      font-size: 13px;
      color: #475569;
      margin-top: 2px;
      text-align: right;
    }
    .card-dark .placeholder {
      font-size: 120px;
      color: #334155;
    }

    /* ─── ACCENT BAR ─── */
    .accent-bar {
      height: 8px;
      background: #ea580c;
      width: 100%;
    }

    /* ─── SCREEN INSTRUCTIONS (hidden on print) ─── */
    .instructions {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #fef3c7;
      border-bottom: 1px solid #fcd34d;
      padding: 10px 16px;
      font-size: 13px;
      color: #92400e;
      text-align: center;
      z-index: 100;
    }
    @media print {
      .instructions { display: none; }
      html, body { overflow: visible; }
    }
  </style>
</head>
<body>

<div class="instructions">
  📸 <strong>To save as PNG:</strong>
  Press <kbd>Win+Shift+S</kbd> on Windows or <kbd>Cmd+Shift+4</kbd> on Mac,
  then select the card below. Zoom your browser to 100% for exact sizing.
  &nbsp;|&nbsp;
  <strong>Print to PDF:</strong> Ctrl+P → Save as PDF → uncheck headers/footers.
</div>

${isLight ? lightCard : darkCard}

<script>
  var params = new URLSearchParams(window.location.search);
  if (params.get('download') === 'true') {
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 500);
    });
  }
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
