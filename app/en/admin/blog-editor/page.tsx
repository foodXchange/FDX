"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  content: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  published_at: string | null;
  cover_image?: string | null;
  hero_image?: string | null;
  cover_alt?: string | null;
  hero_alt?: string | null;
  cover_position?: string | null;
  hero_position?: string | null;
};

type Block = {
  id: string;
  tagName: string;
  html: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return d; }
}

function stripHtml(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

function buildExampleTemplate() {
  return `<h2>Introduction</h2>
<p>Briefly describe the opportunity and context.</p>

<h2>Market insight</h2>
<p>Explain what is happening in the Israeli market.</p>

<h2>What buyers expect</h2>
<ul>
  <li>Quality</li>
  <li>Price competitiveness</li>
  <li>Reliable supply</li>
</ul>

<h2>Supplier opportunity</h2>
<p>Explain why this is relevant for manufacturers.</p>

<h2>Conclusion</h2>
<p>Summarize in 2–3 lines.</p>

<h2>Next step</h2>
<p>If this is relevant, feel free to reach out — we can connect you with the right opportunities.</p>`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  review: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogEditorPage() {

  // Posts
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Current post
  const emptyPost: Post = {
    title: "", slug: "", status: "draft", excerpt: "",
    content: "<p></p>", tags: [], meta_title: "", meta_description: "", published_at: null,
    cover_alt: null, hero_alt: null, cover_position: null, hero_position: null,
  };
  const [post, setPost] = useState<Post>(emptyPost);

  // UI
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [autosaveMsg, setAutosaveMsg] = useState("");
  const [tab, setTab] = useState<"visual" | "blocks" | "html" | "preview" | "seo">("visual");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [audienceMode, setAudienceMode] = useState<"buyers" | "manufacturers">("buyers");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // AI Draft modal
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiAudience, setAiAudience] = useState<"buyers" | "manufacturers">("buyers");
  const [aiGenerating, setAiGenerating] = useState(false);

  // AI Excerpt + Tags
  const [aiExcerptLoading, setAiExcerptLoading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);

  // Link inserter popover
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Pre-publish checklist
  const [showPublishChecklist, setShowPublishChecklist] = useState(false);

  // Duplicate post
  const [duplicating, setDuplicating] = useState(false);

  // AI Assistant panel
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);
  const [aiPanelTab, setAiPanelTab] = useState<"chat"|"history"|"prompts">("chat");
  const [chatMessages, setChatMessages] = useState<{role:"user"|"assistant", text:string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat history — stored per-post in localStorage
  type SavedConversation = {
    id: string;
    postSlug: string;
    postTitle: string;
    savedAt: string;
    preview: string;
    messages: {role:"user"|"assistant", text:string}[];
  };
  const [chatHistory, setChatHistory] = useState<SavedConversation[]>([]);

  // Prompt library
  type SavedPrompt = {
    id: string;
    name: string;
    category: string; // dynamic — not hardcoded
    text: string;
    createdAt: string;
  };

  const SYSTEM_CATEGORIES = ["All", "Content", "SEO", "Images", "Israeli market"];
  const DEFAULT_PROMPTS: SavedPrompt[] = [
    { id:"p1", name:"Israeli buyer pain points", category:"Israeli market", createdAt:"", text:"What are the top 3 pain points Israeli supermarket buyers have when sourcing from European manufacturers? Be specific and practical." },
    { id:"p2", name:"Kosher certification guide", category:"Israeli market", createdAt:"", text:"Explain the kosher certification process for a European food manufacturer wanting to export to Israel. What bodies do they need, how long does it take, and what are the costs?" },
    { id:"p3", name:"Rewrite intro — more urgency", category:"Content", createdAt:"", text:"Rewrite the introduction of this post to open with a surprising market statistic or urgent trend. Make the first sentence a hook. Keep it under 3 sentences." },
    { id:"p4", name:"Add supplier checklist section", category:"Content", createdAt:"", text:"Write a practical checklist section for food manufacturers wanting to supply Israeli supermarkets. Cover: MOQ, lead time, kosher, labeling, payment terms. Format as a bullet list." },
    { id:"p5", name:"SEO title variants — 5 angles", category:"SEO", createdAt:"", text:"Give me 5 SEO-optimized title variants for this post. Each should target a different keyword angle: buyer intent, manufacturer intent, trend-based, question-based, data-led." },
    { id:"p6", name:"Meta description — click-bait", category:"SEO", createdAt:"", text:"Write a meta description for this post under 155 characters. It should create curiosity, include the main keyword, and make someone want to click from a Google search result." },
    { id:"p7", name:"Cover image — food product", category:"Images", createdAt:"", text:"Cinematic wide shot, editorial food photography, warm golden light. Show [PRODUCT] arranged on a wooden surface, rich textures, shallow depth of field. No text overlays. Professional commercial photography style. 16:9 aspect ratio." },
    { id:"p8", name:"Cover image — market / trade", category:"Images", createdAt:"", text:"Clean flat lay, top-down view, modern food packaging against white marble background. Israeli flag colors subtly incorporated. Professional product photography. Square format 1:1." },
  ];
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [promptCategory, setPromptCategory] = useState<string>("All");
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState<string>("My prompts");
  const [newPromptText, setNewPromptText] = useState("");
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);

  // Category folder management
  const [customCategories, setCustomCategories] = useState<string[]>(["My prompts"]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Image editor modal
  const [imageEditorSrc, setImageEditorSrc] = useState<string | null>(null);
  const [imageEditorField, setImageEditorField] = useState<"cover_image"|"hero_image"|null>(null);
  const [imageEditorAlt, setImageEditorAlt] = useState("");
  const [altLoading, setAltLoading] = useState(false);
  // Drag-to-pan state for image editor
  const [imgPos, setImgPos] = useState({ x: 50, y: 50 }); // percent 0-100
  const [imgFlip, setImgFlip] = useState({ x: 1, y: 1 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const dragStartRef = useRef<{mx:number,my:number,px:number,py:number} | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Cover + Hero image inline upload
  const [coverUploading, setCoverUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  // URL paste inputs
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [showHeroUrlInput, setShowHeroUrlInput] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const [heroUrlDraft, setHeroUrlDraft] = useState("");

  // Image upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Refs
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedContentRef = useRef<string>("");
  // Always-current post ref so autosave never closes over stale state
  const postRef = useRef(emptyPost);

  // Keep postRef current on every render
  postRef.current = post;

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const wordCount = useMemo(() => {
    const text = stripHtml(post.content || "");
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [post.content]);

  const readingTime = useMemo(() => Math.max(1, Math.round(wordCount / 200)), [wordCount]);

  // ─── Field helpers ────────────────────────────────────────────────────────

  function setField<K extends keyof Post>(key: K, value: Post[K]) {
    setPost(p => ({ ...p, [key]: value }));
  }

  function setTagsFromString(s: string) {
    setField("tags", s.split(",").map(x => x.trim()).filter(Boolean).slice(0, 20));
  }

  function showStatus(msg: string, duration = 2500) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), duration);
  }

  // ─── API ──────────────────────────────────────────────────────────────────

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
    if (json.post) {
      setPost(json.post);
      lastSavedContentRef.current = json.post.content || "";
    }
  }

  // ─── Save (silent = autosave, no spinner) ─────────────────────────────────

  async function savePost(silent = false) {
    if (!silent) { setSaving(true); setStatusMsg("Saving…"); }

    // Use postRef to get fully up-to-date fields (excerpt, tags, etc.)
    // React state updates are async — postRef is always current
    const p = postRef.current;
    const content = tab === "visual" && editorRef.current
      ? editorRef.current.innerHTML
      : p.content;

    const res = await fetch("/api/blog/editor/post", {
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

    lastSavedContentRef.current = content;

    if (silent) {
      const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setAutosaveMsg(`Autosaved ${now}`);
    } else {
      showStatus("Saved ✓");
      await loadList();
      if (json.post?.slug) setSelectedSlug(json.post.slug);
    }
  }

  // ─── AUTOSAVE every 30s ───────────────────────────────────────────────────
  // Uses postRef so it always sees the latest excerpt/tags/content without
  // re-registering the interval on every keystroke.

  useEffect(() => {
    autosaveTimerRef.current = setInterval(async () => {
      const p = postRef.current;
      const currentContent = editorRef.current?.innerHTML || p.content || "";
      if (!p.slug || currentContent === lastSavedContentRef.current) return;

      // Save using the fully up-to-date post from the ref
      const res = await fetch("/api/blog/editor/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, content: currentContent }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        lastSavedContentRef.current = currentContent;
        const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setAutosaveMsg("Autosaved " + now);
      }
    }, 30_000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, []);

  // ─── Delete (soft) ────────────────────────────────────────────────────────

  async function deletePost() {
    if (!post.slug) return;
    setDeleting(true);
    const res = await fetch("/api/blog/editor/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...post, status: "draft", published_at: null }),
    });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    setShowDeleteConfirm(false);
    if (!res.ok || !json.ok) { showStatus(json.error || "Delete failed ✗"); return; }
    showStatus("Post moved to draft ✓", 3000);
    setField("status", "draft");
    setField("published_at", null);
    await loadList();
  }

  // ─── New draft ────────────────────────────────────────────────────────────

  function newDraft() {
    const template = buildExampleTemplate();
    setPost({ ...emptyPost, title: "New post", slug: `new-${Date.now()}`, content: template });
    setSelectedSlug("");
    setTab("visual");
    setTimeout(() => {
      if (editorRef.current) { editorRef.current.innerHTML = template; editorRef.current.focus(); }
    }, 50);
  }

  // ─── WYSIWYG ──────────────────────────────────────────────────────────────

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
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (!ctrl) return;
    switch (e.key.toLowerCase()) {
      case "z": e.preventDefault(); document.execCommand(e.shiftKey ? "redo" : "undo", false); if (editorRef.current) setField("content", editorRef.current.innerHTML); return;
      case "y": e.preventDefault(); document.execCommand("redo", false); if (editorRef.current) setField("content", editorRef.current.innerHTML); return;
      case "b": e.preventDefault(); exec("bold"); return;
      case "i": e.preventDefault(); exec("italic"); return;
      case "u": e.preventDefault(); exec("underline"); return;
      case "s": e.preventDefault(); savePost(); return;
    }
  }, [exec]);

  // ─── Smart suggestions ────────────────────────────────────────────────────

  function applyAutoStructure() {
    const html = buildExampleTemplate();
    setField("content", html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    showStatus("Template applied ✓");
  }

  function insertSupplierChecklist() {
    const block = `<h2>Supplier checklist</h2><ul><li>MOQ / batch constraints</li><li>Lead time + seasonal capacity</li><li>Pack formats (cups, jars, cans, lids)</li><li>Export docs (COA, allergens, specs)</li><li>Kosher pathway (if required)</li></ul>`;
    const current = editorRef.current?.innerHTML || post.content || "";
    const html = current + "\n" + block;
    setField("content", html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    showStatus("Checklist added ✓");
  }

  // ─── AI DRAFT GENERATOR (streaming via /api/ai/draft) ────────────────────
  //
  // WHY a backend route?
  //   The browser cannot call api.anthropic.com directly — the API blocks
  //   cross-origin requests (CORS). All calls must go through your own server.
  //   Create the file:  src/app/api/ai/draft/route.ts  (see second file below)

  async function generateAIDraft() {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);

    // 1. Close modal + switch to editor immediately so user sees text stream in
    setShowAIDraft(false);
    setTab("visual");

    const newSlug = slugify(aiTopic) || `post-${Date.now()}`;
    setPost(p => ({
      ...p,
      title: aiTopic,
      slug: (!p.slug || p.slug.startsWith("new-")) ? newSlug : p.slug,
      content: "",
      status: "draft",
    }));

    // Show a subtle "writing…" placeholder while we wait for first token
    setTimeout(() => {
      if (editorRef.current)
        editorRef.current.innerHTML =
          `<p style="color:#a855f7;font-style:italic;opacity:0.7">✦ Writing your post…</p>`;
    }, 40);

    const audienceLabel =
      aiAudience === "buyers"
        ? "Israeli food buyers and supermarket importers"
        : "food manufacturers and exporters looking to enter the Israeli market";

    const htmlTemplate = [
      "<h2>Introduction</h2>",
      "<p>[2–3 sentences introducing the topic and why it matters now]</p>",
      "<h2>Market insight</h2>",
      "<p>[Key market data or trend about Israel or the relevant food category]</p>",
      `<h2>What ${aiAudience === "buyers" ? "buyers" : "manufacturers"} should know</h2>`,
      "<ul>",
      "<li>[Specific factual point 1]</li>",
      "<li>[Specific factual point 2]</li>",
      "<li>[Specific factual point 3]</li>",
      "<li>[Specific factual point 4]</li>",
      "</ul>",
      `<h2>${aiAudience === "buyers" ? "Sourcing opportunity" : "Export opportunity"}</h2>`,
      "<p>[Specific actionable insight for the audience]</p>",
      "<h2>Conclusion</h2>",
      "<p>[2–3 sentence summary of the key takeaway]</p>",
      "<h2>Next step</h2>",
      `<p>If this opportunity is relevant for you, reach out — we can connect you with the right ${aiAudience === "buyers" ? "suppliers" : "buyers"} directly.</p>`,
    ].join("\n");

    const systemPrompt =
      "You are a B2B food sourcing expert writing blog posts for a platform connecting Israeli food buyers with global food manufacturers. " +
      "Write factual, specific, professional content. No generic filler. No markdown. Output ONLY clean HTML, nothing else — no backticks, no preamble.";

    const userPrompt =
      `Write a complete, publication-ready blog post about: "${aiTopic}"\n` +
      `Target audience: ${audienceLabel}\n\n` +
      `Use ONLY this exact HTML structure:\n\n${htmlTemplate}`;

    try {
      // 2. POST to our own Next.js route — it proxies to Anthropic with streaming
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        showStatus(err.error || "AI generation failed — check /api/ai/draft route ✗");
        if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
        setAiGenerating(false);
        return;
      }

      // 3. Stream SSE chunks into the editor in real time
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6);
          if (chunk === "[DONE]") break;
          accumulated += chunk;
          // Update the editor DOM live — user sees text appear word by word
          if (editorRef.current) editorRef.current.innerHTML = accumulated;
        }
      }

      // 4. Final sync
      const finalHtml = accumulated.trim() || "<p></p>";
      setPost(p => ({ ...p, content: finalHtml }));
      if (editorRef.current) editorRef.current.innerHTML = finalHtml;
      lastSavedContentRef.current = ""; // mark unsaved so autosave picks it up
      setAiTopic("");
      showStatus("AI draft ready ✓  — review then Save when happy");

    } catch (e) {
      console.error("AI draft error:", e);
      showStatus("AI generation failed — see console ✗");
      if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
    } finally {
      setAiGenerating(false);
    }
  }

  // ─── AI EXCERPT + META + TAGS (via backend to avoid CORS) ──────────────────

  async function callAI(userPrompt: string): Promise<string> {
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "You are an SEO and content expert. Respond ONLY with valid JSON — no markdown, no backticks, no explanation.",
        user: userPrompt,
      }),
    });
    if (!res.ok || !res.body) throw new Error("API error");
    // Read the full stream and concatenate
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const chunk = line.slice(6);
        if (chunk === "[DONE]") break;
        accumulated += chunk;
      }
    }
    return accumulated.trim();
  }

  async function generateAIExcerpt() {
    const html = editorRef.current?.innerHTML || post.content || "";
    const plainText = stripHtml(html).slice(0, 3000);
    if (!plainText.trim()) { showStatus("Write some content first ✗"); return; }
    setAiExcerptLoading(true);
    try {
      const raw = await callAI(
        `Based on this blog post, return JSON with these fields:\n` +
        `- excerpt: 1-2 sentences, max 155 chars, compelling preview for readers\n` +
        `- meta_description: 1 sentence, max 155 chars, SEO-optimized for Google\n\n` +
        `Post title: "${post.title || "Untitled"}"\nPost content: ${plainText}\n\n` +
        `Format: {"excerpt":"...","meta_description":"..."}`
      );
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.excerpt) setField("excerpt", parsed.excerpt);
      if (parsed.meta_description) setField("meta_description", parsed.meta_description);
      showStatus("Excerpt + meta generated ✓");
    } catch {
      showStatus("AI excerpt failed ✗");
    } finally {
      setAiExcerptLoading(false);
    }
  }

  async function generateAITags() {
    const html = editorRef.current?.innerHTML || post.content || "";
    const plainText = stripHtml(html).slice(0, 2000);
    if (!plainText.trim()) { showStatus("Write some content first ✗"); return; }
    setAiTagsLoading(true);
    try {
      const raw = await callAI(
        `Based on this blog post about food sourcing and the Israeli market, suggest 4-6 relevant tags.\n` +
        `Tags should be short (1-3 words), lowercase, specific to the topic.\n` +
        `Post title: "${post.title || "Untitled"}"\nContent: ${plainText}\n\n` +
        `Format: {"tags":["tag1","tag2","tag3","tag4"]}`
      );
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.tags?.length) setField("tags", parsed.tags);
      showStatus("Tags generated ✓");
    } catch {
      showStatus("AI tags failed ✗");
    } finally {
      setAiTagsLoading(false);
    }
  }

  // ─── AI ALT TEXT GENERATOR ──────────────────────────────────────────────────

  async function generateAltText(imageUrl: string): Promise<string> {
    setAltLoading(true);
    try {
      const raw = await callAI(
        `Look at this image URL and write a concise, descriptive alt text for it (max 125 chars).
` +
        `The alt text should describe what is visually in the image, relevant to food sourcing and the Israeli market.
` +
        `Image URL: ${imageUrl}

` +
        `Return ONLY the alt text string, nothing else.`
      );
      return raw.replace(/^["']|["']$/g, "").trim().slice(0, 125);
    } catch { return ""; }
    finally { setAltLoading(false); }
  }

  // ─── COVER IMAGE INLINE UPLOAD ────────────────────────────────────────────

  async function uploadCoverImage(file: File) {
    if (!file.type.startsWith("image/")) { showStatus("Only image files supported ✗"); return; }
    setCoverUploading(true);
    showStatus("Uploading cover…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog/upload-image", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) { showStatus(json.error || "Cover upload failed ✗"); return; }
      setField("cover_image", json.url);
      showStatus("Cover image uploaded ✓");
    } catch {
      showStatus("Cover upload failed ✗");
    } finally {
      setCoverUploading(false);
    }
  }

  // ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────

  async function uploadImageFile(file: File) {
    if (!file.type.startsWith("image/")) { showStatus("Only image files supported ✗"); return; }
    setImageUploading(true);
    showStatus("Uploading image…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog/upload-image", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) { showStatus(json.error || "Image upload failed ✗"); return; }

      // Insert at cursor inside editor
      editorRef.current?.focus();
      const altText = file.name.replace(/\.[^.]+$/, "");
      document.execCommand("insertHTML", false, `<img src="${json.url}" alt="${altText}" style="max-width:100%;border-radius:8px;margin:12px 0;" />`);
      if (editorRef.current) setField("content", editorRef.current.innerHTML);
      setTab("visual");
      showStatus("Image inserted ✓");
    } catch {
      showStatus("Image upload failed ✗");
    } finally {
      setImageUploading(false);
    }
  }

  function handleEditorDrop(e: React.DragEvent<HTMLDivElement>) {
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      setIsDragOver(false);
      uploadImageFile(file);
    }
  }

  function handleEditorDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setIsDragOver(true); }
  }

  // ─── HERO IMAGE UPLOAD ───────────────────────────────────────────────────

  async function uploadHeroImage(file: File) {
    if (!file.type.startsWith("image/")) { showStatus("Only image files supported ✗"); return; }
    setHeroUploading(true);
    showStatus("Uploading hero image…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog/upload-image", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) { showStatus(json.error || "Hero upload failed ✗"); return; }
      setField("hero_image", json.url);
      showStatus("Hero image uploaded ✓");
    } catch {
      showStatus("Hero upload failed ✗");
    } finally {
      setHeroUploading(false);
    }
  }

  // ─── AI ASSISTANT CHAT ────────────────────────────────────────────────────

  async function sendChatMessage(overrideMsg?: string) {
    const userMsg = (overrideMsg ?? chatInput).trim();
    if (!userMsg || chatLoading) return;
    setChatInput("");
    setChatLoading(true);

    const newMessages = [...(Array.isArray(chatMessages) ? chatMessages : []), { role: "user" as const, text: userMsg }];
    setChatMessages(newMessages);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // Build context from current post state
    const postContext = `
CURRENT POST CONTEXT:
Title: ${post.title || "(untitled)"}
Status: ${post.status}
Slug: /blog/${post.slug}
Tags: ${(post.tags || []).join(", ") || "none"}
Excerpt: ${post.excerpt || "none"}
Word count: ${wordCount} words
Content preview: ${stripHtml(editorRef.current?.innerHTML || post.content || "").slice(0, 800)}
`.trim();

    // Build conversation history for multi-turn memory
    const history = newMessages.map(m => (m.role === "user" ? "User" : "Assistant") + ": " + m.text).join("\n");

    const systemPrompt = `You are an AI assistant built into a blog editor for FoodXchange — a B2B food sourcing platform connecting Israeli food buyers with global manufacturers.

You have full context of the post being edited. You can:
- Answer questions about content, SEO, food industry trends, the Israeli market
- Generate or improve specific fields (title, excerpt, tags, slug) — when you do, format your answer clearly so the user can copy it
- Give feedback on the post content, structure, or tone
- Suggest improvements, headlines, CTAs
- Answer general questions about running the platform

${postContext}

Be concise, practical, and specific. When generating field values, clearly label them (e.g. "Suggested title:", "Suggested tags:"). Never say you cannot help — always give your best answer.`;

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          user: history,
        }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      // Stream the reply live into the chat
      setChatMessages(prev => [...(Array.isArray(prev) ? prev : []), { role: "assistant", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6);
          if (chunk === "[DONE]") break;
          accumulated += chunk;
          setChatMessages(prev => {
            const safe = Array.isArray(prev) ? prev : [];
            const updated = [...safe];
            if (updated.length > 0) updated[updated.length - 1] = { role: "assistant", text: accumulated };
            return updated;
          });
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    } catch {
      setChatMessages(prev => [...(Array.isArray(prev) ? prev : []), { role: "assistant", text: "Sorry, something went wrong. Check your API key and try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      // Auto-save completed conversation to history
      setChatMessages(prev => {
        const safe = Array.isArray(prev) ? prev : [];
        saveChatToHistory(safe);
        return safe;
      });
    }
  }

  // ─── LINK INSERTER ───────────────────────────────────────────────────────────

  function insertLink() {
    if (!linkUrl.trim()) return;
    const text = linkText.trim() || linkUrl;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`
    );
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
    setLinkUrl("");
    setLinkText("");
    setShowLinkPopover(false);
  }

  // ─── PULL QUOTE ───────────────────────────────────────────────────────────────

  function insertPullQuote() {
    const sel = window.getSelection();
    const selectedText = sel && sel.toString().trim();
    const quoteText = selectedText || "Add your key insight here…";
    if (selectedText && sel && sel.rangeCount > 0) {
      sel.getRangeAt(0).deleteContents();
    }
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<blockquote style="border-left:4px solid #f97316;margin:1.5em 0;padding:1em 1.5em;background:#fff7ed;border-radius:0 12px 12px 0;font-size:1.15em;font-style:italic;color:#9a3412;line-height:1.6">${quoteText}</blockquote><p></p>`
    );
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
  }

  // ─── KEY FACTS BOX ───────────────────────────────────────────────────────────

  function insertKeyFacts() {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false,
      `<div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:1.25em 1.5em;margin:1.5em 0">
        <div style="font-weight:700;color:#9a3412;font-size:0.85em;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75em">Key facts</div>
        <ul style="margin:0;padding-left:1.25em;color:#7c2d12">
          <li style="margin-bottom:0.4em">Key fact one — be specific</li>
          <li style="margin-bottom:0.4em">Key fact two — use data when possible</li>
          <li style="margin-bottom:0.4em">Key fact three — keep it brief</li>
        </ul>
      </div><p></p>`
    );
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
  }

  // ─── DUPLICATE POST ───────────────────────────────────────────────────────────

  async function duplicatePost() {
    if (!post.slug) return;
    setDuplicating(true);
    const newSlug = "copy-" + post.slug + "-" + Date.now().toString().slice(-4);
    const newPost = {
      ...post,
      title: "Copy of " + post.title,
      slug: newSlug,
      status: "draft" as const,
      published_at: null,
    };
    const res = await fetch("/api/blog/editor/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    });
    const json = await res.json().catch(() => ({}));
    setDuplicating(false);
    if (!res.ok || !json.ok) { showStatus("Duplicate failed ✗"); return; }
    await loadList();
    setSelectedSlug(newSlug);
    showStatus("Post duplicated ✓");
  }

  // ─── IMAGE PROMPTS → AI CHAT ──────────────────────────────────────────────────

  function generateImagePrompts() {
    const title = post.title || "Food sourcing blog post";
    const excerpt = post.excerpt || stripHtml(editorRef.current?.innerHTML || post.content || "").slice(0, 200);
    const tags = (post.tags || []).join(", ") || "food, Israel, sourcing";

    const msg = [
      "Generate image prompts for this blog post. I need two versions:",
      "",
      "POST: " + title,
      "TOPIC: " + excerpt,
      "KEYWORDS: " + tags,
      "",
      "---",
      "",
      "COVER IMAGE (square 1:1 or 4:3 — used on blog card):",
      "Write 1 ready-to-use prompt for Midjourney or DALL-E.",
      "Style: clean, professional, food photography or minimalist flat design.",
      "No text overlays. High quality. Relevant to the food/sourcing topic.",
      "",
      "HERO IMAGE (wide 16:9 — used at top of post):",
      "Write 1 ready-to-use prompt for Midjourney or DALL-E.",
      "Style: wide cinematic shot, editorial food photography, warm light.",
      "Could show product, market, factory, or abstract food theme.",
      "No text overlays.",
      "",
      "Also suggest 2 free stock photo search terms for Unsplash or Pexels.",
    ].join("\n");

    setShowAIPanel(true);
    setTimeout(() => sendChatMessage(msg), 100);
  }

  // ─── PRE-PUBLISH CHECKLIST ────────────────────────────────────────────────────

  function getPublishChecklist() {
    const html = editorRef.current?.innerHTML || post.content || "";
    return [
      { label: "Title filled in", ok: !!post.title?.trim() },
      { label: "Slug set", ok: !!post.slug?.trim() && !post.slug.startsWith("new-") },
      { label: "Excerpt written", ok: (post.excerpt || "").length >= 20 },
      { label: "Tags added", ok: (post.tags || []).length > 0 },
      { label: "Cover image uploaded", ok: !!post.cover_image },
      { label: "Hero image uploaded", ok: !!post.hero_image },
      { label: "Minimum 200 words", ok: wordCount >= 200 },
      { label: "Meta description set", ok: (post.meta_description || "").length >= 20 },
    ];
  }

  // ─── WHATSAPP SNIPPET ─────────────────────────────────────────────────────────

  function copyWhatsAppSnippet() {
    const title = post.title || "New post";
    const excerpt = post.excerpt || "";
    const url = "https://yourdomain.com/en/blog/" + post.slug;
    const text = [
      "📦 " + title,
      excerpt ? excerpt : "",
      "",
      "Read more: " + url,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => showStatus("WhatsApp message copied ✓"));
  }

  // ─── Block reorder ────────────────────────────────────────────────────────

  function handleBlockDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIdx) || fromIdx === toIdx) return;
    const nb = [...blocks];
    const [moved] = nb.splice(fromIdx, 1);
    nb.splice(toIdx, 0, moved);
    const html = nb.map(b => `<${b.tagName}>${b.html}</${b.tagName}>`).join("\n");
    setField("content", html);
    setBlocks(nb);
  }

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    console.info(
      "📋 FoodXchange Blog Editor — run this SQL in Supabase if you haven't already:\n\n" +
      "alter table blog_posts\n" +
      "  add column if not exists cover_alt text,\n" +
      "  add column if not exists hero_alt text,\n" +
      "  add column if not exists cover_position text,\n" +
      "  add column if not exists hero_position text;"
    );
    loadList();
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    loadPost(selectedSlug);
  }, [selectedSlug]);

  useEffect(() => {
    if (tab !== "visual" || !editorRef.current) return;
    if (editorRef.current.innerHTML !== post.content)
      editorRef.current.innerHTML = post.content || "<p></p>";
  }, [post.content, tab]);

  useEffect(() => {
    if (tab !== "blocks") return;
    const div = document.createElement("div");
    div.innerHTML = post.content || "";
    setBlocks(Array.from(div.children).map(child => ({
      id: Math.random().toString(36).slice(2, 10),
      tagName: child.tagName.toLowerCase(),
      html: child.innerHTML,
    })));
  }, [tab]);

  // ─── CHAT HISTORY (Supabase via /api/ai/chat-history) ───────────────────────

  async function loadChatHistory(): Promise<SavedConversation[]> {
    try {
      const res = await fetch("/api/ai/chat-history");
      const json = await res.json().catch(() => ({}));
      return json.history || [];
    } catch { return []; }
  }

  async function saveChatToHistory(msgs: {role:"user"|"assistant", text:string}[]) {
    if (msgs.length < 2) return;
    try {
      const conv = {
        post_slug: postRef.current.slug || "unknown",
        post_title: postRef.current.title || "Untitled",
        preview: msgs.find(m => m.role === "user")?.text.slice(0, 80) || "",
        messages: msgs,
      };
      const res = await fetch("/api/ai/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conv),
      });
      const json = await res.json().catch(() => ({}));
      if (json.history) setChatHistory(json.history);
    } catch {}
  }

  async function deleteHistoryItem(id: string) {
    try {
      await fetch(`/api/ai/chat-history?id=${id}`, { method: "DELETE" });
      setChatHistory(prev => prev.filter(c => c.id !== id));
    } catch {}
  }

  function restoreConversation(conv: SavedConversation) {
    setChatMessages(conv.messages);
    setAiPanelTab("chat");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // ─── CATEGORY MANAGEMENT (localStorage — lightweight, no DB needed) ──────────

  const CAT_KEY = "fx_prompt_categories";

  function loadCategories(): string[] {
    try {
      const raw = localStorage.getItem(CAT_KEY);
      return raw ? JSON.parse(raw) : ["My prompts"];
    } catch { return ["My prompts"]; }
  }

  function persistCategories(cats: string[]) {
    try { localStorage.setItem(CAT_KEY, JSON.stringify(cats)); } catch {}
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || customCategories.includes(name) || SYSTEM_CATEGORIES.includes(name)) return;
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    persistCategories(updated);
    setNewCatName("");
    showStatus("Folder created ✓");
  }

  function renameCategory(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingCat(null); return; }
    // Rename all prompts in this category
    const updatedPrompts = (Array.isArray(savedPrompts) ? savedPrompts : []).map(p =>
      p.category === oldName ? { ...p, category: trimmed } : p
    );
    setSavedPrompts(updatedPrompts);
    // Update each affected prompt in Supabase
    updatedPrompts.filter(p => p.category === trimmed && savedPrompts.find(op => op.id === p.id && op.category === oldName))
      .forEach(p => fetch("/api/ai/prompts", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(p) }));

    const updated = customCategories.map(c => c === oldName ? trimmed : c);
    setCustomCategories(updated);
    persistCategories(updated);
    if (promptCategory === oldName) setPromptCategory(trimmed);
    setEditingCat(null);
    setEditingCatName("");
    showStatus("Folder renamed ✓");
  }

  function deleteCategory(name: string) {
    // Move prompts in this category to "My prompts"
    const updatedPrompts = (Array.isArray(savedPrompts) ? savedPrompts : []).map(p =>
      p.category === name ? { ...p, category: "My prompts" } : p
    );
    setSavedPrompts(updatedPrompts);
    updatedPrompts.filter(p => p.category === "My prompts" && savedPrompts.find(op => op.id === p.id && op.category === name))
      .forEach(p => fetch("/api/ai/prompts", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(p) }));

    const updated = customCategories.filter(c => c !== name);
    setCustomCategories(updated);
    persistCategories(updated);
    if (promptCategory === name) setPromptCategory("All");
    showStatus("Folder deleted — prompts moved to My prompts ✓");
  }

  // ─── PROMPT LIBRARY (Supabase via /api/ai/prompts) ───────────────────────────

  async function loadPrompts(): Promise<SavedPrompt[]> {
    try {
      const res = await fetch("/api/ai/prompts");
      const json = await res.json().catch(() => ({}));
      // First time: seed with defaults if empty
      if (!json.prompts?.length) {
        await seedDefaultPrompts();
        return DEFAULT_PROMPTS;
      }
      return json.prompts || [];
    } catch { return DEFAULT_PROMPTS; }
  }

  async function seedDefaultPrompts() {
    try {
      await fetch("/api/ai/prompts/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: DEFAULT_PROMPTS }),
      });
    } catch {}
  }

  async function addPrompt() {
    if (!newPromptName.trim() || !newPromptText.trim()) return;
    try {
      const res = await fetch("/api/ai/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPromptName.trim(),
          category: newPromptCategory,
          text: newPromptText.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.prompt) setSavedPrompts(prev => [json.prompt, ...prev]);
      setNewPromptName("");
      setNewPromptText("");
      setShowNewPromptForm(false);
      showStatus("Prompt saved ✓");
    } catch { showStatus("Failed to save prompt ✗"); }
  }

  function saveCurrentInputAsPrompt() {
    const text = chatInput.trim();
    if (!text) { showStatus("Type a message first ✗"); return; }
    setNewPromptText(text);
    setAiPanelTab("prompts");
    setShowNewPromptForm(true);
  }

  async function deletePrompt(id: string) {
    try {
      await fetch(`/api/ai/prompts?id=${id}`, { method: "DELETE" });
      setSavedPrompts(prev => prev.filter(p => p.id !== id));
    } catch { showStatus("Failed to delete ✗"); }
  }

  async function updatePrompt(updated: SavedPrompt) {
    try {
      const res = await fetch("/api/ai/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json().catch(() => ({}));
      if (json.prompt) setSavedPrompts(prev => prev.map(p => p.id === updated.id ? json.prompt : p));
      setEditingPrompt(null);
      showStatus("Prompt updated ✓");
    } catch { showStatus("Failed to update ✗"); }
  }

  function usePrompt(text: string) {
    setAiPanelTab("chat");
    sendChatMessage(text);
  }

  function openAIDesignAssistant() {
    const designPrompt = `Review the current post and improve its structure, wording, and design for a polished B2B blog post aimed at the Israeli food market. Suggest stronger section headings, more compelling language, and layout guidance for a high-impact, easy-to-read article.`;
    setShowAIPanel(true);
    setAiPanelTab("chat");
    setTimeout(() => sendChatMessage(designPrompt), 100);
  }

  // Load history + prompts + categories when panel opens
  useEffect(() => {
    if (!showAIPanel) return;
    loadChatHistory().then(data => setChatHistory(Array.isArray(data) ? data : []));
    loadPrompts().then(data => setSavedPrompts(Array.isArray(data) ? data : []));
    setCustomCategories(loadCategories());
  }, [showAIPanel]);

  // Load this post's last conversation when switching posts
  useEffect(() => {
    if (!selectedSlug) return;
    loadChatHistory().then(history => {
      const safe = Array.isArray(history) ? history : [];
      const last = safe.find(c => c.postSlug === selectedSlug);
      if (last) setChatMessages(Array.isArray(last.messages) ? last.messages : []);
      else setChatMessages([]);
    });
  }, [selectedSlug]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="bg-gray-50 min-h-screen">
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
        .tab-btn{transition:all 0.15s ease}
        .tab-btn.active{background:#fff7ed;border-color:#fb923c;color:#c2410c;font-weight:600}
        .toolbar-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;font-size:13px;font-weight:500;border:1px solid #e2e8f0;background:#fff;color:#374151;cursor:pointer;transition:all 0.12s}
        .toolbar-btn:hover{background:#f8fafc;border-color:#cbd5e1}
        .toolbar-btn:active{background:#f1f5f9;transform:scale(0.97)}
        .post-item{transition:all 0.12s}
        .post-item:hover{background:#fafafa}
        .post-item.active{background:#fff7ed;border-color:#fdba74}
        .drop-overlay{pointer-events:none;position:absolute;inset:0;border:2.5px dashed #f97316;background:rgba(255,247,237,0.88);border-radius:16px;display:flex;align-items:center;justify-content:center;z-index:10}
        @keyframes ai-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .ai-pulse{animation:ai-pulse 1.4s ease-in-out infinite}
        .ai-panel{position:fixed;right:0;top:57px;bottom:0;width:380px;background:#fff;border-left:1px solid #e5e7eb;display:flex;flex-direction:column;z-index:40;box-shadow:-4px 0 24px rgba(0,0,0,0.07);transition:all 0.2s ease}
        .ai-panel.expanded{width:100vw;left:0;top:0;bottom:0;border-left:none;box-shadow:none}
        .ai-panel.expanded .chat-bubble-user{max-width:55%}
        .ai-panel.expanded .chat-bubble-ai{max-width:65%}
        .ai-expanded-inner{max-width:860px;width:100%;margin:0 auto;display:flex;flex-direction:column;flex:1;min-height:0}
        .chat-bubble-user{background:#f3f0ff;color:#3730a3;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13px;line-height:1.55;max-width:85%;align-self:flex-end;white-space:pre-wrap}
        .chat-bubble-ai{background:#f8fafc;border:1px solid #e2e8f0;color:#1e293b;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:13px;line-height:1.65;max-width:95%;align-self:flex-start;white-space:pre-wrap}
        .quick-chip{font-size:11px;padding:5px 10px;border-radius:99px;border:1px solid #e2e8f0;background:#f8fafc;color:#4b5563;cursor:pointer;white-space:nowrap;transition:all 0.12s}
        .quick-chip:hover{background:#f3f0ff;border-color:#c4b5fd;color:#6d28d9}
        .panel-tab{font-size:12px;font-weight:500;padding:6px 14px;border-radius:8px;cursor:pointer;border:none;background:transparent;color:#9ca3af;transition:all 0.12s}
        .panel-tab.active{background:rgba(255,255,255,0.15);color:#fff}
        .history-item{border:0.5px solid #e5e7eb;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fafafa;cursor:pointer;transition:all 0.12s}
        .history-item:hover{border-color:#c4b5fd;background:#f5f3ff}
        .history-date{font-size:10px;color:#9ca3af;margin-bottom:3px}
        .history-post{font-size:11px;font-weight:600;color:#6d28d9;margin-bottom:3px}
        .history-preview{font-size:12px;color:#4b5563;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      `}} />

      {/* TOP NAV */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-orange-600 hover:text-orange-700 font-medium">← Admin</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">Blog Editor</span>
          {statusMsg && (
            <span className={`text-sm px-3 py-1 rounded-full ${
              statusMsg.includes("✓") ? "bg-green-50 text-green-700" :
              statusMsg.includes("✗") || statusMsg.includes("failed") || statusMsg.includes("Wrong") ? "bg-red-50 text-red-700" :
              "bg-orange-50 text-orange-700"
            }`}>{statusMsg}</span>
          )}
          {!statusMsg && autosaveMsg && (
            <span className="text-xs text-gray-400">{autosaveMsg}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">{wordCount} words · ~{readingTime} min</span>
          <button
            onClick={() => setShowAIPanel(v => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              showAIPanel
                ? "bg-purple-600 text-white border border-purple-600"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-600 hover:from-purple-700 hover:to-indigo-700"
            }`}
            title="Open AI assistant — chat, generate content, ask questions"
          >
            <span style={{fontSize:"15px"}}>✦</span> AI Assistant
          </button>
          <button onClick={newDraft} className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
            + New post
          </button>
          {selectedSlug && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-sm font-medium text-red-600 disabled:opacity-40"
            >
              🗑 Delete
            </button>
          )}
          <button
            onClick={() => savePost()}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* AI ASSISTANT PANEL */}
      {showAIPanel && (
        <div className={`ai-panel${aiPanelExpanded ? " expanded" : ""}`}>
          {/* Panel header */}
          <div style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",padding:"12px 16px"}} className="flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-semibold text-sm flex items-center gap-2">
                <span>✦</span> AI Assistant
                {aiPanelExpanded && (
                  <span className="text-purple-300 text-xs font-normal ml-1">— fullscreen mode</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Expand / collapse toggle */}
                <button
                  onClick={() => setAiPanelExpanded(v => !v)}
                  title={aiPanelExpanded ? "Collapse panel" : "Expand to fullscreen"}
                  className="text-purple-200 hover:text-white px-2 py-0.5 rounded text-xs font-medium hover:bg-white/10 transition-colors"
                >
                  {aiPanelExpanded ? "⊡ Collapse" : "⊞ Expand"}
                </button>
                {/* Open in new tab — pass current post context as URL params */}
                <a
                  href={`/en/admin/ai-assistant?title=${encodeURIComponent(post.title || "")}&status=${post.status}&slug=${encodeURIComponent(post.slug || "")}&words=${wordCount}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open AI Assistant in full tab"
                  className="text-purple-200 hover:text-white px-2 py-0.5 rounded text-xs font-medium hover:bg-white/10 transition-colors"
                >⤢ New tab</a>
                {/* Close */}
                <button
                  onClick={() => { setShowAIPanel(false); setAiPanelExpanded(false); }}
                  className="text-purple-200 hover:text-white text-xl leading-none ml-1"
                  title="Close AI Assistant"
                >×</button>
              </div>
            </div>
            {/* Chat / History / Prompts tabs */}
            <div className="flex gap-1">
              <button className={`panel-tab ${aiPanelTab === "chat" ? "active" : ""}`} onClick={() => setAiPanelTab("chat")}>Chat</button>
              <button className={`panel-tab ${aiPanelTab === "history" ? "active" : ""}`} onClick={() => { setAiPanelTab("history"); loadChatHistory().then(data => setChatHistory(Array.isArray(data) ? data : [])); }}>
                History {Array.isArray(chatHistory) && chatHistory.length > 0 && <span style={{background:"rgba(255,255,255,0.25)",borderRadius:"99px",padding:"0 6px",fontSize:"10px",marginLeft:"4px"}}>{chatHistory.length}</span>}
              </button>
              <button className={`panel-tab ${aiPanelTab === "prompts" ? "active" : ""}`} onClick={() => { setAiPanelTab("prompts"); loadPrompts().then(data => setSavedPrompts(Array.isArray(data) ? data : [])); setShowNewPromptForm(false); setEditingPrompt(null); }}>
                Prompts <span style={{background:"rgba(255,255,255,0.25)",borderRadius:"99px",padding:"0 6px",fontSize:"10px",marginLeft:"4px"}}>{(Array.isArray(savedPrompts) ? savedPrompts.length : 0)}</span>
              </button>
            </div>
          </div>

          {/* POST CONTEXT BANNER */}
          <div className="flex-shrink-0 px-4 py-2 flex items-center gap-3" style={{
            background: post.title ? "#faf5ff" : "#fef9c3",
            borderBottom: "1px solid",
            borderColor: post.title ? "#e9d5ff" : "#fde68a",
          }}>
            <div className="flex-1 min-w-0">
              {post.title ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">Current post</span>
                  <span className="text-xs font-semibold text-purple-900 truncate">{post.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    post.status === "published" ? "bg-green-100 text-green-700" :
                    post.status === "draft" ? "bg-gray-100 text-gray-600" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{post.status}</span>
                  <span className="text-[10px] text-purple-400">{wordCount} words</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-600">No post selected</span>
                  <span className="text-xs text-yellow-700">Select a post from the editor to give AI full context</span>
                </div>
              )}
            </div>
            {aiPanelExpanded && (
              <button
                onClick={() => setAiPanelExpanded(false)}
                className="text-xs font-semibold px-3 py-1 rounded-lg border flex-shrink-0"
                style={{background:"#fff",borderColor:"#e9d5ff",color:"#7c3aed"}}
              >⊡ Collapse</button>
            )}
          </div>

          {/* HISTORY VIEW */}
          {aiPanelTab === "history" && (
            <div className="flex-1 overflow-auto p-3">
              {!Array.isArray(chatHistory) || chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div style={{fontSize:"28px",marginBottom:"8px"}}>📭</div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">No history yet</div>
                  <div className="text-xs text-gray-400">Conversations are saved automatically after each exchange.</div>
                </div>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">
                    {chatHistory.length} saved conversation{chatHistory.length !== 1 ? "s" : ""}
                  </div>
                  {(Array.isArray(chatHistory) ? chatHistory : []).map(conv => (
                    <div key={conv.id} className="history-item" onClick={() => restoreConversation(conv)}>
                      <div className="history-date">
                        {new Date(conv.savedAt).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                      </div>
                      <div className="history-post">📄 {conv.postTitle || conv.postSlug}</div>
                      <div className="history-preview">{conv.preview}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-purple-500">{conv.messages.length} messages — click to restore</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteHistoryItem(conv.id); }}
                          className="text-[10px] text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded"
                        >delete</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* PROMPTS VIEW */}
          {aiPanelTab === "prompts" && (
            <div className="flex-1 overflow-auto flex flex-col">

              {/* Category filter + folder manager toggle */}
              <div className="p-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Folders</span>
                  <button
                    onClick={() => setShowCatManager(v => !v)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${showCatManager ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:text-purple-600"}`}
                  >{showCatManager ? "← Done" : "⚙ Manage folders"}</button>
                </div>

                {/* FOLDER MANAGER */}
                {showCatManager ? (
                  <div className="space-y-1.5">
                    {/* System categories — read only */}
                    {["Content","SEO","Images","Israeli market"].map(cat => (
                      <div key={cat} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-[11px] text-gray-500 flex-1">{cat}</span>
                        <span className="text-[10px] text-gray-300 italic">system</span>
                      </div>
                    ))}
                    {/* Custom categories — editable */}
                    {customCategories.map(cat => (
                      editingCat === cat ? (
                        <div key={cat} className="flex items-center gap-1.5">
                          <input
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") renameCategory(cat, editingCatName); if (e.key === "Escape") setEditingCat(null); }}
                            className="flex-1 text-xs border border-purple-300 rounded-lg px-2 py-1 outline-none focus:border-purple-500"
                            autoFocus
                            dir="ltr"
                          />
                          <button onClick={() => renameCategory(cat, editingCatName)} className="text-[10px] px-2 py-1 rounded-lg bg-purple-600 text-white font-semibold">✓</button>
                          <button onClick={() => setEditingCat(null)} className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 text-gray-500">✕</button>
                        </div>
                      ) : (
                        <div key={cat} style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 10px",borderRadius:"8px",background:"#f5f3ff",border:"1px solid #ddd6fe",marginBottom:"4px"}}>
                          <span style={{fontSize:"12px",color:"#5b21b6",flex:1,fontWeight:"500"}}>{cat}</span>
                          <span style={{fontSize:"11px",color:"#a78bfa",marginRight:"4px"}}>{(Array.isArray(savedPrompts) ? savedPrompts : []).filter(p => p.category === cat).length} prompts</span>
                          <button
                            onClick={() => { setEditingCat(cat); setEditingCatName(cat); }}
                            style={{fontSize:"12px",padding:"4px 10px",borderRadius:"6px",border:"1px solid #8b5cf6",background:"#ede9fe",color:"#6d28d9",fontWeight:"600",cursor:"pointer"}}
                          >Rename</button>
                          <button
                            onClick={() => { if (window.confirm(`Delete folder "${cat}"? Prompts will move to My prompts.`)) deleteCategory(cat); }}
                            style={{fontSize:"12px",padding:"4px 10px",borderRadius:"6px",border:"1px solid #fca5a5",background:"#fff1f2",color:"#dc2626",fontWeight:"600",cursor:"pointer"}}
                          >Delete</button>
                        </div>
                      )
                    ))}
                    {/* Add new folder */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
                        placeholder="New folder name…"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400"
                        dir="ltr"
                      />
                      <button
                        onClick={addCategory}
                        disabled={!newCatName.trim()}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-40"
                      >+ Add</button>
                    </div>
                  </div>
                ) : (
                  /* Normal category pills */
                  <div className="flex flex-wrap gap-1.5">
                    {["All", ...SYSTEM_CATEGORIES.slice(1), ...customCategories].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPromptCategory(cat)}
                        className="text-[11px] px-2.5 py-1 rounded-full border transition-colors"
                        style={promptCategory === cat
                          ? {background:"#f3f0ff",borderColor:"#c4b5fd",color:"#6d28d9",fontWeight:"600"}
                          : {background:"#f9fafb",borderColor:"#e5e7eb",color:"#4b5563"}}
                      >{cat}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Prompt list */}
              <div className="flex-1 overflow-auto p-3">
                {(Array.isArray(savedPrompts) ? savedPrompts : [])
                  .filter(p => promptCategory === "All" || p.category === promptCategory)
                  .map(p => (
                    editingPrompt?.id === p.id ? (
                      /* Edit mode */
                      <div key={p.id} className="border border-purple-300 rounded-xl p-3 mb-3 bg-purple-50">
                        <input
                          value={editingPrompt.name}
                          onChange={e => setEditingPrompt({...editingPrompt, name: e.target.value})}
                          className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-purple-400"
                          placeholder="Prompt name"
                          dir="ltr"
                        />
                        <select
                          value={editingPrompt.category}
                          onChange={e => setEditingPrompt({...editingPrompt, category: e.target.value})}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-purple-400"
                        >
                          {[...SYSTEM_CATEGORIES.slice(1), ...customCategories].map(c => <option key={c}>{c}</option>)}
                        </select>
                        <textarea
                          value={editingPrompt.text}
                          onChange={e => setEditingPrompt({...editingPrompt, text: e.target.value})}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-purple-400 resize-none"
                          rows={4}
                          dir="ltr"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => updatePrompt(editingPrompt)} className="flex-1 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold">Save changes</button>
                          <button onClick={() => setEditingPrompt(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div key={p.id} className="border border-gray-200 rounded-xl p-3 mb-2 bg-white hover:border-purple-200 transition-colors group">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-gray-800 leading-snug">{p.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium flex-shrink-0">{p.category}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2">{p.text}</div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => usePrompt(p.text)}
                            className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold"
                          >▶ Use now</button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.text); showStatus("Copied ✓"); }}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-50"
                          >Copy</button>
                          <button
                            onClick={() => setEditingPrompt(p)}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-50"
                          >Edit</button>
                          <button
                            onClick={() => deletePrompt(p.id)}
                            className="px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50"
                          >✕</button>
                        </div>
                      </div>
                    )
                  ))
                }
                {(Array.isArray(savedPrompts) ? savedPrompts : []).filter(p => promptCategory === "All" || p.category === promptCategory).length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-400">No prompts in this category yet</div>
                )}
              </div>

              {/* Add new prompt */}
              <div className="border-t border-gray-100 p-3 flex-shrink-0">
                {!showNewPromptForm ? (
                  <button
                    onClick={() => setShowNewPromptForm(true)}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-xs text-gray-400 hover:text-purple-600 transition-colors"
                  >+ Save new prompt</button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">New prompt</div>
                    <input
                      value={newPromptName}
                      onChange={e => setNewPromptName(e.target.value)}
                      placeholder="Name (e.g. Israeli buyer intro)"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400"
                      dir="ltr"
                      autoFocus
                    />
                    <select
                      value={newPromptCategory}
                      onChange={e => setNewPromptCategory(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400"
                    >
                      {[...SYSTEM_CATEGORIES.slice(1), ...customCategories].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <textarea
                      value={newPromptText}
                      onChange={e => setNewPromptText(e.target.value)}
                      placeholder="The full prompt text…"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400 resize-none"
                      rows={4}
                      dir="ltr"
                    />
                    <div className="flex gap-2">
                      <button onClick={addPrompt} disabled={!newPromptName.trim() || !newPromptText.trim()} className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-40">Save prompt</button>
                      <button onClick={() => { setShowNewPromptForm(false); setNewPromptName(""); setNewPromptText(""); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT VIEW */}
          {aiPanelTab === "chat" && <>
          <div className={aiPanelExpanded ? "ai-expanded-inner" : "flex flex-col flex-1 min-h-0"}>

          {/* Quick actions */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Quick actions</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "🖼 Image prompts", fn: generateImagePrompts },
                { label: "Write full draft", msg: "Write a complete blog post draft for this topic. Use the current title as the topic." },
                { label: "5 title variants", msg: "Suggest 5 headline variants for this post with different angles:\n1. SEO keyword-focused\n2. Curiosity/intrigue\n3. Benefit-led (what reader gets)\n4. Question format\n5. Data/number-led\nMake each specific to food sourcing and the Israeli market." },
                { label: "Improve title", msg: "Suggest 3 better headline options for this post. Make them specific, benefit-driven, and SEO-friendly." },
                { label: "Generate excerpt", msg: "Write a compelling excerpt for this post (max 155 chars) that would make someone want to read it." },
                { label: "Suggest tags", msg: "Suggest 5 relevant tags for this post based on the content and the Israeli food market." },
                { label: "SEO check", msg: "Review this post for SEO. Check the title length, keyword usage, meta description, and heading structure. Give specific improvements." },
                { label: "Internal links", msg: "Based on this post content, what topics should I link to internally? Suggest 3 anchor text + topic combinations I should create or already have posts about." },
                { label: "Make it shorter", msg: "This post is too long. Summarize the key points and suggest what to cut without losing the main message." },
                { label: "Add CTA", msg: "Write a strong call-to-action paragraph for the end of this post that encourages buyers or manufacturers to reach out." },
                { label: "Israeli market tips", msg: "What are the most important things foreign food manufacturers should know about selling to Israeli supermarkets right now?" },
                { label: "Tone check", msg: "Review the tone of this post. Is it too formal, too casual, too generic? Suggest 2-3 specific edits to make it sound more authoritative and trustworthy for B2B food buyers." },
              ].map(q => (
                <button key={q.label} className="quick-chip"
                  onClick={() => q.fn ? q.fn() : sendChatMessage(q.msg!)}
                  style={q.label.includes("Image") ? {background:"#f3f0ff",borderColor:"#c4b5fd",color:"#6d28d9",fontWeight:"600"} : {}}
                >{q.label}</button>
              ))}
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
            {(!Array.isArray(chatMessages) || chatMessages.length === 0) && (
              <div className="text-center py-8">
                <div style={{fontSize:"32px",marginBottom:"8px"}}>✦</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Your AI writing partner</div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  I know your current post. Ask me anything — content ideas, SEO tips, field suggestions, or just chat about the Israeli food market.
                </div>
              </div>
            )}
            {(Array.isArray(chatMessages) ? chatMessages : []).map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                {msg.text || <span className="ai-pulse" style={{color:"#9ca3af"}}>✦ thinking…</span>}
              </div>
            ))}
            {chatLoading && (Array.isArray(chatMessages) ? chatMessages : [])[chatMessages.length-1]?.role !== "assistant" && (
              <div className="chat-bubble-ai"><span className="ai-pulse" style={{color:"#9ca3af"}}>✦ thinking…</span></div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="Ask anything about your post… (Enter to send)"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 resize-none"
                style={{minHeight:"44px", maxHeight:"120px"}}
                rows={1}
                dir="ltr"
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}
              >
                ↑
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex gap-3">
                {chatInput.trim() && (
                  <button onClick={saveCurrentInputAsPrompt} className="text-[10px] text-purple-500 hover:text-purple-700">
                    ★ save as prompt
                  </button>
                )}
                {Array.isArray(chatMessages) && chatMessages.length > 0 && (
                  <button onClick={() => { saveChatToHistory(chatMessages); setChatMessages([]); }} className="text-[10px] text-purple-400 hover:text-purple-600">
                    save + new
                  </button>
                )}
              </div>
              {chatMessages.length > 0 && (
                <button onClick={() => setChatMessages([])} className="text-[10px] text-gray-400 hover:text-gray-600">clear</button>
              )}
            </div>
          </div>

          </div>
          </> }
        </div>
      )}

      {/* LAYOUT */}
      <div className="flex h-[calc(100vh-57px)]" style={showAIPanel && !aiPanelExpanded ? {marginRight:"380px"} : {}}>

        {/* SIDEBAR */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          {selectedSlug && (
            <div className="px-3 pb-2 border-b border-gray-100">
              <button
                onClick={duplicatePost}
                disabled={duplicating}
                className="w-full text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-lg py-1.5 transition-colors disabled:opacity-40"
              >
                {duplicating ? "Duplicating…" : "⧉ Duplicate this post"}
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto p-3 space-y-1.5">
            {filteredPosts.length === 0
              ? <p className="text-xs text-gray-400 text-center py-8">No posts found</p>
              : filteredPosts.map(p => (
                <button
                  key={p.slug}
                  onClick={() => setSelectedSlug(p.slug)}
                  className={`post-item w-full text-left border rounded-xl p-3 ${selectedSlug === p.slug ? "active border-orange-300" : "border-gray-200"}`}
                >
                  <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{p.title || "(Untitled)"}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    <span className="text-[11px] text-gray-400 truncate">{formatDate(p.updated_at || p.published_at)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 truncate">/blog/{p.slug}</div>
                </button>
              ))
            }
          </div>
        </div>

        {/* EDITOR MAIN */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">

            {/* Metadata */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    value={post.title}
                    onChange={e => {
                      const t = e.target.value;
                      setField("title", t);
                      if (!post.slug || post.slug.startsWith("new-"))
                        setField("slug", slugify(t) || `new-${Date.now()}`);
                    }}
                    className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300"
                    placeholder="Post title…"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</label>
                  <div className="flex items-center mt-1 gap-1">
                    <span className="text-xs text-gray-400">/blog/</span>
                    <input value={post.slug} onChange={e => setField("slug", slugify(e.target.value))} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-300" dir="ltr" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <select value={post.status} onChange={e => setField("status", e.target.value as Post["status"])} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Publish date</label>
                    {post.published_at && (
                      <button onClick={() => setField("published_at", null)} className="text-xs text-gray-400 hover:text-red-500">✕ clear</button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={post.published_at ? post.published_at.slice(0, 16) : ""}
                    onChange={e => setField("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</label>
                    <div className="flex items-center gap-2">
                      <button onClick={generateAITags} disabled={aiTagsLoading} className="text-xs text-purple-600 hover:text-purple-700 font-semibold disabled:opacity-50">
                        {aiTagsLoading ? <span className="ai-pulse">✦ Generating…</span> : "✦ AI suggest"}
                      </button>
                      {(post.tags || []).length > 0 && (
                        <button onClick={() => setField("tags", [])} className="text-xs text-gray-400 hover:text-red-500">✕ clear</button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {(post.tags || []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1">
                        {tag}
                        <button onClick={() => setField("tags", (post.tags || []).filter(t => t !== tag))} className="hover:text-red-600 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                  <input value={(post.tags || []).join(", ")} onChange={e => setTagsFromString(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="tomato paste, private label, packaging" dir="ltr" />
                </div>

                {/* ── EXCERPT + AI BUTTON ── */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Excerpt</label>
                    <div className="flex items-center gap-2">
                      <button onClick={generateAIExcerpt} disabled={aiExcerptLoading} className="text-xs text-purple-600 hover:text-purple-700 font-semibold disabled:opacity-50">
                        {aiExcerptLoading ? <span className="ai-pulse">✦ Generating…</span> : "✦ AI generate"}
                      </button>
                      {post.excerpt && (
                        <button onClick={() => setField("excerpt", "")} className="text-xs text-gray-400 hover:text-red-500">✕ clear</button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={post.excerpt || ""}
                    onChange={e => setField("excerpt", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300 min-h-[70px] resize-none"
                    placeholder="Short summary for previews and search results…"
                    dir="ltr"
                  />
                  <div className="text-[11px] text-gray-400 mt-1">{(post.excerpt || "").length} / 160 chars</div>
                </div>

                {/* ── IMAGES: COVER + HERO SIDE BY SIDE ── */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Images</label>
                    <div className="flex items-center gap-3">
                      <button onClick={generateImagePrompts} className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1" title="AI generates image prompts for Midjourney / DALL-E">✦ AI prompts</button>
                      <Link href="/en/admin/blog-cover" target="_blank" className="text-xs text-gray-400 hover:text-gray-600">Manage all →</Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">

                    {/* ── COVER IMAGE ── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 font-medium">Cover <span className="text-gray-400">(list / card)</span></span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setShowCoverUrlInput(v => !v); setShowHeroUrlInput(false); }}
                            className={`text-xs font-semibold ${showCoverUrlInput ? "text-purple-600" : "text-gray-400 hover:text-purple-600"}`}
                            title="Paste image URL from Gemini, Midjourney, etc."
                          >🔗 URL</button>
                          <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading} className="text-xs text-orange-600 hover:text-orange-700 font-semibold disabled:opacity-50">
                            {coverUploading ? "Uploading…" : "↑ Upload"}
                          </button>
                          {post.cover_image && <button onClick={() => { setField("cover_image", null); setShowCoverUrlInput(false); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>}
                        </div>
                      </div>
                      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCoverImage(f); e.target.value = ""; }} />

                      {/* URL paste input */}
                      {showCoverUrlInput && !post.cover_image && (
                        <div className="mb-2 flex gap-1.5">
                          <input
                            value={coverUrlDraft}
                            onChange={e => setCoverUrlDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && coverUrlDraft.trim()) {
                                setField("cover_image", coverUrlDraft.trim());
                                setCoverUrlDraft("");
                                setShowCoverUrlInput(false);
                              }
                            }}
                            placeholder="Paste image URL…"
                            className="flex-1 text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400"
                            dir="ltr"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (coverUrlDraft.trim()) {
                                setField("cover_image", coverUrlDraft.trim());
                                setCoverUrlDraft("");
                                setShowCoverUrlInput(false);
                              }
                            }}
                            disabled={!coverUrlDraft.trim()}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold disabled:opacity-40"
                          >Use</button>
                        </div>
                      )}

                      {post.cover_image ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group" style={{height:"110px"}}>
                          <img src={post.cover_image} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1.5 flex-wrap px-2">
                            <button onClick={() => {
                              const saved = post.cover_position;
                              const parts = saved ? saved.split(" ") : [];
                              setImageEditorSrc(post.cover_image!);
                              setImageEditorField("cover_image");
                              setImageEditorAlt(post.cover_alt || "");
                              setImgPos({ x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 });
                              setImgFlip({ x: 1, y: 1 });
                            }} className="text-xs bg-white text-purple-700 px-2 py-1 rounded-lg font-semibold shadow">✎ Edit</button>
                            <button onClick={() => coverInputRef.current?.click()} className="text-xs bg-white text-gray-800 px-2 py-1 rounded-lg font-semibold shadow">↑ Replace</button>
                            <button onClick={() => { setShowCoverUrlInput(true); setField("cover_image", null); }} className="text-xs bg-white text-indigo-700 px-2 py-1 rounded-lg font-semibold shadow">🔗 URL</button>
                          </div>
                        </div>
                      ) : !showCoverUrlInput && (
                        <button onClick={() => coverInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-xs text-gray-400 hover:text-orange-600 transition-colors flex flex-col items-center justify-center gap-1" style={{height:"110px"}}>
                          <span style={{fontSize:"20px"}}>🖼</span>
                          <span>Cover image</span>
                          <span className="text-[10px]">Upload or paste URL</span>
                        </button>
                      )}
                      {post.cover_alt && (
                        <p className="text-[10px] text-gray-400 italic mt-1 truncate" title={post.cover_alt}>Alt: {post.cover_alt}</p>
                      )}
                    </div>

                    {/* ── HERO IMAGE ── */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 font-medium">Hero <span className="text-gray-400">(top of post)</span></span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setShowHeroUrlInput(v => !v); setShowCoverUrlInput(false); }}
                            className={`text-xs font-semibold ${showHeroUrlInput ? "text-purple-600" : "text-gray-400 hover:text-purple-600"}`}
                            title="Paste image URL from Gemini, Midjourney, etc."
                          >🔗 URL</button>
                          <button onClick={() => heroInputRef.current?.click()} disabled={heroUploading} className="text-xs text-orange-600 hover:text-orange-700 font-semibold disabled:opacity-50">
                            {heroUploading ? "Uploading…" : "↑ Upload"}
                          </button>
                          {post.hero_image && <button onClick={() => { setField("hero_image", null); setShowHeroUrlInput(false); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>}
                        </div>
                      </div>
                      <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeroImage(f); e.target.value = ""; }} />

                      {/* URL paste input */}
                      {showHeroUrlInput && !post.hero_image && (
                        <div className="mb-2 flex gap-1.5">
                          <input
                            value={heroUrlDraft}
                            onChange={e => setHeroUrlDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && heroUrlDraft.trim()) {
                                setField("hero_image", heroUrlDraft.trim());
                                setHeroUrlDraft("");
                                setShowHeroUrlInput(false);
                              }
                            }}
                            placeholder="Paste image URL…"
                            className="flex-1 text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400"
                            dir="ltr"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (heroUrlDraft.trim()) {
                                setField("hero_image", heroUrlDraft.trim());
                                setHeroUrlDraft("");
                                setShowHeroUrlInput(false);
                              }
                            }}
                            disabled={!heroUrlDraft.trim()}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold disabled:opacity-40"
                          >Use</button>
                        </div>
                      )}

                      {post.hero_image ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group" style={{height:"110px"}}>
                          <img src={post.hero_image} alt="Hero" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1.5 flex-wrap px-2">
                            <button onClick={() => {
                              const saved = post.hero_position;
                              const parts = saved ? saved.split(" ") : [];
                              setImageEditorSrc(post.hero_image!);
                              setImageEditorField("hero_image");
                              setImageEditorAlt(post.hero_alt || "");
                              setImgPos({ x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 });
                              setImgFlip({ x: 1, y: 1 });
                            }} className="text-xs bg-white text-purple-700 px-2 py-1 rounded-lg font-semibold shadow">✎ Edit</button>
                            <button onClick={() => heroInputRef.current?.click()} className="text-xs bg-white text-gray-800 px-2 py-1 rounded-lg font-semibold shadow">↑ Replace</button>
                            <button onClick={() => { setShowHeroUrlInput(true); setField("hero_image", null); }} className="text-xs bg-white text-indigo-700 px-2 py-1 rounded-lg font-semibold shadow">🔗 URL</button>
                          </div>
                        </div>
                      ) : !showHeroUrlInput && (
                        <button onClick={() => heroInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-xs text-gray-400 hover:text-orange-600 transition-colors flex flex-col items-center justify-center gap-1" style={{height:"110px"}}>
                          <span style={{fontSize:"20px"}}>🌅</span>
                          <span>Hero image</span>
                          <span className="text-[10px]">Upload or paste URL</span>
                        </button>
                      )}
                      {post.hero_alt && (
                        <p className="text-[10px] text-gray-400 italic mt-1 truncate" title={post.hero_alt}>Alt: {post.hero_alt}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4">
                  {post.status === "published" ? (
                    <Link href={`/en/blog/${post.slug}`} target="_blank" className="text-xs text-gray-500 hover:underline">View on site →</Link>
                  ) : (
                    <span className="text-xs text-amber-500" title="Publish the post first to view it on site">
                      ⚠ Not published yet — can&apos;t view on site
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {/* WhatsApp snippet */}
                    {post.slug && (
                      <button onClick={copyWhatsAppSnippet} className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-xs font-semibold text-green-700" title="Copy WhatsApp share message">📲 WhatsApp</button>
                    )}
                    {post.status !== "published" && (
                      <button
                        onClick={() => setShowPublishChecklist(true)}
                        className="px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                      >
                        🚀 Publish now
                      </button>
                    )}
                    {post.status === "published" && (
                      <span className="text-xs text-green-600 font-semibold">✓ Published</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart suggestions */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">Suggestions:</span>
              <select value={audienceMode} onChange={e => setAudienceMode(e.target.value as any)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-300">
                <option value="buyers">Buyers (Israel)</option>
                <option value="manufacturers">Manufacturers (Exporters)</option>
              </select>
              <button onClick={applyAutoStructure} className="toolbar-btn text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100">✦ Auto structure</button>
              <button onClick={insertSupplierChecklist} className="toolbar-btn">+ Supplier checklist</button>
              <div className="ml-auto">
                <button onClick={() => setShowHelp(v => !v)} className="text-xs text-gray-500 hover:text-orange-600 font-medium">
                  {showHelp ? "− Hide guide" : "? Writing guide"}
                </button>
              </div>
            </div>

            {/* Writing guide */}
            {showHelp && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4 text-sm">
                <h3 className="font-bold text-gray-900 mb-3">How to create and publish a post</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-gray-700">
                  {[
                    ["1 — AI draft", "Click ✦ AI draft in the top bar. Type a topic → full post in seconds."],
                    ["2 — Write / edit", "Use H2 for sections. Keep paragraphs short (2–3 lines)."],
                    ["3 — Add images", "Drag and drop images into the editor — they upload and insert automatically."],
                    ["4 — Excerpt + meta", "Click ✦ AI generate excerpt to fill both fields automatically."],
                    ["5 — Preview", "Click Preview tab to see the final look."],
                    ["6 — Publish", "Set status → Published and click Save. Autosave runs every 30s."],
                  ].map(([t, d]) => (
                    <div key={t}><strong>{t}</strong><p className="text-gray-500 mt-0.5">{d}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 mb-3">
              {(["visual", "blocks", "html", "preview", "seo"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab-btn px-4 py-2 rounded-lg text-sm border ${tab === t ? "active" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {t === "visual" ? "✏️ Visual" : t === "blocks" ? "⊞ Blocks" : t === "html" ? "</> HTML" : t === "preview" ? "👁 Preview" : "⚙ SEO"}
                </button>
              ))}
            </div>

            {/* VISUAL EDITOR */}
            {tab === "visual" && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-1.5 items-center border-b border-gray-100 p-3 bg-gray-50/80">
                  <button className="toolbar-btn font-bold" onClick={() => exec("bold")} title="Bold (Ctrl+B)">B</button>
                  <button className="toolbar-btn italic" onClick={() => exec("italic")} title="Italic (Ctrl+I)">I</button>
                  <button className="toolbar-btn underline" onClick={() => exec("underline")} title="Underline (Ctrl+U)">U</button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button className="toolbar-btn" onClick={() => exec("formatBlock", "h2")}>H2</button>
                  <button className="toolbar-btn" onClick={() => exec("formatBlock", "h3")}>H3</button>
                  <button className="toolbar-btn" onClick={() => exec("formatBlock", "p")}>¶</button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button className="toolbar-btn" onClick={() => exec("insertUnorderedList")}>• List</button>
                  <button className="toolbar-btn" onClick={() => exec("insertOrderedList")}>1. List</button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button className="toolbar-btn" onClick={() => exec("undo")} title="Undo (Ctrl+Z)">↺</button>
                  <button className="toolbar-btn" onClick={() => exec("redo")} title="Redo (Ctrl+Y)">↻</button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  {/* Image upload in toolbar */}
                  <button
                    className="toolbar-btn text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading}
                    title="Upload image (or drag-drop into editor)"
                  >
                    {imageUploading ? "↑ Uploading…" : "🖼 Image"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImageFile(f); e.target.value = ""; }}
                  />
                  <button
                    className="toolbar-btn text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
                    onClick={openAIDesignAssistant}
                    title="Open AI assistant to improve the post design and writing"
                  >
                    ✦ AI design
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  {/* Pull quote */}
                  <button className="toolbar-btn text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100" onClick={insertPullQuote} title="Wrap selection in pull quote">❝ Quote</button>
                  {/* Key facts box */}
                  <button className="toolbar-btn text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100" onClick={insertKeyFacts} title="Insert key facts box">★ Facts</button>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  {/* Link inserter */}
                  <div className="relative">
                    <button className="toolbar-btn" onClick={() => setShowLinkPopover(v => !v)} title="Insert link (select text first)">🔗 Link</button>
                    {showLinkPopover && (
                      <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-72">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Insert link</div>
                        <input
                          value={linkUrl}
                          onChange={e => setLinkUrl(e.target.value)}
                          placeholder="https://…"
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-orange-300"
                          dir="ltr"
                          autoFocus
                          onKeyDown={e => e.key === "Enter" && insertLink()}
                        />
                        <input
                          value={linkText}
                          onChange={e => setLinkText(e.target.value)}
                          placeholder="Link text (optional — uses URL if empty)"
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-orange-300"
                          dir="ltr"
                          onKeyDown={e => e.key === "Enter" && insertLink()}
                        />
                        <div className="flex gap-2">
                          <button onClick={insertLink} disabled={!linkUrl.trim()} className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold disabled:opacity-40">Insert</button>
                          <button onClick={() => setShowLinkPopover(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  {/* Clear content */}
                  <button
                    className="toolbar-btn text-red-500 border-red-100 bg-red-50 hover:bg-red-100"
                    onClick={() => {
                      if (window.confirm("Clear all content in the editor? This cannot be undone.")) {
                        const empty = "<p></p>";
                        setField("content", empty);
                        if (editorRef.current) {
                          editorRef.current.innerHTML = empty;
                          editorRef.current.focus();
                        }
                        showStatus("Content cleared");
                      }
                    }}
                    title="Clear all editor content"
                  >🗑 Clear</button>
                  <div className="ml-auto text-[11px] text-gray-400 hidden sm:block">Ctrl+B · Ctrl+Z · Ctrl+S · drag image</div>
                </div>

                {/* Editable area with drag-drop */}
                <div
                  className="relative"
                  onDragOver={handleEditorDragOver}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleEditorDrop}
                >
                  {isDragOver && (
                    <div className="drop-overlay">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🖼</div>
                        <div className="text-orange-700 font-semibold text-sm">Drop to insert image</div>
                      </div>
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={onEditorInput}
                    onKeyDown={handleEditorKeyDown}
                    data-placeholder="Start writing here… or click ✦ AI draft to generate a full post instantly"
                    dir="ltr"
                    lang="en"
                    className="editor-area p-6 min-h-[500px] w-full outline-none text-base"
                    style={{ direction: "ltr", textAlign: "left", unicodeBidi: "embed" }}
                  />
                </div>

                <div className="px-5 pb-3 border-t border-gray-100 pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">{wordCount} words · ~{readingTime} min read</span>
                  <span className="text-[11px] text-gray-400">Ctrl+Z undo · Ctrl+S save · drag image to insert</span>
                </div>
              </div>
            )}

            {/* BLOCKS */}
            {tab === "blocks" && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 min-h-[500px]">
                <p className="text-sm text-gray-500 mb-4">Drag blocks to reorder content sections.</p>
                {blocks.length === 0
                  ? <p className="text-sm text-gray-400 italic text-center py-16">No content yet — switch to Visual to write.</p>
                  : (
                    <div className="space-y-2">
                      {blocks.map((block, index) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", index.toString()); }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleBlockDrop(e, index)}
                          className="flex items-start gap-3 group bg-white border border-gray-200 rounded-xl p-3.5 hover:border-orange-300 hover:shadow-sm transition cursor-grab active:cursor-grabbing"
                        >
                          <div className="mt-1 text-gray-300 group-hover:text-gray-400 flex-shrink-0">
                            <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
                              <circle cx="5" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="5" r="1.5" fill="currentColor"/>
                              <circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                              <circle cx="5" cy="15" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/>
                            </svg>
                          </div>
                          <div className="flex-1 overflow-hidden min-w-0">
                            <span className="inline-block px-1.5 py-0.5 mb-1.5 text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-100 rounded">{block.tagName}</span>
                            <div dir="ltr" className="text-sm text-gray-700 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.html }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* HTML */}
            {tab === "html" && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-mono">HTML source</div>
                <textarea value={post.content || ""} onChange={e => setField("content", e.target.value)} className="w-full px-5 py-4 text-sm font-mono outline-none min-h-[500px] resize-none text-gray-800" dir="ltr" spellCheck={false} />
              </div>
            )}

            {/* PREVIEW */}
            {tab === "preview" && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 min-h-[500px]">
                {post.title && <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>}
                {post.excerpt && <p className="text-gray-500 mb-6">{post.excerpt}</p>}
                {(post.title || post.excerpt) && <hr className="mb-6 border-gray-100" />}
                <div dir="ltr" className="editor-area" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
              </div>
            )}

            {/* SEO */}
            {tab === "seo" && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta title</label>
                  <input value={post.meta_title || ""} onChange={e => setField("meta_title", e.target.value)} className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-300" placeholder="Optional — falls back to post title" dir="ltr" />
                  <div className="text-[11px] text-gray-400 mt-1">{(post.meta_title || post.title || "").length} / 60 chars</div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta description</label>
                    <button onClick={generateAIExcerpt} disabled={aiExcerptLoading} className="text-xs text-purple-600 hover:text-purple-700 font-semibold disabled:opacity-50">
                      {aiExcerptLoading ? <span className="ai-pulse">✦ Generating…</span> : "✦ AI generate"}
                    </button>
                  </div>
                  <textarea value={post.meta_description || ""} onChange={e => setField("meta_description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-300 min-h-[100px] resize-none" placeholder="Optional — falls back to excerpt" dir="ltr" />
                  <div className="text-[11px] text-gray-400 mt-1">{(post.meta_description || post.excerpt || "").length} / 160 chars</div>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide font-semibold">Search result preview</div>
                  <div className="text-blue-700 text-base">{post.meta_title || post.title || "Post title"}</div>
                  <div className="text-green-700 text-xs mt-0.5">yoursite.com/en/blog/{post.slug || "post-slug"}</div>
                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">{post.meta_description || post.excerpt || "Post description will appear here…"}</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── IMAGE EDITOR MODAL ── */}
      {imageEditorSrc && imageEditorField && (
        <div className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{maxHeight:"90vh"}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">{imageEditorField === "cover_image" ? "Edit cover image" : "Edit hero image"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Drag image to reposition · flip · AI alt text</p>
              </div>
              <button onClick={() => { setImageEditorSrc(null); setImageEditorField(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {/* Drag-to-pan preview */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Drag to reposition</span>
                <button
                  onClick={() => setImgPos({ x: 50, y: 50 })}
                  className="text-[10px] text-gray-400 hover:text-purple-600 font-normal"
                >Reset to center</button>
              </div>
              <div
                ref={imgContainerRef}
                className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 mb-1 select-none"
                style={{
                  height: "260px",
                  cursor: isDraggingImg ? "grabbing" : "grab",
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  setIsDraggingImg(true);
                  dragStartRef.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y };
                }}
                onMouseMove={e => {
                  if (!isDraggingImg || !dragStartRef.current || !imgContainerRef.current) return;
                  const rect = imgContainerRef.current.getBoundingClientRect();
                  // Convert pixel drag delta to percentage shift (inverted — drag right = show left side)
                  const dx = ((dragStartRef.current.mx - e.clientX) / rect.width) * 100;
                  const dy = ((dragStartRef.current.my - e.clientY) / rect.height) * 100;
                  setImgPos({
                    x: Math.max(0, Math.min(100, dragStartRef.current.px + dx)),
                    y: Math.max(0, Math.min(100, dragStartRef.current.py + dy)),
                  });
                }}
                onMouseUp={() => setIsDraggingImg(false)}
                onMouseLeave={() => setIsDraggingImg(false)}
              >
                <img
                  src={imageEditorSrc!}
                  alt="Preview"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `${imgPos.x}% ${imgPos.y}%`,
                    transform: `scaleX(${imgFlip.x}) scaleY(${imgFlip.y})`,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
                {/* Crosshair overlay shows current focus point */}
                <div style={{
                  position: "absolute",
                  left: `${imgPos.x}%`,
                  top: `${imgPos.y}%`,
                  transform: "translate(-50%,-50%)",
                  width: "28px", height: "28px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                  opacity: isDraggingImg ? 1 : 0.6,
                  transition: "opacity 0.15s",
                }} />
              </div>
              <div className="text-[10px] text-gray-400 mb-5 text-center">
                Position: {Math.round(imgPos.x)}% × {Math.round(imgPos.y)}%
              </div>

              {/* Flip */}
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Flip</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImgFlip(f => ({ ...f, x: f.x * -1 }))}
                    className={`toolbar-btn ${imgFlip.x === -1 ? "bg-purple-50 border-purple-300 text-purple-700" : ""}`}
                  >⇄ Flip horizontal</button>
                  <button
                    onClick={() => setImgFlip(f => ({ ...f, y: f.y * -1 }))}
                    className={`toolbar-btn ${imgFlip.y === -1 ? "bg-purple-50 border-purple-300 text-purple-700" : ""}`}
                  >⇅ Flip vertical</button>
                  {(imgFlip.x === -1 || imgFlip.y === -1) && (
                    <button
                      onClick={() => setImgFlip({ x: 1, y: 1 })}
                      className="text-xs text-gray-400 hover:text-red-500 ml-1"
                    >✕ Reset flip</button>
                  )}
                </div>
              </div>

              {/* AI Alt Text */}
              <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">✦ Alt text — SEO + accessibility</div>
                <div className="flex gap-2 mb-1.5">
                  <input
                    value={imageEditorAlt}
                    onChange={e => setImageEditorAlt(e.target.value)}
                    placeholder="AI will describe the image, or type manually…"
                    className="flex-1 text-xs border border-purple-200 rounded-lg px-2.5 py-2 outline-none focus:border-purple-400 bg-white"
                    dir="ltr"
                    maxLength={125}
                  />
                  <button
                    onClick={async () => {
                      const alt = await generateAltText(imageEditorSrc!);
                      if (alt) setImageEditorAlt(alt);
                      else showStatus("Could not generate alt text — try manually ✗");
                    }}
                    disabled={altLoading}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40 flex-shrink-0"
                    style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}
                  >{altLoading ? "✦ Thinking…" : "✦ AI describe"}</button>
                </div>
                <div className="text-[10px] text-purple-400">{imageEditorAlt.length}/125 chars · Used as alt= attribute for screen readers and Google Image Search</div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0 bg-gray-50/80">
              <button onClick={() => { setImageEditorSrc(null); setImageEditorField(null); }} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <p className="text-[11px] text-gray-400 flex-1">Crop position is visual only — original file is unchanged.</p>
              <button
                onClick={() => {
                  const positionString = `${Math.round(imgPos.x)}% ${Math.round(imgPos.y)}%`;
                  const fieldPrefix = imageEditorField === "cover_image" ? "cover" : "hero";
                  setPost(p => ({
                    ...p,
                    ...(fieldPrefix === "cover"
                      ? { cover_alt: imageEditorAlt || p.cover_alt, cover_position: positionString }
                      : { hero_alt: imageEditorAlt || p.hero_alt, hero_position: positionString }
                    ),
                  }));
                  setImageEditorSrc(null);
                  setImageEditorField(null);
                  showStatus("Saved ✓");
                  setTimeout(() => savePost(false), 150);
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
              >Save &amp; close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PUBLISH CHECKLIST MODAL ── */}
      {showPublishChecklist && (() => {
        const checks = getPublishChecklist();
        const allOk = checks.every(c => c.ok);
        const score = checks.filter(c => c.ok).length;
        return (
          <div className="fixed inset-0 z-[9996] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white p-7 rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="text-center mb-5">
                <div className="text-3xl mb-2">{allOk ? "🚀" : "📋"}</div>
                <h2 className="text-lg font-bold text-gray-900">Pre-publish checklist</h2>
                <p className="text-sm text-gray-500 mt-1">{score}/{checks.length} complete</p>
              </div>
              <div className="space-y-2 mb-5">
                {checks.map(c => (
                  <div key={c.label} className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg ${c.ok ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-500"}`}>
                    <span className="text-base flex-shrink-0">{c.ok ? "✓" : "○"}</span>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
              {!allOk && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-center">
                  Some items are incomplete — you can still publish.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowPublishChecklist(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Keep editing
                </button>
                <button
                  onClick={async () => {
                    setShowPublishChecklist(false);
                    setPost(p => ({ ...p, status: "published", published_at: p.published_at || new Date().toISOString() }));
                    await savePost();
                    showStatus("Published ✓");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
                >
                  {allOk ? "🚀 Publish now" : "Publish anyway"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AI DRAFT MODAL ── */}
      {showAIDraft && (
        <div className="fixed inset-0 z-[9997] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-7 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">✦ AI draft generator</h2>
                <p className="text-sm text-gray-500 mt-0.5">Type a topic → get a full structured post in seconds</p>
              </div>
              <button onClick={() => setShowAIDraft(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic</label>
                <input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !aiGenerating) generateAIDraft(); }}
                  autoFocus
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  placeholder="e.g. tomato paste demand in Israel 2025, kosher snack trends…"
                  dir="ltr"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">Be specific — the more detail you give, the better the output. Press Enter to generate.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</label>
                <div className="mt-1.5 flex gap-2">
                  {(["buyers", "manufacturers"] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setAiAudience(a)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        aiAudience === a ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {a === "buyers" ? "🛒 Israeli buyers" : "🏭 Manufacturers / exporters"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide font-semibold">Quick examples — click to use</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Tomato paste packaging trends Israel",
                    "Kosher certification for EU exporters",
                    "Private label olive oil opportunities",
                    "Israeli supermarket import requirements 2025",
                  ].map(ex => (
                    <button
                      key={ex}
                      onClick={() => setAiTopic(ex)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAIDraft(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={generateAIDraft}
                disabled={aiGenerating || !aiTopic.trim()}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {aiGenerating ? <span className="ai-pulse">✦ Writing your post…</span> : "✦ Generate draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-7 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3 text-2xl">🗑</div>
              <h2 className="text-lg font-bold text-gray-900">Delete this post?</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                <strong className="text-gray-800">"{post.title || post.slug}"</strong> will be moved to <span className="font-semibold text-slate-700">draft</span>. No content is lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={deletePost} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
