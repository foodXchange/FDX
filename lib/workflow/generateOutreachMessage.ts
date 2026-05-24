import type { PipV1 } from "@/lib/pip/buildPipV1";

export function generateOutreachMessage(
  pip: PipV1,
  match: {
    company_name: string;
    product_name: string;
    country: string | null;
    match_score: number;
  }
): string {
  const lines: string[] = [];

  lines.push(`Hi ${match.company_name},`);
  lines.push("");
  lines.push("We have a buyer in Israel looking for:");
  lines.push(`- ${match.product_name}`);

  const formats = pip.specifications.formats;
  if (formats.length > 0) {
    lines.push(`- Format: ${formats.join(", ")}`);
  }

  if (pip.compliance.kosher_required) {
    const kosherLabel =
      pip.compliance.kosher_types.length > 0
        ? pip.compliance.kosher_types.join(", ")
        : "Yes";
    lines.push(`- Kosher required: ${kosherLabel}`);
  }

  if (pip.commercial.private_label === true) {
    lines.push("- Private label required");
  }

  if (pip.commercial.volume) {
    lines.push(`- Volume: ${pip.commercial.volume}`);
  }

  if (pip.commercial.urgency === "high") {
    lines.push("- Urgency: immediate");
  }

  lines.push("");
  lines.push("Would this be relevant for you?");
  lines.push("");
  lines.push("Best regards,");
  lines.push("Udi Levi");
  lines.push("FoodXchange");

  return lines.join("\n");
}
