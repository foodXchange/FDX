"use client";

import { useEffect, useState } from "react";

export default function NewsletterBuilder() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [intro, setIntro] = useState("");
  const [cta, setCta] = useState("");
  const [output, setOutput] = useState("");

  async function loadPosts() {
    const res = await fetch("/api/blog/editor/posts");
    const json = await res.json();
    setPosts(json.posts || []);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug]
    );
  }

  function generate() {
    const selectedPosts = posts.filter((p) =>
      selected.includes(p.slug)
    );

    const articlesHtml = selectedPosts
      .map(
        (p) => `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px; margin-bottom:6px;">${p.title}</h2>
          <p style="margin-bottom:6px;">
            https://fdx.trading/en/blog/${p.slug}Read full article</a>
          </p>
        </div>
      `
      )
      .join("");

    const fullHtml = `
<div style="font-family:Arial, sans-serif; max-width:600px; margin:auto; padding:20px; background:#ffffff;">

  <h1 style="font-size:22px; margin-bottom:20px;">
    FoodXchange Weekly Update
  </h1>

  <div style="font-size:14px; color:#333; margin-bottom:20px;">
    ${intro || "Here are the latest sourcing insights and opportunities."}
  </div>

  ${articlesHtml}

  <hr style="margin:30px 0;" />

  <div style="font-size:14px; margin-top:20px;">
    ${cta || "If you're exploring sourcing opportunities for the Israeli market, feel free to reach out."}
  </div>

  <div style="margin-top:12px;">
    <a href="mailto:info@fdx.trading" style="background:#f97316; color:white; padding:10px 16px; text-decoration:none; border-radius:6px;">
      Contact FoodXchange
    </a>
  </div>

</div>
`;

    setOutput(fullHtml);
  }

  return (
    <main className="max-w-3xl mx-auto p-6">

      <h1 className="text-xl font-bold mb-6">
        Newsletter Generator
      </h1>

      {/* INTRO */}
      <div className="mb-4">
        <label className="text-sm font-semibold">Intro</label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          className="w-full border p-2 mt-1"
          placeholder="Short intro for this newsletter..."
        />
      </div>

      {/* POSTS */}
      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.slug} className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={selected.includes(p.slug)}
              onChange={() => toggle(p.slug)}
            />
            <div>{p.title}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-4">
        <label className="text-sm font-semibold">CTA</label>
        <textarea
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          className="w-full border p-2 mt-1"
          placeholder="Call to action..."
        />
      </div>

      <button
        onClick={generate}
        className="mt-6 bg-orange-500 text-white px-4 py-2 rounded"
      >
        Generate Newsletter
      </button>

      {/* OUTPUT */}
      {output && (
        <>
          <h2 className="mt-6 font-semibold">Generated HTML</h2>

          <textarea
            value={output}
            readOnly
            className="w-full h-64 border p-2 mt-2 font-mono text-xs"
          />

          <h2 className="mt-4 font-semibold">Preview</h2>

          <div
            className="border p-4 mt-2 bg-white"
            dangerouslySetInnerHTML={{ __html: output }}
          />
        </>
      )}

    </main>
  );
}
