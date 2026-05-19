"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type PostListItem = {
  slug: string;
  title: string;
  status: "draft" | "review" | "scheduled" | "published";
  updated_at: string | null;
  published_at: string | null;
};

type Post = {
  title: string;
  slug: string;
  status: "draft" | "review" | "scheduled" | "published";
  excerpt: string;
  content: string; // HTML
  tags: string[];
  meta_title: string;
  meta_description: string;
  published_at: string | null;
  cover_image?: string | null;
  hero_image?: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function BlogEditorPage() {
  // ---- auth gate (simple password) ----
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const showGate = !authorized;

  // ---- data ----
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");

  const emptyPost: Post = {
    title: "",
    slug: "",
    status: "draft",
    excerpt: "",
    content: "<p></p>",
    tags: [],
    meta_title: "",
    meta_description: "",
    published_at: null,
  };

  const [post, setPost] = useState<Post>(emptyPost);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Tabs include a WYSIWYG visual editor and HTML fallback + Preview
  const [tab, setTab] = useState<"visual" | "html" | "preview" | "seo">("visual");

  // Help panel
  const [showHelp, setShowHelp] = useState(true);

  // Smart suggestions controls
  const [audienceMode, setAudienceMode] = useState<"buyers" | "manufacturers">("buyers");

  // WYSIWYG editor ref
  const editorRef = useRef<HTMLDivElement | null>(null);

  const selectedListItem = useMemo(
    () => posts.find((p) => p.slug === selectedSlug) || null,
    [posts, selectedSlug]
  );

  // ---- API calls ----
  async function loadList() {
    const res = await fetch("/api/blog/editor/posts");
    const json = await res.json();
    const list: PostListItem[] = json.posts || [];
    setPosts(list);
    if (!selectedSlug && list.length) setSelectedSlug(list[0].slug);
  }

  async function loadPost(slug: string) {
    const res = await fetch(`/api/blog/editor/post?slug=${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (json.post) setPost(json.post);
  }

  async function savePost() {
    setSaving(true);
    setStatusMsg("Saving…");

    // If user is in visual tab, ensure content is synced from editorRef
    if (tab === "visual" && editorRef.current) {
      setPost((p) => ({ ...p, content: editorRef.current!.innerHTML }));
    }

    const res = await fetch("/api/blog/editor/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        tab === "visual" && editorRef.current
          ? { ...post, content: editorRef.current.innerHTML }
          : post
      ),
    });

    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok || !json.ok) {
      setStatusMsg(json.error || "Save failed");
      return;
    }

    setStatusMsg("Saved ✅");
    await loadList();
    if (json.post?.slug) setSelectedSlug(json.post.slug);
    setTimeout(() => setStatusMsg(""), 1500);
  }

  function newDraft() {
    const s = `new-${Date.now()}`;
    const template = buildExampleTemplate("buyers", "New post");
    setPost({
      ...emptyPost,
      title: "New post",
      slug: s,
      status: "draft",
      content: template,
    });
    setSelectedSlug("");
    setTab("visual");
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = template;
    }, 0);
  }

  function tryAuthorize() {
    if (password === "3007") {
      setAuthorized(true);
      setStatusMsg("");
      setPassword("");
    } else {
      setStatusMsg("Wrong password");
    }
  }

  function setField<K extends keyof Post>(key: K, value: Post[K]) {
    setPost((p) => ({ ...p, [key]: value }));
  }

  function setTagsFromString(s: string) {
    const tags = s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
    setField("tags", tags);
  }

  // ---- effects ----
  useEffect(() => {
    if (!authorized) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    if (!selectedSlug) return;
    loadPost(selectedSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, selectedSlug]);

  // Sync content into contentEditable when switching to Visual
  useEffect(() => {
    if (tab !== "visual") return;
    if (!editorRef.current) return;
    editorRef.current.innerHTML = post.content || "<p></p>";
  }, [post.content, tab]);

  // ---- WYSIWYG commands ----
  // execCommand is deprecated but still widely supported; no standardized replacement yet. 
  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    // @ts-ignore
    document.execCommand(cmd, false, value);
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
  }

  function onEditorInput() {
    if (!editorRef.current) return;
    setField("content", editorRef.current.innerHTML);
  }

  // ---- Smart suggestions (auto structure + CTA generator) ----
  function buildCTA(mode: "buyers" | "manufacturers", title: string) {
    const safeTitle = escapeHtml(title || "this opportunity");

    if (mode === "buyers") {
      return `
        <hr/>
        <h2>Next step</h2>
        <p>If ${safeTitle} is relevant, we can move quickly to concrete supplier options and pricing scenarios.</p>
        <p>
          <a href="/en/contact">Start a sourcing project</a>
          &nbsp;|&nbsp;
          <a href="https://wa.me/972525222291" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </p>
      `;
    }

    // manufacturers
    return `
      <hr/>
      <h2>Want to enter the Israeli market?</h2>
      <p>If you produce ${safeTitle} and can support private label + exports, we can align on positioning and buyer introductions.</p>
      <p>
        <a href="/en/contact">Introduce your company</a>
        &nbsp;|&nbsp;
        <a href="https://wa.me/972525222291" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </p>
    `;
  }

  function buildExampleTemplate(mode: "buyers" | "manufacturers", title: string) {
    const safeTitle = escapeHtml(title || "the topic");

    const buyerAngle = `
      <h2>Introduction</h2>
      <p>Here’s the practical sourcing context around <strong>${safeTitle}</strong> and what buyers in Israel typically expect.</p>

      <h2>Market opportunity</h2>
      <p>What is changing in the market? What is driving demand (price, packaging, private label growth, supply stability)?</p>

      <h2>What to look for in a supplier</h2>
      <ul>
        <li>Export readiness and stable lead times</li>
        <li>Private label capability (pack formats, artwork support)</li>
        <li>Quality systems + traceability</li>
        <li>Kosher readiness (if applicable)</li>
      </ul>

      <h2>Common pitfalls</h2>
      <p>Where projects usually fail: unclear specs, hidden MOQ constraints, packaging limitations, or missing compliance documents.</p>

      <h2>Conclusion</h2>
      <p>Summarize the opportunity in 2–3 lines and what the next step is.</p>
    `;

    const manufacturerAngle = `
      <h2>Introduction</h2>
      <p>This note explains how <strong>${safeTitle}</strong> is positioned in Israel, and what buyers typically request.</p>

      <h2>Buyer expectations in Israel</h2>
      <ul>
        <li>Consistent quality and documentation (COA/Specs)</li>
        <li>Packaging formats suitable for supermarkets</li>
        <li>Competitive landed cost logic (not only EXW)</li>
        <li>Reliability: stable production and shipment planning</li>
      </ul>

      <h2>How to win private label</h2>
      <p>What makes you competitive: flexible packaging, clear MOQ, strong QA, fast responses, and export experience.</p>

      <h2>What we need from you</h2>
      <ul>
        <li>Product specs + pack formats</li>
        <li>Certifications (incl. kosher if possible)</li>
        <li>MOQ and lead time</li>
        <li>Export markets served</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Summarize the best-fit buyer profile and propose a next step.</p>
    `;

    return (mode === "buyers" ? buyerAngle : manufacturerAngle) + buildCTA(mode, title);
  }

  function applyAutoStructure() {
    const html = buildExampleTemplate(audienceMode, post.title || "New post");
    setField("content", html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setStatusMsg("Template applied ✅");
    setTimeout(() => setStatusMsg(""), 1200);
  }

  function appendCTA() {
    const cta = buildCTA(audienceMode, post.title || "this opportunity");
    const html = (editorRef.current?.innerHTML || post.content || "<p></p>") + cta;
    setField("content", html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setStatusMsg("CTA added ✅");
    setTimeout(() => setStatusMsg(""), 1200);
  }

  function insertSupplierChecklist() {
    const block = `
      <h2>Supplier checklist</h2>
      <ul>
        <li>MOQ / batch constraints</li>
        <li>Lead time + seasonal capacity</li>
        <li>Pack formats (cups, jars, cans, lids)</li>
        <li>Export docs (COA, allergens, specs)</li>
        <li>Kosher pathway (if required)</li>
      </ul>
    `;
    const html = (editorRef.current?.innerHTML || post.content || "<p></p>") + block;
    setField("content", html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setStatusMsg("Checklist added ✅");
    setTimeout(() => setStatusMsg(""), 1200);
  }

  return (
    <main className="bg-slate-50 min-h-screen py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <Link href="/en/admin" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            ← Back to Internal Tools
          </Link>

          <div className="flex gap-2 items-center">
            <button
              onClick={newDraft}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              title="Create a new draft post"
            >
              + New draft
            </button>

            <button
              onClick={savePost}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm disabled:opacity-60"
              title="Save changes to the database"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* LEFT: list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="font-semibold text-slate-900 mb-3">Posts</div>

            <div className="space-y-2 max-h-[72vh] overflow-auto pr-1">
              {posts.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setSelectedSlug(p.slug)}
                  className={[
                    "w-full text-left border rounded-xl p-3 hover:bg-slate-50 transition",
                    selectedSlug === p.slug ? "border-orange-300 bg-orange-50/40" : "border-slate-200 bg-white",
                  ].join(" ")}
                  title="Click to edit this post"
                >
                  <div className="text-sm font-semibold text-slate-900 line-clamp-2">{p.title}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {p.status} • {formatDate(p.updated_at || p.published_at)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">{p.slug}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: editor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Blog editor</div>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{post.title || "Untitled"}</h1>
                {selectedListItem?.published_at && (
                  <div className="text-xs text-slate-500 mt-1">
                    Published: {formatDate(selectedListItem.published_at)}
                  </div>
                )}
                {statusMsg && <div className="mt-2 text-sm text-slate-700">{statusMsg}</div>}
              </div>

              <div className="flex gap-2 items-center">
                {(["visual", "html", "preview", "seo"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      tab === t ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                    title={t === "visual" ? "Rich text editor" : t === "html" ? "Edit raw HTML" : t === "preview" ? "See final rendering" : "Edit SEO fields"}
                  >
                    {t === "visual" ? "Visual" : t === "html" ? "HTML" : t === "preview" ? "Preview" : "SEO"}
                  </button>
                ))}
              </div>
            </div>

            {/* HELP PANEL (onboarding inside the page) */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="text-sm text-orange-600 hover:underline"
              >
                {showHelp ? "Hide" : "Show"} editor guide
              </button>

              {showHelp && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 mb-2">Quick guide (recommended structure)</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use <strong>H2</strong> for section titles (clear structure).</li>
                    <li>Keep paragraphs short (2–3 lines) for readability.</li>
                    <li>Add a <strong>Supplier checklist</strong> if it’s a sourcing post.</li>
                    <li>Always end with a soft <strong>CTA</strong> (contact / WhatsApp).</li>
                    <li>Use <strong>Preview</strong> before publishing.</li>
                  </ul>
                  <div className="text-xs text-slate-500 mt-3">
                    Tip: Click “Auto structure” to insert a ready template, then fill the placeholders.
                  </div>
                </div>
              )}
            </div>

            {/* SMART SUGGESTIONS */}
            <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="font-semibold text-slate-900">Smart suggestions</div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Audience:</span>
                  <select
                    value={audienceMode}
                    onChange={(e) => setAudienceMode(e.target.value as any)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                    title="Pick the audience angle for template and CTA"
                  >
                    <option value="buyers">Buyers (Israel)</option>
                    <option value="manufacturers">Manufacturers (Exporters)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={applyAutoStructure}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm"
                  title="Insert a complete structured template + CTA"
                >
                  Auto structure + CTA
                </button>

                <button
                  type="button"
                  onClick={insertSupplierChecklist}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm"
                  title="Append a practical supplier checklist section"
                >
                  Add supplier checklist
                </button>

                <button
                  type="button"
                  onClick={appendCTA}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm"
                  title="Append a CTA block (contact + WhatsApp)"
                >
                  Add CTA only
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-sm font-semibold text-slate-800">Title</label>
                <input
                  value={post.title}
                  onChange={(e) => {
                    const t = e.target.value;
                    setField("title", t);
                    if (!post.slug || post.slug.startsWith("new-")) {
                      setField("slug", slugify(t) || `new-${Date.now()}`);
                    }
                  }}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Tomato paste cups — packaging risk"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">Slug</label>
                <input
                  value={post.slug}
                  onChange={(e) => setField("slug", slugify(e.target.value))}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="tomato-paste-cups-israel"
                />
                <div className="text-[11px] text-slate-500 mt-1">URL: /en/blog/{post.slug || "…"}</div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">Status</label>
                <select
                  value={post.status}
                  onChange={(e) => setField("status", e.target.value as any)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="review">review</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">Publish date (optional)</label>
                <input
                  type="datetime-local"
                  value={post.published_at ? post.published_at.slice(0, 16) : ""}
                  onChange={(e) =>
                    setField("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Excerpt</label>
                <textarea
                  value={post.excerpt || ""}
                  onChange={(e) => setField("excerpt", e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Short summary for SEO and previews…"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Tags (comma separated)</label>
                <input
                  value={(post.tags || []).join(", ")}
                  onChange={(e) => setTagsFromString(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="tomato paste, private label, packaging"
                />
              </div>

              <div className="md:col-span-2 flex gap-3 flex-wrap">
                <Link href="/en/admin/blog-cover" className="text-sm text-orange-600 hover:underline">
                  Manage cover/hero images →
                </Link>
                <Link href={`/en/blog/${post.slug}`} className="text-sm text-slate-700 hover:underline">
                  View on site →
                </Link>
              </div>
            </div>

            {/* Visual editor (with tooltips on buttons) */}
            {tab === "visual" && (
              <div className="mt-6">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center border border-slate-200 rounded-xl p-2 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => exec("formatBlock", "h2")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                    title="H2 — section title (recommended structure)"
                  >
                    H2
                  </button>

                  <button
                    type="button"
                    onClick={() => exec("bold")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 font-semibold"
                    title="Bold — emphasize key insight"
                  >
                    B
                  </button>

                  <button
                    type="button"
                    onClick={() => exec("insertUnorderedList")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                    title="Bullets — use for requirements / lists"
                  >
                    • List
                  </button>

                  <button
                    type="button"
                    onClick={() => exec("insertOrderedList")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                    title="Numbered list — use for steps / process"
                  >
                    1. List
                  </button>

                  <div className="w-px h-6 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => exec("undo")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                    title="Undo"
                  >
                    Undo
                  </button>

                  <button
                    type="button"
                    onClick={() => exec("redo")}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                    title="Redo"
                  >
                    Redo
                  </button>
                </div>

                {/* Editable area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={onEditorInput}
                  className="mt-3 border border-slate-200 rounded-xl p-4 min-h-[360px] outline-none bg-white prose prose-lg max-w-none"
                />
                <div className="text-xs text-slate-500 mt-2">
                  Formatting uses the browser’s built-in editing commands (widely supported, but officially deprecated). 
                </div>
              </div>
            )}

            {/* HTML editor */}
            {tab === "html" && (
              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-800">Content (HTML)</label>
                <textarea
                  value={post.content || ""}
                  onChange={(e) => setField("content", e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[360px] font-mono"
                  placeholder="<h2>Introduction</h2><p>Write your article…</p>"
                />
              </div>
            )}

            {/* Preview */}
            {tab === "preview" && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-800 mb-2">Live preview</div>
                <div
                  className="prose prose-lg max-w-none border border-slate-200 rounded-xl p-5 bg-slate-50"
                  dangerouslySetInnerHTML={{ __html: post.content || "" }}
                />
              </div>
            )}

            {/* SEO */}
            {tab === "seo" && (
              <div className="mt-6 grid gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-800">Meta title</label>
                  <input
                    value={post.meta_title || ""}
                    onChange={(e) => setField("meta_title", e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Optional override title for SEO"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">Meta description</label>
                  <textarea
                    value={post.meta_description || ""}
                    onChange={(e) => setField("meta_description", e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[90px]"
                    placeholder="Optional override description for SEO"
                  />
                </div>

                <div className="text-xs text-slate-500">
                  If meta fields are empty, your page should fall back to title/excerpt.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password overlay (fixed z-index + autofocus) */}
      {showGate && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4 text-center">Enter password</h2>

            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") tryAuthorize();
              }}
              className="w-full border px-3 py-2 mb-4 rounded"
              placeholder="Password"
            />

            <button onClick={tryAuthorize} className="w-full bg-orange-500 text-white py-2 rounded">
              Enter
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
