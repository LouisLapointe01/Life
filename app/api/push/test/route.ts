import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import webpush from "web-push";

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Init VAPID
  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!email || !publicKey || !privateKey) {
    return NextResponse.json({
      error: "VAPID non configuré",
      email: !!email,
      publicKey: !!publicKey,
      privateKey: !!privateKey,
    });
  }

  try {
    webpush.setVapidDetails(
      email.startsWith("mailto:") ? email : `mailto:${email}`,
      publicKey,
      privateKey
    );
  } catch (e) {
    return NextResponse.json({ error: "VAPID invalide", detail: String(e) });
  }

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "Aucune souscription trouvée pour cet utilisateur", user_id: user.id });
  }

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Test Push ✓", body: "Les notifications fonctionnent !" })
        );
        return { endpoint: sub.endpoint.slice(0, 60), status: "success" };
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        return {
          endpoint: sub.endpoint.slice(0, 60),
          status: "error",
          statusCode: e.statusCode,
          body: e.body,
          message: e.message,
        };
      }
    })
  );

  return NextResponse.json({ user_id: user.id, subs_count: subs.length, results });
}
