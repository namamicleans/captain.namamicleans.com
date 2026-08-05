"use client";

import { useEffect, useRef } from "react";
import { toast } from "@shared/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getVapidPublicKey, subscribeToPush } from "@core/push/actions";
import type { UserResponse } from "@/types/auth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function subscribe(): Promise<boolean> {
  const keyResult = await getVapidPublicKey();
  if (!keyResult.success || !keyResult.data?.public_key) return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        keyResult.data.public_key
      ) as BufferSource,
    });
  }

  const raw = subscription.toJSON();
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) return false;

  const result = await subscribeToPush({
    endpoint: raw.endpoint,
    keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
  });
  return result.success;
}

type PushNotificationPromptProps = {
  user: UserResponse["user"] | null;
};

/**
 * Offers to enable Web Push once per session — captains need this for new
 * job assignments (especially same-day ones). Silently re-syncs an
 * already-granted subscription; never nags if dismissed or denied.
 */
export function PushNotificationPrompt({ user }: Readonly<PushNotificationPromptProps>) {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (hasChecked.current) return;
    hasChecked.current = true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    if (Notification.permission === "granted") {
      subscribe().catch(() => {});
      return;
    }

    if (Notification.permission === "denied") return;

    const timeout = setTimeout(() => {
      toast({
        title: "Enable job alerts?",
        description: "Get notified the moment a new job lands on your schedule.",
        action: (
          <ToastAction
            altText="Enable"
            onClick={async () => {
              const permission = await Notification.requestPermission();
              if (permission === "granted") {
                await subscribe();
              }
            }}
          >
            Enable
          </ToastAction>
        ),
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user]);

  return null;
}
