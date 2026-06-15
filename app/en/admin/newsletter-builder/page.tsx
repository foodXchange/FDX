"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type IssueSummary = {
  slug: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

type Issue = {
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "sent";
  subject: string;
  preview_text: string;
  content: string;
  intro: string;
  cta: string;
  selected_posts: string[];
  send_date: string | null;
  cover_image: string | null;
  cover_object_path: string | null;
};

type BlogPost = { slug: string; title: string; status: string };

type HistoryItem = {
  id: string;
  action: string;
  field_name: string;
  old_url: string | null;
  new_url: string | null;
  changed_at: string;
  trashed_object_path: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatDate(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }); }
  catch { return d; }
}

function stripHtml(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div"); div.innerHTML = html; return div.textContent || "";
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsletterBuilderPage() {

  // Issues list
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Current issue — preserves original: intro, cta, selected_posts, output
  const emptyIssue: Issue = {
    slug: "", title: "", status: "draft", subject: "", preview_text: "",
    content: "<p></p>", intro: "", cta: "", selected_posts: [],
    send_date: null, cover_image: null, cover_object_path: null,
  };
  const [issue, setIssue] = useState<Issue>(emptyIssue);
  const issueRef = useRef(emptyIssue);
  issueRef.current = issue;

  // Blog posts (original: posts)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // Generated HTML output (original: output)
  const [output, setOutput] = useState("");
  const [showOutputPanel, setShowOutputPanel] = useState(false);

  // UI
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [autosaveMsg, setAutosaveMsg] = useState("");
  const [tab, setTab] = useState<"content" | "cover" | "send" | "settings">("content");
  const [contentTab, setContentTab] = useState<"visual" | "html" | "preview">("visual");
  const [isDragOver, setIsDragOver] = useState(false);

  // Editor refs
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef("");

  // Image editor modal
  const [imageEditorSrc, setImageEditorSrc] = useState<string | null>(null);
  const [coverAlt, setCoverAlt] = useState("");
  const [altLoading, setAltLoading] = useState(false);
  const [imgPos, setImgPos] = useState({ x: 50, y: 50 });
  const [imgFlip, setImgFlip] = useState({ x: 1, y: 1 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");

  // History (settings tab)
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Send tab
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  // AI panel
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);
  const [aiPanelTab, setAiPanelTab] = useState<"chat" | "history" | "prompts">("chat");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const q = searchQuery.toLowerCase();
    return issues.filter(i => (i.title || "").toLowerCase().includes(q) || i.slug.toLowerCase().includes(q));
  }, [issues, searchQuery]);

  const wordCount = useMemo(() => {
    const text = stripHtml(issue.content || "");
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [issue.content]);

  const readingTime = useMemo(() => Math.max(1, Math.round(wordCount / 200)), [wordCount]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function setField<K extends keyof Issue>(key: K, value: Issue[K]) {
    setIssue(p => ({ ...p, [key]: value }));
  }

  function showStatus(msg: string, ms = 2500) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), ms);
  }

  // ─── API: Lists ─────────────────────────────────────────────────────────────

  async function loadIssues() {
    const res = await fetch("/api/newsletter/issues");
    const json = await res.json();
    const list: IssueSummary[] = json.issues || [];
    setIssues(list);
    if (!selectedSlug && list.length) setSelectedSlug(list[0].slug);
  }

  async function loadIssue(slug: string) {
    const res = await fetch(`/api/newsletter/issue?slug=${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (json.issue) {
      const raw = json.issue;
      setIssue({
        slug: raw.slug || "",
        title: raw.title || "",
        status: raw.status || "draft",
        subject: raw.subject || "",
        preview_text: raw.preview_text || "",
        content: raw.content || "<p></p>",
        intro: raw.intro || "",
        cta: raw.cta || "",
        selected_posts: Array.isArray(raw.selected_posts) ? raw.selected_posts : [],
        send_date: raw.send_date || null,
        cover_image: raw.cover_image || null,
        cover_object_path: raw.cover_object_path || null,
      });
      lastSavedRef.current = raw.content || "";
    }
  }

  // Loads blog posts — original loadPosts() preserved
  async function loadPosts() {
    const res = await fetch("/api/blog/editor/posts");
    const json = await res.json();
    setBlogPosts(json.posts || []);
  }

  async function loadSubscriberCount() {
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const json = await res.json();
      setSubscriberCount(json.count ?? 0);
    } catch { setSubscriberCount(0); }
  }

  async function loadHistory(slug: string) {
    const res = await fetch(`/api/newsletter/history?slug=${encodeURIComponent(slug)}`);
    const json = await res.json();
    setHistory(json.history || []);
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  async function saveIssue(silent = false) {
    if (!silent) { setSaving(true); setStatusMsg("Saving…"); }
    const p = issueRef.current;
    const content = contentTab === "visual" && editorRef.current ? editorRef.current.innerHTML : p.content;

    const res = await fetch("/api/newsletter/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, content }),
    });
    const json = await res.json().catch(() => ({}));
    if (!silent) setSaving(false);

    if (!res.ok || !json.ok) {
      if (!silent) showStatus(json.error || "Save failed ✗");
      return;
    }

    lastSavedRef.current = content;
    if (silent) {
      const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setAutosaveMsg(`Autosaved ${now}`);
    } else {
      showStatus("Saved ✓");
      await loadIssues();
      if (json.issue?.slug) setSelectedSlug(json.issue.slug);
    }
  }

  // ─── New issue ──────────────────────────────────────────────────────────────

  function newIssue() {
    const slug = `issue-${Date.now()}`;
    setIssue({ ...emptyIssue, title: "New issue", slug });
    setSelectedSlug("");
    setOutput("");
    setTab("content");
    setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = "<p></p>"; editorRef.current.focus(); } }, 50);
  }

  // ─── HTML Generator — original generate() logic preserved ───────────────────

  function toggle(slug: string) {
    setIssue(p => ({
      ...p,
      selected_posts: p.selected_posts.includes(slug)
        ? p.selected_posts.filter(s => s !== slug)
        : [...p.selected_posts, slug],
    }));
  }

  function generate() {
    const selectedPosts = blogPosts.filter(p => issue.selected_posts.includes(p.slug));
    const articlesHtml = selectedPosts.map(p => `
      <div style="margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #f1f5f9;">
        <h3 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 10px;">${p.title}</h3>
        <a href="https://fdx.trading/en/blog/${p.slug}" style="display:inline-block;color:#f97316;font-size:13px;font-weight:600;text-decoration:none;border-bottom:1px solid #fed7aa;padding-bottom:1px;">
          Read full article →
        </a>
      </div>`).join("");

    const coverHtml = issue.cover_image
      ? `<div style="margin-bottom:0;"><img src="${issue.cover_image}" alt="${issue.title}" style="width:100%;display:block;max-height:280px;object-fit:cover;" /></div>`
      : "";

    const fullHtml = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;">
  <div style="background:#0f172a;padding:24px 32px;">
    <div style="color:#f97316;font-size:18px;font-weight:800;letter-spacing:-0.5px;">FoodXchange</div>
    <div style="color:#94a3b8;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Strategic Sourcing · Israeli Market</div>
  </div>
  ${coverHtml}
  <div style="padding:32px;">
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 20px;line-height:1.3;">${issue.title || "FoodXchange Newsletter"}</h2>
    ${issue.subject ? `<div style="font-size:13px;color:#f97316;font-weight:600;margin-bottom:20px;padding:10px 16px;background:#fff7ed;border-radius:6px;border-left:3px solid #f97316;">${issue.subject}</div>` : ""}
    <div style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:32px;">${issue.intro || "Here are the latest sourcing insights and opportunities from the Israeli food market."}</div>
    ${articlesHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
    <div style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:24px;">${issue.cta || "If you're exploring sourcing opportunities for the Israeli market, feel free to reach out."}</div>
    <a href="mailto:info@fdx.trading" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Contact FoodXchange →</a>
  </div>
  <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <div style="font-size:11px;color:#94a3b8;">© 2026 FOODZXCHANGE · Tel Aviv, Israel · Company ID: 516970936</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:6px;">You received this because you subscribed at fdx.trading. <a href="#" style="color:#94a3b8;">Unsubscribe</a></div>
  </div>
</div>`;
    setOutput(fullHtml);
    setShowOutputPanel(true);
    showStatus("HTML generated ✓");
  }

  // ─── Cover image upload ──────────────────────────────────────────────────────

  async function uploadCoverImage(file: File) {
    if (!file.type.startsWith("image/")) { showStatus("Only image files supported ✗"); return; }
    if (!issue.slug) { showStatus("Save the issue first to set a cover image ✗"); return; }
    setCoverUploading(true); showStatus("Uploading cover…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/blog/upload-image", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadJson.url) { showStatus(uploadJson.error || "Upload failed ✗"); return; }
      // Call set-cover API to track in history
      const coverRes = await fetch("/api/newsletter/set-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: issue.slug, action: "replace", cover_image: uploadJson.url, cover_object_path: uploadJson.path || "" }),
      });
      const coverJson = await coverRes.json().catch(() => ({}));
      if (!coverRes.ok || !coverJson.ok) {
        // Fall back: just set the URL locally even if history fails
        setField("cover_image", uploadJson.url);
      } else {
        setField("cover_image", uploadJson.url);
        setField("cover_object_path", uploadJson.path || "");
      }
      showStatus("Cover uploaded ✓");
      if (issue.slug) loadHistory(issue.slug);
    } catch { showStatus("Upload failed ✗"); }
    finally { setCoverUploading(false); }
  }

  async function deleteCover() {
    if (!issue.slug || !issue.cover_image) return;
    const res = await fetch("/api/newsletter/set-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: issue.slug, action: "delete" }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) { setField("cover_image", null); setField("cover_object_path", null); showStatus("Cover removed ✓"); }
    else showStatus(json.error || "Remove failed ✗");
  }

  async function restoreCoverFromHistory(item: HistoryItem) {
    if (!item.trashed_object_path || !issue.slug) return;
    const res = await fetch("/api/newsletter/restore-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: issue.slug, trashed_object_path: item.trashed_object_path }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok && json.url) { setField("cover_image", json.url); showStatus("Cover restored ✓"); loadHistory(issue.slug); }
    else showStatus(json.error || "Restore failed ✗");
  }

  // ─── Image drag-to-pan ───────────────────────────────────────────────────────

  function onImgMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragStartRef.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y };
    setIsDraggingImg(true);
  }

  useEffect(() => {
    if (!isDraggingImg) return;
    function onMove(e: MouseEvent) {
      if (!dragStartRef.current || !imgContainerRef.current) return;
      const rect = imgContainerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.my) / rect.height) * 100;
      setImgPos({
        x: Math.max(0, Math.min(100, dragStartRef.current.px - dx)),
        y: Math.max(0, Math.min(100, dragStartRef.current.py - dy)),
      });
    }
    function onUp() { setIsDraggingImg(false); dragStartRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDraggingImg]);

  // ─── WYSIWYG ────────────────────────────────────────────────────────────────

  const exec = useCallback((cmd: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, value ?? undefined);
    setField("content", editorRef.current.innerHTML);
  }, []);

  function onEditorInput() {
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
  }

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const ctrl = navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey;
    if (!ctrl) return;
    switch (e.key.toLowerCase()) {
      case "b": e.preventDefault(); exec("bold"); return;
      case "i": e.preventDefault(); exec("italic"); return;
      case "u": e.preventDefault(); exec("underline"); return;
      case "s": e.preventDefault(); saveIssue(); return;
    }
  }, [exec]);

  // ─── AI ─────────────────────────────────────────────────────────────────────

  async function callAI(userPrompt: string): Promise<string> {
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "You are an email marketing expert for a B2B food sourcing platform. Respond ONLY with valid JSON — no markdown, no backticks.", user: userPrompt }),
    });
    if (!res.ok || !res.body) throw new Error("API error");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    let accumulated = ""; let buffer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
      for (const line of lines) { if (!line.startsWith("data: ")) continue; const chunk = line.slice(6); if (chunk === "[DONE]") break; accumulated += chunk; }
    }
    return accumulated.trim();
  }

  async function sendChatMessage(overrideMsg?: string) {
    const userMsg = (overrideMsg ?? chatInput).trim();
    if (!userMsg || chatLoading) return;
    setChatInput(""); setChatLoading(true);
    const newMessages = [...chatMessages, { role: "user" as const, text: userMsg }];
    setChatMessages(newMessages);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    const context = `Newsletter: "${issue.title || "untitled"}" | Status: ${issue.status} | Subject: ${issue.subject || "none"} | Words: ${wordCount}`;
    const system = `You are an AI assistant for a newsletter CMS at FoodXchange — a B2B food sourcing platform for the Israeli market. ${context}. Be concise and practical.`;
    const history_text = newMessages.map(m => (m.role === "user" ? "User" : "Assistant") + ": " + m.text).join("\n");
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, user: history_text }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let accumulated = ""; let buffer = "";
      setChatMessages(prev => [...prev, { role: "assistant", text: "" }]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6); if (chunk === "[DONE]") break;
          accumulated += chunk;
          setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", text: accumulated }; return u; });
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Check the API key." }]);
    } finally { setChatLoading(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  }

  async function generateSubjectLines() {
    try {
      const raw = await callAI(`Generate 5 email subject lines for this newsletter issue. Title: "${issue.title}". Content preview: "${stripHtml(issue.content).slice(0, 400)}". Return JSON: {"subjects":["curiosity angle","benefit angle","urgency angle","question angle","emoji angle"]}`);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.subjects?.length) {
        const text = "Subject line options:\n" + parsed.subjects.map((s: string, i: number) => `${i+1}. ${s}`).join("\n") + "\n\nClick any to use it as your subject line.";
        setShowAIPanel(true); setAiPanelTab("chat");
        setTimeout(() => sendChatMessage(`I have these subject line options, which do you recommend for a B2B Israeli food market audience?\n${parsed.subjects.join("\n")}`), 100);
        setChatMessages(prev => [...prev, { role: "assistant", text }]);
      }
    } catch { showStatus("Subject line generation failed ✗"); }
  }

  async function generatePreviewText() {
    if (!issue.subject) { showStatus("Fill in the subject line first ✗"); return; }
    try {
      const raw = await callAI(`Write a preview text (shown in email clients after the subject line) that complements this subject: "${issue.subject}". Max 90 chars. Return JSON: {"preview_text":"..."}`);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.preview_text) { setField("preview_text", parsed.preview_text); showStatus("Preview text generated ✓"); }
    } catch { showStatus("Preview text generation failed ✗"); }
  }

  async function generateAltText(imageUrl: string): Promise<string> {
    setAltLoading(true);
    try {
      const raw = await callAI(`Write alt text for this image URL (max 125 chars, describe visual content relevant to food/sourcing): ${imageUrl}. Return only the alt text string.`);
      return raw.replace(/^["']|["']$/g, "").trim().slice(0, 125);
    } catch { return ""; }
    finally { setAltLoading(false); }
  }

  // ─── Pre-send checklist ──────────────────────────────────────────────────────

  function getChecklist() {
    return [
      { label: "Subject line filled", ok: !!issue.subject.trim() },
      { label: "Preview text filled", ok: !!issue.preview_text.trim() },
      { label: "Cover image uploaded", ok: !!issue.cover_image },
      { label: "Content written (min 100 words)", ok: wordCount >= 100 },
      { label: "Send date set", ok: !!issue.send_date },
      { label: "Subscriber count confirmed", ok: subscriberCount !== null && subscriberCount > 0 },
    ];
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { loadIssues(); loadPosts(); loadSubscriberCount(); }, []);

  useEffect(() => { if (!selectedSlug) return; loadIssue(selectedSlug); loadHistory(selectedSlug); }, [selectedSlug]);

  useEffect(() => {
    if (contentTab !== "visual" || !editorRef.current) return;
    if (editorRef.current.innerHTML !== issue.content) editorRef.current.innerHTML = issue.content || "<p></p>";
  }, [issue.content, contentTab]);

  useEffect(() => {
    autosaveTimerRef.current = setInterval(async () => {
      const p = issueRef.current;
      const currentContent = editorRef.current?.innerHTML || p.content || "";
      if (!p.slug || currentContent === lastSavedRef.current) return;
      const res = await fetch("/api/newsletter/issue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, content: currentContent }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { lastSavedRef.current = currentContent; const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); setAutosaveMsg("Autosaved " + now); }
    }, 30_000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const checklist = getChecklist();
  const allChecksOk = checklist.every(c => c.ok);
  const checkScore = checklist.filter(c => c.ok).length;

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>

      {/* ── CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .editor-area{direction:ltr;text-align:left;unicode-bidi:embed}
        .editor-area:empty::before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none;display:block}
        .editor-area h2{font-size:1.35rem;font-weight:700;margin:1.25em 0 0.5em;color:#1e293b}
        .editor-area h3{font-size:1.1rem;font-weight:600;margin:1em 0 0.4em;color:#334155}
        .editor-area p{margin:0 0 0.85em;line-height:1.7;color:#374151}
        .editor-area ul,.editor-area ol{padding-left:1.5em;margin:0.5em 0 1em}
        .editor-area li{margin:0.25em 0;line-height:1.6;color:#374151}
        .editor-area strong{font-weight:700;color:#111827}
        .editor-area a{color:#ea580c;text-decoration:underline}
        .editor-area img{max-width:100%;border-radius:8px;margin:12px 0}
        .tab-btn{transition:all 0.15s ease;padding:7px 14px;border-radius:8px;font-size:13px;font-weight:500;border:1px solid transparent;color:#6b7280;cursor:pointer;background:transparent}
        .tab-btn:hover{background:#f9fafb;color:#374151}
        .tab-btn.active{background:#fff7ed;border-color:#fb923c;color:#c2410c;font-weight:600}
        .toolbar-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;font-size:13px;font-weight:500;border:1px solid #e2e8f0;background:#fff;color:#374151;cursor:pointer;transition:all 0.12s}
        .toolbar-btn:hover{background:#f8fafc;border-color:#cbd5e1}
        .issue-item{transition:all 0.12s;cursor:pointer;border-radius:12px;border:1px solid transparent;padding:10px 12px;margin-bottom:4px}
        .issue-item:hover{background:#fafafa;border-color:#e5e7eb}
        .issue-item.active{background:#fff7ed;border-color:#fdba74}
        .ai-panel{position:fixed;right:0;top:57px;bottom:0;width:380px;background:#fff;border-left:1px solid #e5e7eb;display:flex;flex-direction:column;z-index:40;box-shadow:-4px 0 24px rgba(0,0,0,0.07);transition:all 0.2s ease}
        .ai-panel.expanded{width:100vw;left:0;top:0;bottom:0}
        .chat-bubble-user{background:#f3f0ff;color:#3730a3;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13px;line-height:1.55;max-width:85%;align-self:flex-end;white-space:pre-wrap}
        .chat-bubble-ai{background:#f8fafc;border:1px solid #e2e8f0;color:#1e293b;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:13px;line-height:1.65;max-width:95%;align-self:flex-start;white-space:pre-wrap}
        .panel-tab{font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;cursor:pointer;border:none;background:transparent;color:#9ca3af;transition:all 0.12s}
        .panel-tab.active{background:rgba(255,255,255,0.15);color:#fff}
        .quick-chip{font-size:11px;padding:5px 10px;border-radius:99px;border:1px solid #e2e8f0;background:#f8fafc;color:#4b5563;cursor:pointer;white-space:nowrap;transition:all 0.12s}
        .quick-chip:hover{background:#f3f0ff;border-color:#c4b5fd;color:#6d28d9}
        .drop-overlay{pointer-events:none;position:absolute;inset:0;border:2.5px dashed #f97316;background:rgba(255,247,237,0.88);border-radius:16px;display:flex;align-items:center;justify-content:center;z-index:10}
        @keyframes ai-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .ai-pulse{animation:ai-pulse 1.4s ease-in-out infinite}
      `}} />

      {/* Hidden file input */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadCoverImage(f); e.target.value = ""; }} />

      {/* ── TOP NAV ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-orange-600 hover:text-orange-700 font-medium">← Admin</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">Newsletter CMS</span>
          {statusMsg && (
            <span className={`text-sm px-3 py-1 rounded-full ${
              statusMsg.includes("✓") ? "bg-green-50 text-green-700" :
              statusMsg.includes("✗") || statusMsg.includes("failed") ? "bg-red-50 text-red-700" :
              "bg-orange-50 text-orange-700"
            }`}>{statusMsg}</span>
          )}
          {!statusMsg && autosaveMsg && <span className="text-xs text-gray-400">{autosaveMsg}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">{wordCount} words · ~{readingTime} min</span>
          <button onClick={() => { setShowAIPanel(v => !v); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${showAIPanel ? "bg-purple-600 text-white" : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"}`}>
            <span style={{ fontSize: "15px" }}>✦</span> AI Assistant
          </button>
          <button onClick={newIssue} className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
            + New issue
          </button>
          <button onClick={() => saveIssue()} disabled={saving} className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── AI PANEL ── */}
      {showAIPanel && (
        <div className={`ai-panel${aiPanelExpanded ? " expanded" : ""}`}>
          <div style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", padding: "12px 16px" }} className="flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-semibold text-sm flex items-center gap-2"><span>✦</span> AI Assistant</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setAiPanelExpanded(v => !v)} className="text-purple-200 hover:text-white px-2 py-0.5 rounded text-xs font-medium hover:bg-white/10">
                  {aiPanelExpanded ? "⊡ Collapse" : "⊞ Expand"}
                </button>
                <button onClick={() => { setShowAIPanel(false); setAiPanelExpanded(false); }} className="text-purple-200 hover:text-white text-xl leading-none ml-1">×</button>
              </div>
            </div>
            <div className="flex gap-1">
              <button className={`panel-tab ${aiPanelTab === "chat" ? "active" : ""}`} onClick={() => setAiPanelTab("chat")}>Chat</button>
              <button className={`panel-tab ${aiPanelTab === "history" ? "active" : ""}`} onClick={() => setAiPanelTab("history")}>History</button>
              <button className={`panel-tab ${aiPanelTab === "prompts" ? "active" : ""}`} onClick={() => setAiPanelTab("prompts")}>Prompts</button>
            </div>
          </div>

          {/* Context banner */}
          <div className="flex-shrink-0 px-4 py-2 flex items-center gap-2 bg-fuchsia-50 border-b border-fuchsia-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">Issue</span>
            <span className="text-xs font-semibold text-purple-900 truncate">{issue.title || "No issue selected"}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${STATUS_COLORS[issue.status] || "bg-gray-100 text-gray-600"}`}>{issue.status}</span>
          </div>

          {/* Quick chips (newsletter-specific) */}
          {aiPanelTab === "chat" && (
            <div className="flex-shrink-0 px-3 py-2.5 border-b border-gray-100 flex flex-wrap gap-1.5 overflow-x-auto">
              {[
                ["✍ Write intro", "Write an engaging opening paragraph for a newsletter titled: " + (issue.title || "Food Industry Update")],
                ["📧 Subject lines", () => generateSubjectLines()],
                ["👁 Preview text", () => generatePreviewText()],
                ["📝 Summarize", "Summarize this newsletter issue in 2 sentences: " + stripHtml(issue.content).slice(0, 600)],
                ["🇮🇱 Israeli angle", "How should I frame this newsletter content for Israeli food importers and supermarket buyers?"],
                ["⏰ Best send time", "What is the best day and time to send a B2B newsletter to Israeli food industry professionals?"],
              ].map(([label, action]) => (
                <button key={label as string} onClick={() => typeof action === "function" ? action() : sendChatMessage(action as string)}
                  className="quick-chip">{label as string}</button>
              ))}
            </div>
          )}

          {aiPanelTab === "chat" && (
            <>
              <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-3 min-h-0">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>✦</div>
                    <div className="text-sm font-semibold text-gray-600 mb-1">Newsletter AI Assistant</div>
                    <div className="text-xs text-gray-400">Ask anything about your newsletter, email copy, subject lines, or the Israeli market.</div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "chat-bubble-user self-end" : "chat-bubble-ai self-start"}>{m.text || <span className="ai-pulse text-purple-400">✦ thinking…</span>}</div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex-shrink-0 p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Ask about email copy, subject lines…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                  <button onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>Send</button>
                </div>
              </div>
            </>
          )}

          {aiPanelTab === "history" && (
            <div className="flex-1 overflow-auto p-4">
              <div className="text-center py-12">
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📭</div>
                <div className="text-sm text-gray-500">Chat history saved automatically after each exchange.</div>
              </div>
            </div>
          )}

          {aiPanelTab === "prompts" && (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {[
                  ["Write subject line — 5 angles", "Generate 5 email subject lines for a food industry newsletter. Cover: curiosity, benefit, urgency, question, and emoji angles. Each under 60 chars."],
                  ["Write preview text", "Write a preview text (90 chars max) for an email with subject: " + (issue.subject || "[your subject]")],
                  ["Newsletter intro — urgency", "Write an engaging newsletter intro that opens with a market trend or insight. First sentence should hook the reader immediately."],
                  ["Summarize issue", "Summarize the main points of this newsletter in 3 bullet points. Be specific and actionable."],
                  ["CTA paragraph", "Write a strong call-to-action paragraph for a food sourcing newsletter. Encourage readers to reach out about sourcing opportunities in Israel."],
                  ["Best send time — Israeli B2B", "What are the optimal days and times to send email newsletters to B2B food industry professionals in Israel? Consider cultural and market factors."],
                ].map(([name, text]) => (
                  <div key={name} className="border border-gray-100 rounded-xl p-3 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition"
                    onClick={() => { setAiPanelTab("chat"); sendChatMessage(text); }}>
                    <div className="text-xs font-semibold text-gray-700 mb-1">{name}</div>
                    <div className="text-[11px] text-gray-400 line-clamp-2">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BODY: sidebar + main ── */}
      <div className={`flex flex-1 min-h-0 ${showAIPanel && !aiPanelExpanded ? "mr-[380px]" : ""}`}>

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search issues…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-gray-50" />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredIssues.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                {issues.length === 0 ? "No issues yet — create one" : "No matches"}
              </div>
            )}
            {filteredIssues.map(iss => (
              <div key={iss.slug} onClick={() => setSelectedSlug(iss.slug)}
                className={`issue-item ${selectedSlug === iss.slug ? "active" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[iss.status || "draft"] || "bg-gray-100 text-gray-600"}`}>
                    {iss.status || "draft"}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-800 truncate">{iss.title || iss.slug}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(iss.created_at)}</div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <button onClick={newIssue} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-sm text-gray-500 hover:text-orange-600 font-medium transition">
              + New issue
            </button>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white px-6 py-2 flex items-center gap-1 flex-shrink-0">
            {(["content", "cover", "send", "settings"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`tab-btn ${tab === t ? "active" : ""}`}>
                {{ content: "📧 Content", cover: "🖼 Cover image", send: "📤 Send", settings: "⚙ Settings" }[t]}
              </button>
            ))}
            {issue.slug && (
              <a href={`/en/newsletter/${issue.slug}`} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs text-gray-400 hover:underline">View →</a>
            )}
          </div>

          {/* ─ TAB: CONTENT ─ */}
          {tab === "content" && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

                {/* Title */}
                <input value={issue.title}
                  onChange={e => { setField("title", e.target.value); if (!selectedSlug) setField("slug", slugify(e.target.value) || `issue-${Date.now()}`); }}
                  placeholder="Issue title…"
                  className="w-full text-3xl font-black text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 leading-tight" />

                {/* Metadata row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Slug</label>
                    <input value={issue.slug} onChange={e => setField("slug", e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 mt-0.5 font-mono bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</label>
                    <select value={issue.status} onChange={e => setField("status", e.target.value as Issue["status"])}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 mt-0.5 bg-white">
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Send date</label>
                    <input type="datetime-local" value={issue.send_date || ""} onChange={e => setField("send_date", e.target.value || null)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 mt-0.5 bg-white" />
                  </div>
                  <div className="flex items-end">
                    <span className={`text-xs px-2 py-1.5 rounded-lg font-semibold ${STATUS_COLORS[issue.status]}`}>{issue.status}</span>
                  </div>
                </div>

                {/* Subject + preview text — most important fields */}
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2">
                      📧 Email subject line
                      <button onClick={generateSubjectLines} className="text-[10px] font-semibold bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-0.5 rounded-full transition">
                        ✦ Generate options
                      </button>
                    </label>
                    <input value={issue.subject} onChange={e => setField("subject", e.target.value)}
                      placeholder="The subject recipients see in their inbox…"
                      className="w-full mt-1.5 bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 font-medium" />
                    <div className="text-[10px] text-orange-600 mt-1">{issue.subject.length}/60 chars recommended</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2">
                      👁 Preview text
                      <button onClick={generatePreviewText} className="text-[10px] font-semibold bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-0.5 rounded-full transition">
                        ✦ Generate
                      </button>
                    </label>
                    <input value={issue.preview_text} onChange={e => setField("preview_text", e.target.value)}
                      placeholder="Shown after subject in email client preview…"
                      className="w-full mt-1.5 bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                    <div className="text-[10px] text-orange-600 mt-1">{issue.preview_text.length}/90 chars recommended</div>
                  </div>
                </div>

                {/* Content editor */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Toolbar */}
                  <div className="border-b border-gray-100 p-2 flex items-center gap-1 flex-wrap bg-gray-50/80">
                    <div className="flex gap-1 mr-2">
                      {(["visual", "html", "preview"] as const).map(t => (
                        <button key={t} onClick={() => setContentTab(t)} className={`tab-btn text-xs py-1 px-3 ${contentTab === t ? "active" : ""}`}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    {contentTab === "visual" && (
                      <>
                        <span className="w-px h-5 bg-gray-200 mx-1" />
                        {[
                          ["B", () => exec("bold"), "font-bold"],
                          ["I", () => exec("italic"), "italic"],
                          ["U", () => exec("underline"), "underline"],
                        ].map(([label, fn, cls]) => (
                          <button key={label as string} onClick={fn as () => void} className={`toolbar-btn text-xs ${cls}`}>{label as string}</button>
                        ))}
                        <span className="w-px h-5 bg-gray-200 mx-1" />
                        <button className="toolbar-btn text-xs" onClick={() => exec("formatBlock", "h2")}>H2</button>
                        <button className="toolbar-btn text-xs" onClick={() => exec("formatBlock", "h3")}>H3</button>
                        <button className="toolbar-btn text-xs" onClick={() => exec("insertUnorderedList")}>List</button>
                        <button className="toolbar-btn text-xs" onClick={() => exec("insertHTML", `<blockquote style="border-left:4px solid #f97316;padding:12px 16px;background:#fff7ed;border-radius:0 8px 8px 0;font-style:italic;color:#9a3412;margin:1em 0">Quote</blockquote><p></p>`)}>Quote</button>
                        <span className="w-px h-5 bg-gray-200 mx-1" />
                        <button className="toolbar-btn text-xs" onClick={() => exec("removeFormat")}>Clear</button>
                      </>
                    )}
                  </div>
                  {/* Editor area */}
                  {contentTab === "visual" && (
                    <div className="relative" onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setIsDragOver(true); } }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={e => { e.preventDefault(); setIsDragOver(false); }}>
                      {isDragOver && <div className="drop-overlay"><span className="text-orange-600 font-semibold">Drop image to upload</span></div>}
                      <div ref={editorRef} contentEditable suppressContentEditableWarning
                        className="editor-area outline-none px-6 py-5 min-h-[300px]"
                        data-placeholder="Write your newsletter content here…"
                        onInput={onEditorInput} onKeyDown={handleEditorKeyDown} />
                    </div>
                  )}
                  {contentTab === "html" && (
                    <textarea value={issue.content} onChange={e => setField("content", e.target.value)}
                      className="w-full font-mono text-xs p-4 min-h-[300px] outline-none resize-none border-none" />
                  )}
                  {contentTab === "preview" && (
                    <div className="p-6 prose max-w-none" dangerouslySetInnerHTML={{ __html: issue.content }} />
                  )}
                  <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-gray-50/60">
                    <span className="text-[11px] text-gray-400">{wordCount} words · ~{readingTime} min read</span>
                  </div>
                </div>

                {/* Intro + CTA (original fields) */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email intro paragraph</label>
                    <textarea value={issue.intro} onChange={e => setField("intro", e.target.value)} rows={4}
                      placeholder="Opening paragraph shown at the top of the email…"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 mt-1 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Call to action</label>
                    <textarea value={issue.cta} onChange={e => setField("cta", e.target.value)} rows={4}
                      placeholder="CTA paragraph shown before the contact button…"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 mt-1 resize-none" />
                  </div>
                </div>

                {/* Blog post selector (original: posts + selected) */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Include blog posts</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{issue.selected_posts.length} selected</div>
                    </div>
                    <button onClick={generate} className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition">
                      ⚡ Generate email HTML
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {blogPosts.length === 0 && <div className="text-center py-6 text-sm text-gray-400">No published posts found</div>}
                    {blogPosts.map(p => (
                      <label key={p.slug} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={issue.selected_posts.includes(p.slug)} onChange={() => toggle(p.slug)}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-300" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{p.title}</div>
                          <div className="text-[11px] text-gray-400">/blog/{p.slug}</div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Generated HTML output */}
                {output && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                      <div className="font-semibold text-sm text-gray-900">Generated email HTML</div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(output); showStatus("Copied ✓"); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition">
                          📋 Copy HTML
                        </button>
                        <button onClick={() => setShowOutputPanel(v => !v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition">
                          {showOutputPanel ? "Hide preview" : "Show preview"}
                        </button>
                      </div>
                    </div>
                    <textarea value={output} readOnly className="w-full font-mono text-xs p-4 h-40 outline-none resize-none border-none bg-gray-50" />
                    {showOutputPanel && (
                      <div className="border-t border-gray-100">
                        <div className="p-2 text-[10px] text-gray-400 border-b border-gray-100 bg-gray-50">Email preview (desktop)</div>
                        <div className="p-4 bg-slate-100">
                          <div className="max-w-[600px] mx-auto" dangerouslySetInnerHTML={{ __html: output }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ TAB: COVER IMAGE ─ */}
          {tab === "cover" && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cover image</h2>
                  <p className="text-sm text-gray-500 mt-1">Displayed in the email header. Recommended: 600×280px</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  {/* Upload controls */}
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading}
                      className="toolbar-btn text-xs disabled:opacity-40">
                      {coverUploading ? "Uploading…" : "↑ Upload"}
                    </button>
                    <button onClick={() => setShowCoverUrlInput(v => !v)} className={`toolbar-btn text-xs ${showCoverUrlInput ? "border-purple-300 text-purple-700" : ""}`}>
                      🔗 Paste URL
                    </button>
                    {issue.cover_image && <button onClick={deleteCover} className="text-xs text-red-400 hover:text-red-600 ml-auto">✕ Remove</button>}
                  </div>

                  {showCoverUrlInput && !issue.cover_image && (
                    <div className="flex gap-2 mb-3">
                      <input value={coverUrlDraft} onChange={e => setCoverUrlDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && coverUrlDraft.trim()) { setField("cover_image", coverUrlDraft.trim()); setCoverUrlDraft(""); setShowCoverUrlInput(false); } }}
                        placeholder="https://…" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-400" />
                      <button onClick={() => { if (coverUrlDraft.trim()) { setField("cover_image", coverUrlDraft.trim()); setCoverUrlDraft(""); setShowCoverUrlInput(false); } }}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold">Set</button>
                    </div>
                  )}

                  {issue.cover_image ? (
                    <>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 group" style={{ height: "200px" }}>
                        <img src={issue.cover_image} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                          <button onClick={() => { setImageEditorSrc(issue.cover_image); setCoverAlt(""); setImgPos({ x: 50, y: 50 }); setImgFlip({ x: 1, y: 1 }); }}
                            className="text-xs bg-white text-purple-700 px-3 py-1.5 rounded-lg font-semibold shadow">✎ Edit</button>
                          <button onClick={() => coverInputRef.current?.click()} className="text-xs bg-white text-gray-800 px-3 py-1.5 rounded-lg font-semibold shadow">↑ Replace</button>
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Alt text (SEO + accessibility)</div>
                        <div className="flex gap-2">
                          <input value={coverAlt} onChange={e => setCoverAlt(e.target.value)}
                            placeholder="Describe the image…" maxLength={125}
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 bg-white" />
                          <button onClick={async () => { if (issue.cover_image) { const a = await generateAltText(issue.cover_image); if (a) setCoverAlt(a); else showStatus("Could not generate alt text ✗"); } }}
                            disabled={altLoading} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                            {altLoading ? "✦…" : "✦ AI"}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{coverAlt.length}/125 chars</div>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => coverInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-sm text-gray-400 hover:text-orange-600 transition flex flex-col items-center justify-center gap-2 py-12">
                      <span style={{ fontSize: "28px" }}>🖼</span>
                      <span className="font-medium">Upload cover image</span>
                      <span className="text-xs">Recommended: 600×280px</span>
                    </button>
                  )}
                </div>

                {/* History */}
                {history.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 font-semibold text-sm text-gray-900">Image history</div>
                    <div className="divide-y divide-gray-50">
                      {history.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 capitalize">{item.action}</div>
                            <div className="text-[10px] text-gray-400">{formatDate(item.changed_at)}</div>
                          </div>
                          {item.trashed_object_path && item.action !== "restore" && (
                            <button onClick={() => restoreCoverFromHistory(item)}
                              className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50 transition">
                              Restore
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ TAB: SEND ─ */}
          {tab === "send" && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Send newsletter</h2>
                  <p className="text-sm text-gray-500 mt-1">Review everything before sending to subscribers.</p>
                </div>

                {/* Checklist */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <div className="font-semibold text-sm text-gray-900">Pre-send checklist</div>
                    <div className="text-sm font-bold text-gray-600">{checkScore}/{checklist.length}</div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {checklist.map(c => (
                      <div key={c.label} className={`flex items-center gap-3 px-5 py-3 text-sm ${c.ok ? "text-green-700" : "text-gray-500"}`}>
                        <span className="text-base flex-shrink-0">{c.ok ? "✓" : "○"}</span>
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscribers */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Subscribers</div>
                  {subscriberCount === null ? (
                    <div className="text-sm text-gray-400">Loading…</div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-900">{subscriberCount.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">active subscribers</span>
                    </div>
                  )}
                  <button onClick={loadSubscriberCount} className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline">Refresh</button>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => { if (!allChecksOk) return; setShowSendConfirm(true); }}
                    disabled={!allChecksOk}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition ${allChecksOk ? "bg-green-500 hover:bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                    🚀 Send newsletter
                    {!allChecksOk && <span className="block text-xs font-normal mt-1">Complete all checklist items to enable</span>}
                  </button>

                  <button onClick={() => showStatus("Test send feature — connect to Resend API ✓")}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-600 hover:text-blue-700 transition">
                    📬 Send test to info@foodz-x.com
                  </button>
                </div>

                {!allChecksOk && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-center">
                    {checklist.length - checkScore} item{checklist.length - checkScore !== 1 ? "s" : ""} remaining in checklist
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ TAB: SETTINGS ─ */}
          {tab === "settings" && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Issue metadata and image history.</p>
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-red-100 flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-700">Danger zone</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">irreversible</span>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Remove cover image</div>
                        <div className="text-xs text-gray-500 mt-0.5">Moves the image to trash (recoverable from Cover tab → History)</div>
                      </div>
                      <button onClick={deleteCover} disabled={!issue.cover_image}
                        className="flex-shrink-0 px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-sm font-semibold text-red-600 disabled:opacity-30 transition">
                        Remove
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Reset to draft</div>
                        <div className="text-xs text-gray-500 mt-0.5">Set status back to draft — does not delete the issue</div>
                      </div>
                      <button onClick={() => { setField("status", "draft"); saveIssue(); }}
                        className="flex-shrink-0 px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-sm font-semibold text-red-600 transition">
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image history timeline */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 font-semibold text-sm text-gray-900">Image history</div>
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">No image history for this issue</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-100" />
                      {history.map((item, i) => (
                        <div key={item.id} className="flex gap-4 px-5 py-4 relative">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                            item.action === "restore" ? "bg-green-100 border-green-400" :
                            item.action === "delete" ? "bg-red-100 border-red-400" :
                            "bg-orange-100 border-orange-400"
                          }`} style={{ marginLeft: "6px" }}>
                            <span className="text-[10px]">{item.action === "restore" ? "↩" : item.action === "delete" ? "✕" : "↑"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 capitalize">{item.action} — {item.field_name}</div>
                            <div className="text-[10px] text-gray-400">{formatDate(item.changed_at)}</div>
                            {item.new_url && <img src={item.new_url} alt="" className="mt-1.5 rounded-lg border border-gray-100 h-10 w-auto object-cover" />}
                          </div>
                          {item.trashed_object_path && item.action !== "restore" && (
                            <button onClick={() => restoreCoverFromHistory(item)}
                              className="flex-shrink-0 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded-lg transition">
                              Restore
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── IMAGE EDITOR MODAL ── */}
      {imageEditorSrc && (
        <div className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Edit cover image</h2>
                <p className="text-xs text-gray-400 mt-0.5">Drag to reposition · flip · AI alt text</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Drag to reposition</div>
                <div ref={imgContainerRef} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 select-none"
                  style={{ height: "260px", cursor: isDraggingImg ? "grabbing" : "grab" }} onMouseDown={onImgMouseDown}>
                  <img src={imageEditorSrc} alt="Preview" draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${imgPos.x}% ${imgPos.y}%`, transform: `scaleX(${imgFlip.x}) scaleY(${imgFlip.y})`, pointerEvents: "none" }} />
                  <div className="absolute bottom-2 right-2 text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
                    Position: {Math.round(imgPos.x)}% × {Math.round(imgPos.y)}%
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setImgFlip(f => ({ ...f, x: f.x * -1 }))} className="toolbar-btn text-xs">⇄ Flip H</button>
                  <button onClick={() => setImgFlip(f => ({ ...f, y: f.y * -1 }))} className="toolbar-btn text-xs">↕ Flip V</button>
                  <button onClick={() => { setImgPos({ x: 50, y: 50 }); setImgFlip({ x: 1, y: 1 }); }} className="toolbar-btn text-xs ml-auto">Reset</button>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 mb-2">Alt text — SEO + accessibility</div>
                <div className="flex gap-2">
                  <input value={coverAlt} onChange={e => setCoverAlt(e.target.value)} maxLength={125}
                    placeholder="AI will describe the image, or type manually…"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                  <button onClick={async () => { if (imageEditorSrc) { const a = await generateAltText(imageEditorSrc); if (a) setCoverAlt(a); } }}
                    disabled={altLoading} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                    {altLoading ? "✦ Thinking…" : "✦ AI describe"}
                  </button>
                </div>
                <div className="text-[10px] text-purple-400 mt-1">{coverAlt.length}/125 chars</div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/80 flex-shrink-0">
              <button onClick={() => setImageEditorSrc(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <p className="text-[11px] text-gray-400 flex-1">Crop position is visual only — original file is unchanged.</p>
              <button onClick={() => { setImageEditorSrc(null); showStatus("Applied ✓"); }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND CONFIRM MODAL ── */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-[9996] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-7 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🚀</div>
              <h2 className="text-lg font-bold text-gray-900">Send newsletter?</h2>
              <p className="text-sm text-gray-500 mt-2">
                This will send <strong className="text-gray-900">"{issue.subject}"</strong> to{" "}
                <strong className="text-gray-900">{subscriberCount?.toLocaleString() ?? "?"} subscribers</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSendConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSending(true); setShowSendConfirm(false);
                  setField("status", "sent");
                  await saveIssue();
                  setSending(false);
                  showStatus("Newsletter sent ✓ (connect Resend to enable actual sending)", 4000);
                }}
                disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold disabled:opacity-50">
                {sending ? "Sending…" : "🚀 Confirm & send"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
