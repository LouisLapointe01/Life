import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;
  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!email || !publicKey || !privateKey) return;
  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  conversationId?: string;
  senderId?: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  initVapid();
  if (!vapidInitialized) return;
  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
      } catch (err: unknown) {
        // Subscription expirée → supprimer
        if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
