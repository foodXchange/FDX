"use client";

// FILE LOCATION: app/en/admin/ai-assistant/page.tsx
//
// Standalone full-screen AI Assistant — open in a dedicated browser tab.
// Has the same Chat, History, Prompts tabs as the panel in the blog editor,
// but uses the full screen width for a much more comfortable experience.

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Message = { role: "user" | "assistant"; text: string };
type SavedConversation = {
  id: string; postSlug: string; postTitle: string;
  savedAt: string; preview: string; messages: Message[];
};
type SavedPrompt = {
  id: string; name: string; category: string; text: string; createdAt: string;
};

const SYSTEM_CATEGORIES = ["All", "Content", "SEO", "Images", "Israeli market"];
const CAT_KEY = "fx_prompt_categories";

function AIAssistantContent() {
  const [tab, setTab] = useState<"chat" | "history" | "prompts">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<SavedConversation[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [promptCategory, setPromptCategory] = useState("All");
  const [customCategories, setCustomCategories] = useState<string[]>(["My prompts"]);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("My prompts");
  const [newText, setNewText] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const postTitle = searchParams.get("title") || "";
  const postStatus = searchParams.get("status") || "";
  const postSlug = searchParams.get("slug") || "";
  const postWords = searchParams.get("words") || "";

  function showStatus(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 2000);
  }

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/ai/chat-history").then(r => r.json()).then(j => setChatHistory(Array.isArray(j.history) ? j.history : [])).catch(() => {});
    fetch("/api/ai/prompts").then(r => r.json()).then(j => setPrompts(Array.isArray(j.prompts) ? j.prompts : [])).catch(() => {});
    try { const raw = localStorage.getItem(CAT_KEY); if (raw) setCustomCategories(JSON.parse(raw)); } catch {}
  }, []);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  async function sendMessage(override?: string) {
    const msg = (override ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    const newMsgs = [...messages, { role: "user" as const, text: msg }];
    setMessages(newMsgs);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const history = newMsgs.map(m => (m.role === "user" ? "User" : "Assistant") + ": " + m.text).join("\n");

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are an AI assistant for FoodXchange — a B2B food sourcing platform connecting Israeli food buyers with global manufacturers. Be concise, practical, and specific. Help with content, SEO, market insights, and platform questions.",
          user: history,
        }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";
      setMessages(prev => [...prev, { role: "assistant", text: "" }]);
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
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) updated[updated.length - 1] = { role: "assistant", text: accumulated };
            return updated;
          });
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
      // Save to history
      const finalMsgs = [...newMsgs, { role: "assistant" as const, text: accumulated }];
      await fetch("/api/ai/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_slug: "ai-assistant", post_title: "AI Assistant", preview: msg.slice(0, 80), messages: finalMsgs }),
      });
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Check your API key." }]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  // ── Prompts ──────────────────────────────────────────────────────────────────
  async function addPrompt() {
    if (!newName.trim() || !newText.trim()) return;
    const res = await fetch("/api/ai/prompts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), category: newCategory, text: newText.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.prompt) { setPrompts(prev => [json.prompt, ...prev]); setNewName(""); setNewText(""); setShowNewPrompt(false); showStatus("Prompt saved ✓"); }
  }

  async function deletePrompt(id: string) {
    await fetch(`/api/ai/prompts?id=${id}`, { method: "DELETE" });
    setPrompts(prev => prev.filter(p => p.id !== id));
  }

  async function updatePrompt(p: SavedPrompt) {
    const res = await fetch("/api/ai/prompts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const json = await res.json().catch(() => ({}));
    if (json.prompt) { setPrompts(prev => prev.map(x => x.id === p.id ? json.prompt : x)); setEditingPrompt(null); showStatus("Updated ✓"); }
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || customCategories.includes(name)) return;
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    localStorage.setItem(CAT_KEY, JSON.stringify(updated));
    setNewCatName("");
  }

  function deleteCategory(name: string) {
    if (!window.confirm(`Delete folder "${name}"? Prompts will move to My prompts.`)) return;
    const updated = customCategories.filter(c => c !== name);
    setCustomCategories(updated);
    localStorage.setItem(CAT_KEY, JSON.stringify(updated));
    const updatedPrompts = prompts.map(p => p.category === name ? { ...p, category: "My prompts" } : p);
    setPrompts(updatedPrompts);
    updatedPrompts.filter(p => p.category === "My prompts").forEach(p =>
      fetch("/api/ai/prompts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
    );
  }

  const allCategories = [...SYSTEM_CATEGORIES.slice(1), ...customCategories];
  const filteredPrompts = (Array.isArray(prompts) ? prompts : []).filter(p => promptCategory === "All" || p.category === promptCategory);

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ color: "#fff", fontWeight: "600", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✦</span> AI Assistant
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["chat", "history", "prompts"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ fontSize: "12px", fontWeight: "500", padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", transition: "all 0.12s",
                  background: tab === t ? "rgba(255,255,255,0.18)" : "transparent",
                  color: tab === t ? "#fff" : "rgba(255,255,255,0.6)" }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "history" && chatHistory.length > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "99px", padding: "0 6px", fontSize: "10px", marginLeft: "4px" }}>{chatHistory.length}</span>
                )}
                {t === "prompts" && (
                  <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "99px", padding: "0 6px", fontSize: "10px", marginLeft: "4px" }}>{prompts.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {statusMsg && <span style={{ fontSize: "12px", color: "#e9d5ff" }}>{statusMsg}</span>}
          <Link href="/en/admin/blog-editor" style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.15)" }}>← Back to editor</Link>
        </div>
      </div>

      {/* POST CONTEXT BANNER */}
      <div style={{
        padding: "10px 24px",
        background: postTitle ? "#faf5ff" : "#fef9c3",
        borderBottom: `1px solid ${postTitle ? "#e9d5ff" : "#fde68a"}`,
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        {postTitle ? (
          <>
            <span style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "#7c3aed" }}>Current post</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#4c1d95" }}>{postTitle}</span>
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "500",
              background: postStatus === "published" ? "#dcfce7" : "#f3f4f6",
              color: postStatus === "published" ? "#15803d" : "#6b7280" }}>{postStatus}</span>
            {postWords && <span style={{ fontSize: "11px", color: "#a78bfa" }}>{postWords} words</span>}
            {postSlug && <span style={{ fontSize: "11px", color: "#a78bfa" }}>/blog/{postSlug}</span>}
          </>
        ) : (
          <>
            <span style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309" }}>⚠ No post context</span>
            <span style={{ fontSize: "12px", color: "#78350f" }}>Open this from the blog editor to load post context automatically</span>
          </>
        )}
      </div>

      {/* CHAT TAB */}
      {tab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "800px", width: "100%", margin: "0 auto", padding: "0 24px" }}>
          {/* Quick chips */}
          <div style={{ padding: "16px 0 8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {["Write full draft", "Improve title", "Generate excerpt", "Suggest tags", "SEO check", "Add CTA", "Israeli market tips", "Tone check"].map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "99px", border: "1px solid #e2e8f0", background: "#fff", color: "#4b5563", cursor: "pointer" }}
              >{q}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "12px 0" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>✦</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Your AI writing partner</div>
                <div style={{ fontSize: "13px" }}>Ask anything about your blog, content strategy, or the Israeli food market.</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "#f3f0ff" : "#fff",
                border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none",
                color: msg.role === "user" ? "#3730a3" : "#1e293b",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px", fontSize: "14px", lineHeight: "1.65",
                maxWidth: "75%", whiteSpace: "pre-wrap",
              }}>
                {msg.text || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>✦ thinking…</span>}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 0", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                dir="ltr"
                rows={2}
                style={{ flex: 1, fontSize: "14px", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px", outline: "none", resize: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ padding: "12px 20px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none", fontWeight: "600", fontSize: "14px", cursor: "pointer", opacity: loading || !input.trim() ? 0.4 : 1 }}
              >↑</button>
            </div>
            {messages.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button onClick={() => setMessages([])} style={{ fontSize: "11px", color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>clear conversation</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div style={{ flex: 1, overflowY: "auto", maxWidth: "800px", width: "100%", margin: "0 auto", padding: "24px" }}>
          {chatHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>No history yet</div>
            </div>
          ) : chatHistory.map(conv => (
            <div key={conv.id} onClick={() => { setMessages(conv.messages); setTab("chat"); }}
              style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px", background: "#fff", cursor: "pointer" }}
            >
              <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                {new Date(conv.savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#6d28d9", marginBottom: "4px" }}>📄 {conv.postTitle}</div>
              <div style={{ fontSize: "13px", color: "#4b5563" }}>{conv.preview}</div>
              <div style={{ fontSize: "11px", color: "#a78bfa", marginTop: "6px" }}>{conv.messages.length} messages — click to restore</div>
            </div>
          ))}
        </div>
      )}

      {/* PROMPTS TAB */}
      {tab === "prompts" && (
        <div style={{ flex: 1, display: "flex", maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "24px", gap: "24px" }}>
          {/* Left: categories */}
          <div style={{ width: "200px", flexShrink: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "10px" }}>Folders</div>
            {["All", ...SYSTEM_CATEGORIES.slice(1), ...customCategories].map(cat => (
              <button key={cat} onClick={() => setPromptCategory(cat)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", marginBottom: "2px",
                  background: promptCategory === cat ? "#f3f0ff" : "transparent",
                  color: promptCategory === cat ? "#6d28d9" : "#4b5563",
                  fontWeight: promptCategory === cat ? "600" : "400" }}
              >{cat}</button>
            ))}
            <div style={{ marginTop: "16px", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
              <button onClick={() => setShowCatManager(v => !v)}
                style={{ fontSize: "11px", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >⚙ Manage folders</button>
              {showCatManager && (
                <div style={{ marginTop: "10px" }}>
                  {customCategories.map(cat => (
                    editingCat === cat ? (
                      <div key={cat} style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                        <input value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { const t = editingCatName.trim(); if (t && t !== cat) { const u = customCategories.map(c => c === cat ? t : c); setCustomCategories(u); localStorage.setItem(CAT_KEY, JSON.stringify(u)); if (promptCategory === cat) setPromptCategory(t); } setEditingCat(null); } }}
                          style={{ flex: 1, fontSize: "11px", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "4px 8px", outline: "none" }} autoFocus dir="ltr" />
                        <button onClick={() => setEditingCat(null)} style={{ fontSize: "11px", color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "6px", background: "#f5f3ff", marginBottom: "4px" }}>
                        <span style={{ flex: 1, fontSize: "12px", color: "#5b21b6" }}>{cat}</span>
                        <button onClick={() => { setEditingCat(cat); setEditingCatName(cat); }} style={{ fontSize: "11px", color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}>✎</button>
                        <button onClick={() => deleteCategory(cat)} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                      </div>
                    )
                  ))}
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
                      placeholder="New folder…" style={{ flex: 1, fontSize: "11px", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 8px", outline: "none" }} dir="ltr" />
                    <button onClick={addCategory} style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer" }}>+</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: prompt cards */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>{filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? "s" : ""}</div>
              <button onClick={() => setShowNewPrompt(true)}
                style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}
              >+ New prompt</button>
            </div>

            {showNewPrompt && (
              <div style={{ border: "1px solid #c4b5fd", borderRadius: "12px", padding: "16px", marginBottom: "16px", background: "#faf5ff" }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Prompt name"
                  style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", marginBottom: "8px", outline: "none", boxSizing: "border-box" }} dir="ltr" />
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", marginBottom: "8px", outline: "none" }}>
                  {allCategories.map(c => <option key={c}>{c}</option>)}
                </select>
                <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="The full prompt text…" rows={4}
                  style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", marginBottom: "10px", outline: "none", resize: "none", boxSizing: "border-box" }} dir="ltr" />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addPrompt} disabled={!newName.trim() || !newText.trim()}
                    style={{ flex: 1, padding: "9px", borderRadius: "8px", background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", opacity: !newName.trim() || !newText.trim() ? 0.4 : 1 }}>Save prompt</button>
                  <button onClick={() => { setShowNewPrompt(false); setNewName(""); setNewText(""); }}
                    style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                </div>
              </div>
            )}

            {filteredPrompts.map(p => (
              editingPrompt?.id === p.id ? (
                <div key={p.id} style={{ border: "1px solid #c4b5fd", borderRadius: "12px", padding: "14px", marginBottom: "10px", background: "#faf5ff" }}>
                  <input value={editingPrompt.name} onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                    style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", marginBottom: "8px", outline: "none", boxSizing: "border-box" }} dir="ltr" />
                  <select value={editingPrompt.category} onChange={e => setEditingPrompt({ ...editingPrompt, category: e.target.value })}
                    style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", marginBottom: "8px", outline: "none" }}>
                    {allCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <textarea value={editingPrompt.text} onChange={e => setEditingPrompt({ ...editingPrompt, text: e.target.value })} rows={4}
                    style={{ width: "100%", fontSize: "13px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", marginBottom: "10px", outline: "none", resize: "none", boxSizing: "border-box" }} dir="ltr" />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => updatePrompt(editingPrompt)} style={{ flex: 1, padding: "8px", borderRadius: "8px", background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>Save changes</button>
                    <button onClick={() => setEditingPrompt(null)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{p.name}</span>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: "#f3f0ff", color: "#6d28d9", fontWeight: "500", flexShrink: 0, marginLeft: "8px" }}>{p.category}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.55", marginBottom: "12px" }}>{p.text}</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => { setTab("chat"); setTimeout(() => sendMessage(p.text), 100); }}
                      style={{ flex: 1, padding: "7px", borderRadius: "8px", background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>▶ Use now</button>
                    <button onClick={() => { navigator.clipboard.writeText(p.text); showStatus("Copied ✓"); }}
                      style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Copy</button>
                    <button onClick={() => setEditingPrompt(p)}
                      style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                    <button onClick={() => deletePrompt(p.id)}
                      style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid #fee2e2", background: "#fff7f7", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}>✕</button>
                  </div>
                </div>
              )
            ))}
            {filteredPrompts.length === 0 && !showNewPrompt && (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "13px" }}>No prompts in this folder yet</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading…</div>}>
      <AIAssistantContent />
    </Suspense>
  );
}
