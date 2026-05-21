import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNewsletter } from "@/lib/email/newsletterMailer";

const SendSchema = z.object({
  issueSlug: z.string().min(1),
  previewEmail: z.string().email().optional(),
  confirmed: z.boolean().optional(),
});

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

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { issueSlug, previewEmail, confirmed } = parsed.data;

  const { data: issue, error: issueError } = await supabaseAdmin
    .from("newsletter_issues")
    .select("title, slug, content, excerpt, created_at")
    .eq("slug", issueSlug)
    .eq("published", true)
    .single();

  if (issueError || !issue) {
    return Response.json(
      { error: "Issue not found or not published" },
      { status: 404 }
    );
  }

  const issueData = issue as {
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    created_at: string;
  };

  if (previewEmail) {
    const result = await sendNewsletter({
      issue: issueData,
      subscribers: [previewEmail],
      previewEmail,
    });
    return Response.json(result);
  }

  if (confirmed === true) {
    const { data: rows, error: subError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email")
      .is("unsubscribed_at", null);

    if (subError) {
      return Response.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    const subscribers = (rows ?? []).map(
      (r: { email: string }) => r.email
    );
    const result = await sendNewsletter({ issue: issueData, subscribers });
    return Response.json(result);
  }

  return Response.json(
    { error: "Specify previewEmail or confirmed: true" },
    { status: 400 }
  );
}
