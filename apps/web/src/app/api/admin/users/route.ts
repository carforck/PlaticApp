import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista de usuarios registrados con métricas. SOLO para el admin. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }

  const db = createAdminClient();
  const [{ data: list }, tx, accts, balances, debts, links, profs] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("transactions").select("user_id"),
    db.from("accounts").select("user_id"),
    db.from("account_balances").select("user_id, type, balance_minor"),
    db.from("debts").select("user_id, status"),
    db.from("telegram_links").select("user_id, telegram_username, linked_at"),
    db.from("profiles").select("id, last_seen"),
  ]);

  // Espacio en Storage por usuario (carpeta receipts/{user_id}).
  const storageByUser = new Map<string, number>();
  await Promise.all(
    (list?.users ?? []).map(async (u) => {
      const { data: files } = await db.storage.from("receipts").list(u.id, { limit: 1000 });
      const bytes = (files ?? []).reduce((s, f) => s + (((f.metadata as { size?: number })?.size) ?? 0), 0);
      storageByUser.set(u.id, bytes);
    }),
  );
  const lastSeenByUser = new Map((profs.data ?? []).map((p) => [p.id, p.last_seen as string | null]));
  const ONLINE_MS = 3 * 60 * 1000;

  const tally = (rows: { user_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const txByUser = tally(tx.data);
  const acctByUser = tally(accts.data);
  // Patrimonio: el crédito (deuda) no suma; resta.
  const netByUser = new Map<string, number>();
  for (const b of balances.data ?? []) {
    const delta = b.type === "credit" ? -Math.max(0, -b.balance_minor) : b.balance_minor;
    netByUser.set(b.user_id, (netByUser.get(b.user_id) ?? 0) + delta);
  }
  const debtOpenByUser = new Map<string, number>();
  for (const d of debts.data ?? []) if (d.status === "open") debtOpenByUser.set(d.user_id, (debtOpenByUser.get(d.user_id) ?? 0) + 1);
  const linkByUser = new Map((links.data ?? []).map((l) => [l.user_id, l]));

  const users = (list?.users ?? [])
    .map((u) => {
      const meta = u.user_metadata ?? {};
      const link = linkByUser.get(u.id);
      // Método de login legible.
      const rawProvider = (u.app_metadata?.provider as string) ?? "email";
      const loginMethod =
        meta.provider === "telegram" || (u.email ?? "").endsWith("@telegram.platicapp.app")
          ? "Telegram"
          : rawProvider === "google"
            ? "Google"
            : "Correo";
      return {
        id: u.id,
        email: u.email ?? "",
        name: (meta.full_name as string) ?? (meta.name as string) ?? "",
        avatar: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        provider: rawProvider,
        loginMethod,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
        telegram: link ? (link.telegram_username ?? "vinculado") : null,
        transactions: txByUser.get(u.id) ?? 0,
        accounts: acctByUser.get(u.id) ?? 0,
        netWorth: netByUser.get(u.id) ?? 0,
        openDebts: debtOpenByUser.get(u.id) ?? 0,
        storageBytes: storageByUser.get(u.id) ?? 0,
        lastSeen: lastSeenByUser.get(u.id) ?? null,
        online: (() => {
          const ls = lastSeenByUser.get(u.id);
          return ls ? Date.now() - new Date(ls).getTime() < ONLINE_MS : false;
        })(),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    total: users.length,
    linked: users.filter((u) => u.telegram).length,
    online: users.filter((u) => u.online).length,
    storageTotal: users.reduce((s, u) => s + u.storageBytes, 0),
    users,
  });
}
