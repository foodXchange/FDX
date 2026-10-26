import { NextRequest, NextResponse } from "next/server";
import {
  extractCoaWithAi,
  parseCoaRawText,
  convertParsedCoaToPreset,
  CERTIFIED_LAB_TEMPLATES,
} from "@/lib/compliance/coaPdfParser";
import { validateCoaSample } from "@/lib/compliance/mohCoaValidator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let rawText = "";
    let templateId = "";
    let filename = "";
    let fileBase64 = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawText = body.text || "";
      templateId = body.templateId || "";
      filename = body.filename || "";
      fileBase64 = body.fileBase64 || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      templateId = (formData.get("templateId") as string) || "";
      rawText = (formData.get("text") as string) || "";

      if (file) {
        filename = file.name;
        // Read file text or buffer
        const buffer = await file.arrayBuffer();
        // Convert to utf-8 string if text/plain or extract string tokens
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const decoded = decoder.decode(buffer);
        // If binary PDF, keep recognizable ASCII/UTF-8 strings
        rawText = decoded.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
      }
    }

    // 1. If templateId provided and exists in certified templates
    if (templateId && CERTIFIED_LAB_TEMPLATES[templateId]) {
      const template = CERTIFIED_LAB_TEMPLATES[templateId];
      const preset = convertParsedCoaToPreset(template.parsed);
      const validationReport = validateCoaSample(preset);

      return NextResponse.json({
        ok: true,
        source: "certified_template",
        parsedCoa: template.parsed,
        coaPreset: preset,
        validationReport,
      });
    }

    // 2. Perform OCR & Field Extraction
    const parsedCoa = await extractCoaWithAi({
      rawText,
      templateId,
      filename,
      fileBase64,
    });

    // 3. Convert to MOH preset & perform live validation audit
    const coaPreset = convertParsedCoaToPreset(parsedCoa);
    const validationReport = validateCoaSample(coaPreset);

    return NextResponse.json({
      ok: true,
      source: parsedCoa.ocrEngine,
      parsedCoa,
      coaPreset,
      validationReport,
    });
  } catch (error: any) {
    console.error("COA parsing error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to parse laboratory certificate of analysis",
      },
      { status: 500 }
    );
  }
}
