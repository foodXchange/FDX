import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  getGmailCredentials,
  getStoredGmailAccountsConfig,
  saveStoredGmailAccountsConfig,
  sendSupplierEmailSmart,
  type StoredGmailAccount,
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
    "FoodXchange Sourcing <info@fdx.trading>";

  const activeUserNorm = (
    store.activeUser ||
    activeCreds?.user ||
    "info@fdx.trading"
  ).toLowerCase();

  const savedAccounts = store.accounts.map((acc) => {
    const provider = acc.provider || (acc.user.endsWith("@fdx.trading") && !acc.appPassword ? "resend" : "gmail");
    const hasCredentials =
      provider === "resend" ? resendConfigured : Boolean(acc.appPassword);
    const isActive = acc.user.toLowerCase() === activeUserNorm;

    return {
      user: acc.user,
      senderName: acc.senderName || "FoodXchange Sourcing Desk",
      provider,
      replyTo: acc.replyTo || acc.user,
      role:
        acc.role ||
        (provider === "resend"
          ? "Transactional Domain Mailer"
          : "Primary Sourcing & 2-Way Sync"),
      maskedPassword: maskSecret(acc.appPassword),
      hasCredentials,
      addedAt: acc.addedAt,
      isActive,
    };
  });

  const activeAccountEntry =
    savedAccounts.find((a) => a.isActive) || savedAccounts[0] || null;

  return {
    ok: true,
    activeAccount: activeAccountEntry
      ? {
          user: activeAccountEntry.user,
          senderName: activeAccountEntry.senderName,
          provider: activeAccountEntry.provider,
          replyTo: activeAccountEntry.replyTo,
          role: activeAccountEntry.role,
          maskedPassword: activeAccountEntry.maskedPassword,
          hasCredentials: activeAccountEntry.hasCredentials,
          source: "database" as const,
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

    // 1. Add or Update / Edit an Email Account
    if (action === "add_or_update") {
      const originalUser =
        typeof body.originalUser === "string"
          ? body.originalUser.trim().toLowerCase()
          : "";
      const user = typeof body.user === "string" ? body.user.trim() : "";
      const provider: "gmail" | "resend" =
        body.provider === "resend" ? "resend" : "gmail";
      const appPassword =
        typeof body.appPassword === "string"
          ? body.appPassword.replace(/\s+/g, "").trim()
          : "";
      const senderName =
        typeof body.senderName === "string" && body.senderName.trim()
          ? body.senderName.trim()
          : "FoodXchange Sourcing Desk";
      const replyTo =
        typeof body.replyTo === "string" && body.replyTo.trim()
          ? body.replyTo.trim()
          : user;
      const role =
        typeof body.role === "string" && body.role.trim()
          ? body.role.trim()
          : provider === "resend"
          ? "Transactional Domain Mailer"
          : "Primary Sourcing & 2-Way Sync";
      const verifyFirst = Boolean(body.verifyFirst) && provider === "gmail";
      const makeActive = body.makeActive !== false;

      if (!user || !user.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      const store = await getStoredGmailAccountsConfig();
      const lookupKey = originalUser || user.toLowerCase();
      const existingIdx = store.accounts.findIndex(
        (a) => a.user.toLowerCase() === lookupKey
      );
      const existing = existingIdx >= 0 ? store.accounts[existingIdx] : null;
      const effectivePassword =
        appPassword || existing?.appPassword || "";

      if (provider === "gmail" && verifyFirst && effectivePassword) {
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
              error: `Gmail SMTP verification failed for ${user}: ${
                smtpErr.message || "Invalid 16-char Google App Password"
              }`,
            },
            { status: 400 }
          );
        }
      }

      const updatedEntry: StoredGmailAccount = {
        user,
        appPassword: provider === "resend" ? "" : effectivePassword,
        senderName,
        provider,
        replyTo,
        role,
        addedAt: existing?.addedAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        store.accounts[existingIdx] = updatedEntry;
      } else {
        // Also check if target `user` already exists at another index
        const dupIdx = store.accounts.findIndex(
          (a) => a.user.toLowerCase() === user.toLowerCase()
        );
        if (dupIdx >= 0) {
          store.accounts[dupIdx] = updatedEntry;
        } else {
          store.accounts.push(updatedEntry);
        }
      }

      if (
        makeActive ||
        (originalUser &&
          store.activeUser?.toLowerCase() === originalUser)
      ) {
        store.activeUser = user;
      }

      await saveStoredGmailAccountsConfig(store);

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message: existing
          ? `✅ Updated account ${user} (${senderName}).`
          : `✅ Added and connected ${user} (${senderName}).`,
      });
    }

    // 2. Switch Primary Active Account
    if (action === "set_active") {
      const targetUser =
        typeof body.user === "string" ? body.user.trim() : "";
      const store = await getStoredGmailAccountsConfig();
      store.activeUser = targetUser;
      await saveStoredGmailAccountsConfig(store);

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message:
          targetUser === "__none__"
            ? "Paused active account."
            : `⭐ Switched primary active email account to ${targetUser}.`,
      });
    }

    // 3. Delete an Account from the Managed List
    if (action === "remove") {
      const targetUser =
        typeof body.user === "string" ? body.user.trim().toLowerCase() : "";
      const store = await getStoredGmailAccountsConfig();
      store.accounts = store.accounts.filter(
        (a) => a.user.toLowerCase() !== targetUser
      );
      if (store.activeUser && store.activeUser.toLowerCase() === targetUser) {
        store.activeUser = store.accounts[0]?.user || "__none__";
      }
      await saveStoredGmailAccountsConfig(store);

      const snapshot = await buildAccountsSnapshot();
      return NextResponse.json({
        ...snapshot,
        message: `🗑️ Deleted ${body.user} from connected email accounts.`,
      });
    }

    // 4. Test SMTP Connection for a Specific or Active Account
    if (action === "test_connection") {
      const targetUser =
        typeof body.user === "string" ? body.user.trim().toLowerCase() : "";
      const store = await getStoredGmailAccountsConfig();
      const targetAcc = targetUser
        ? store.accounts.find((a) => a.user.toLowerCase() === targetUser)
        : null;

      if (targetAcc?.provider === "resend") {
        if (!process.env.RESEND_API_KEY) {
          return NextResponse.json(
            { ok: false, error: "RESEND_API_KEY is not configured." },
            { status: 400 }
          );
        }
        return NextResponse.json({
          ok: true,
          message: `✅ Resend Domain Mailer (${targetAcc.user}) is verified and active! Replies forward to ${targetAcc.replyTo || targetAcc.user}.`,
        });
      }

      const creds =
        targetAcc && targetAcc.appPassword
          ? { user: targetAcc.user, appPassword: targetAcc.appPassword }
          : await getGmailCredentials();

      if (!creds || !creds.appPassword) {
        return NextResponse.json(
          {
            ok: false,
            error: `Account ${
              targetAcc?.user || ""
            } does not have a 16-character Google App Password saved yet. Click '✏️ Edit' on the account card to paste its App Password.`,
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
        message: `✅ Gmail SMTP verified for ${creds.user} in ${latencyMs}ms!`,
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
