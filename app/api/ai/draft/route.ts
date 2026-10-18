// FILE LOCATION: src/app/api/ai/draft/route.ts
//
// This route proxies your blog AI draft request to Anthropic with streaming.
// The browser cannot call Anthropic directly (CORS block) — all API calls
// must go through your own server where ANTHROPIC_API_KEY lives in .env.
//
// .env.local:
//   ANTHROPIC_API_KEY=sk-ant-...

import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const { system, user } = await req.json();

  if (!user?.trim()) {
    return new Response(JSON.stringify({ error: "No prompt provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = system ? `${system}\n\n${user}` : user;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { temperature: 0.4 },
      });
      const text = (response.text ?? "").trim();
      const stream = new ReadableStream({
        start(controller) {
          for (const line of text.split("\n")) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (gemErr) {
      console.warn("Gemini draft error, falling back:", gemErr);
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY set in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Call Anthropic with streaming enabled
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      stream: true,
      system: system || "",
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ error: err.error?.message || "Anthropic API error" }),
      { status: anthropicRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            try {
              const parsed = JSON.parse(raw);
              // Extract only the text delta chunks
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta" &&
                parsed.delta?.text
              ) {
                controller.enqueue(
                  encoder.encode(`data: ${parsed.delta.text}\n\n`)
                );
              }
            } catch {
              // Ignore unparseable lines (ping events, message_stop, etc.)
            }
          }
        }
        // Anthropic ends with event: message_stop — not data: [DONE].
        // Sending [DONE] explicitly tells the client the stream is finished.
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}