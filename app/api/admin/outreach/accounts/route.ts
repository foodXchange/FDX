import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  getGmailCredentials,
  getStoredGmailAccountsConfig,
  saveStoredGmailAccountsConfig,
  saveGmailCredentials,
  sendSupplierEmailSmart,
} from "@/lib/email/gmailEngine";

function maskSecret(secret: string | undefined | null): string {
  if (!secret) return "";
  const clean = secret.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return `•••• •••• •••• ${clean.slice(-4)}`;
}

async function buildAccountsSnapshot() {
  const store = await getStoredGmailAccountsConfig();
  const activeCreds = await getGmailCredentials();

  const envUser = process.env.GMAIL_USER?.trim() || null;
  const envPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim() || null;
  const envSenderName =
    process.env.GMAIL_SENDER_NAME?.trim() || "FoodXchange Sourcing";

  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFrom =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "FoodXchange Sourcing <onboarding@resend.dev>";

  const savedAccounts = store.accounts.map((acc) => ({
    user: acc.user,
    senderName: acc.senderName || "FoodXchange Sourcing",
    maskedPassword: maskSecret(acc.appPassword),
    addedAt: acc.addedAt,
    isActive:
      activeCreds?.source === "database" &&
      activeCreds.user.toLowerCase() === acc.user.toLowerCase(),
  }));

  return {
    ok: true,
    activeAccount: activeCreds
      ? {
          user: activeCreds.user,
          senderName: activeCreds.senderName || "FoodXchange Sourcing",
          maskedPassword: maskSecret(activeCreds.appPassword),
          source: activeCreds.source || "env",
        }
      : null,
    envAccount: {
      configured: Boolean(envUser && envPass),
      user: envUser,
      senderName: envSenderName,
      maskedPassword: maskSecret(envPass),
      isActive: activeCreds?.source === "env",
    },
    savedAccounts,
    resend: {
      configured: resendConfigured,
      fromEmail: resendFrom,
    },
  };
}

export async function GET() {
  try {
    const snapshot = await buildAccountsSnapshot();
    return NextResponse.json(snapshot);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load email accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    // 1. Add or Update a Gmail / Google Workspace Account
    if (action === "add_or_update") {
      const user = typeof body.user === "string" ? body.user.trim() : "";
      const appPassword =
        typeof body.appPassword === "string"
          ? body.appPassword.replace(/\s+/g, "").trim()
          : "";
      const senderName =
        typeof body.senderName === "string" && body.senderName.trim()
          ? body.senderName.trim()
          : "FoodXchange Sourcing Desk";
      const verifyFirst = body.verifyFirst !== false;

      if (!user || !user.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      const store = await getStoredGmailAccountsConfig();
      const existing = store.accounts.find(
        (a) => a.user.toLowerCase() === user.toLowerCase()
      );
      const effectivePassword = appPassword || existing?.appPassword || "";

      if (!effectivePassword) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Please enter a 16-character Google App Password for this account.",
          },
          { status: 400 }
        );
      }

      if (verifyFirst) {
        try {
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user, pass: effectivePassword },
          });
          await transporter.verify();
        } catch (smtpErr: any) {
          return NextResponse.json(
            {
              ok: false,
              error: `Gmail SMTP verification failed: ${
                smtpErr.message || "Invalid credentials or App Password"
              }`,
            },
            { status: 400 }
          );
        }
      }

      await saveGmailCredentials({
        user,
        appPassword: effectivePassword,
        senderName,
      });

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message: `Connected and activated ${user} (${senderName}).`,
      });
    }

    // 2. Switch Active Account (to a saved account, "__env__", or "__none__")
    if (action === "set_active") {
      const targetUser =
        typeof body.user === "string" ? body.user.trim() : "__env__";
      const store = await getStoredGmailAccountsConfig();
      store.activeUser = targetUser;
      await saveStoredGmailAccountsConfig(store);

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message:
          targetUser === "__none__"
            ? "Disconnected Gmail account (using Resend fallback only)."
            : targetUser === "__env__"
            ? "Switched active account to System Environment (GMAIL_USER)."
            : `Switched active account to ${targetUser}.`,
      });
    }

    // 3. Remove a Saved Account from Database
    if (action === "remove") {
      const targetUser =
        typeof body.user === "string" ? body.user.trim().toLowerCase() : "";
      const store = await getStoredGmailAccountsConfig();
      store.accounts = store.accounts.filter(
        (a) => a.user.toLowerCase() !== targetUser
      );
      if (store.activeUser && store.activeUser.toLowerCase() === targetUser) {
        store.activeUser =
          store.accounts[0]?.user ||
          (process.env.GMAIL_USER ? "__env__" : "__none__");
      }
      await saveStoredGmailAccountsConfig(store);

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message: `Removed ${body.user} from saved email accounts.`,
      });
    }

    // 4. Test Active SMTP Connection
    if (action === "test_connection") {
      const creds = await getGmailCredentials();
      if (!creds) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No active Gmail account configured. Add an account below or configure GMAIL_USER in .env.",
          },
          { status: 400 }
        );
      }

      const startMs = Date.now();
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: creds.user, pass: creds.appPassword },
      });
      await transporter.verify();
      const latencyMs = Date.now() - startMs;

      return NextResponse.json({
        ok: true,
        message: `✅ Gmail SMTP verified for ${creds.user} in ${latencyMs}ms! Outbound & plus-addressed Reply-To routing are ready.`,
      });
    }

    // 5. Send Live Test Email
    if (action === "send_test_email") {
      const to = typeof body.to === "string" ? body.to.trim() : "";
      if (!to || !to.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "Please enter a valid recipient email for the test." },
          { status: 400 }
        );
      }

      const res = await sendSupplierEmailSmart({
        matchId: "00000000-0000-0000-0000-000000000000",
        to,
        subject: "[FDX-TEST] FoodXchange Email & Outreach Hub Connection Test",
        bodyText: `Hello from FoodXchange Mission Control!\n\nThis is a live connection test from your Email & Outreach Hub (/admin/outreach).\n\n• Plus-Addressed Reply Routing: Active\n• AI Quote & Reply Parser: Active\n• Timestamp: ${new Date().toISOString()}\n\nBest regards,\nFoodXchange Sourcing Desk`,
      });

      if (!res.success) {
        return NextResponse.json(
          { ok: false, error: res.error || "Test email failed to send" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `✅ Test email dispatched to ${to} via ${res.via.toUpperCase()}!`,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Email account operation failed" },
      { status: 500 }
    );
  }
}
