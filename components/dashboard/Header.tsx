"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Bell, Check, CheckCheck, CalendarDays, ArrowRightLeft, XCircle, UserCheck, Info, UserPlus, ShieldX, Loader2, MessageCircle, Users, Calendar, Settings } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { clientCache } from "@/lib/client-cache";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  appointment_id: string | null;
  from_name: string | null;
  from_user_id: string | null;
};

const notifIcons: Record<string, typeof Bell> = {
  invitation: CalendarDays,
  response: UserCheck,
  confirmed: Check,
  cancellation: XCircle,
  declined: XCircle,
  reschedule_request: ArrowRightLeft,
  reschedule_approved: CheckCheck,
  reschedule_rejected: XCircle,
  info: Info,
  contact_added: UserPlus,
  message: MessageCircle,
};

// Sections de la barre latérale dans l'ordre d'affichage
type NotifSection = {
  id: string;
  label: string;
  icon: typeof Bell;
  types: Set<string>;
  color: string;
  fallback?: boolean;
};

const NOTIF_SECTIONS: NotifSection[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: Calendar,
    types: new Set(["invitation", "response", "confirmed", "cancellation", "declined", "reschedule_request", "reschedule_approved", "reschedule_rejected"]),
    color: "text-orange-500",
  },
  {
    id: "annuaire",
    label: "Annuaire",
    icon: Users,
    types: new Set(["contact_added"]),
    color: "text-purple-500",
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircle,
    types: new Set(["message"]),
    color: "text-teal-500",
  },
  {
    id: "autres",
    label: "Autres",
    icon: Bell,
    types: new Set(["info"]),
    color: "text-muted-foreground",
    fallback: true, // reçoit tout ce qui ne correspond pas aux autres
  },
];

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) clientCache.setUser(data.user.id);
    });
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch notifications on mount + poll every 15s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Realtime: écouter les nouvelles notifications
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = notifRef.current?.contains(target);
      const clickedPanel = notifPanelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }),
    });
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.type === "message") {
      router.push("/dashboard/messages");
      setShowNotifs(false);
    } else if (n.appointment_id) {
      router.push("/dashboard/agenda");
      setShowNotifs(false);
    }
  };

  const handleBlock = async (n: Notification) => {
    if (!n.from_user_id) return;
    setBlockingId(n.id);
    try {
      const res = await fetch("/api/contacts/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_user_id: n.from_user_id, notification_id: n.id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((x) => x.id !== n.id));
        if (!n.is_read) setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch { /* ignore */ }
    setBlockingId(null);
  };

  const handleSignOut = async () => {
    clientCache.clear();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "";

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `Il y a ${d}j`;
  };

  const notificationPanel = showNotifs && isMounted
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowNotifs(false)}
          />

          <div
            ref={notifPanelRef}
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border border-border bg-background/95 backdrop-blur-2xl shadow-xl shadow-black/10 overflow-hidden sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[4.75rem] sm:w-[380px] sm:rounded-2xl"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-foreground/20" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.06]">
              <h3 className="text-[14px] font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-primary hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-[min(70dvh,36rem)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+4rem)] sm:max-h-[70vh] sm:pb-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[12px] sm:text-[13px] text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                (() => {
                  const assignedIds = new Set<string>();
                  const groups = NOTIF_SECTIONS.map((section) => {
                    const items = section.fallback
                      ? notifications.filter((n) => !assignedIds.has(n.id) && !NOTIF_SECTIONS.filter((s) => !s.fallback).some((s) => s.types.has(n.type)))
                      : notifications.filter((n) => section.types.has(n.type));
                    items.forEach((n) => assignedIds.add(n.id));
                    return { section, items };
                  }).filter((g) => g.items.length > 0);

                  return groups.map(({ section, items }) => (
                    <div key={section.id}>
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/50 border-b border-foreground/[0.04]">
                        <section.icon className={cn("h-3 w-3 shrink-0", section.color)} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {section.label}
                        </span>
                      </div>
                      {items.map((n) => {
                        const Icon = notifIcons[n.type] || Bell;
                        const isContactAdded = n.type === "contact_added";
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "border-b border-foreground/[0.04] last:border-0",
                              !n.is_read && "bg-primary/[0.04]"
                            )}
                          >
                            <button
                              onClick={() => handleNotifClick(n)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
                            >
                              <div className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5",
                                isContactAdded
                                  ? "bg-blue-500/15 text-blue-500"
                                  : !n.is_read ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-muted-foreground"
                              )}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-[13px] leading-snug", !n.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                )}
                                <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                              </div>
                              {!n.is_read && (
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </button>
                            {isContactAdded && n.from_user_id && (
                              <div className="px-4 pb-3">
                                <button
                                  onClick={() => handleBlock(n)}
                                  disabled={blockingId === n.id}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  {blockingId === n.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <ShieldX className="h-3 w-3" />}
                                  Bloquer
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
    <div className={cn("fixed top-4 right-4 flex items-center gap-1 rounded-2xl bg-white/15 dark:bg-white/[0.04] backdrop-blur-xl border border-white/10 dark:border-white/[0.06] px-1.5 py-1 shadow-sm", showNotifs ? "z-[90]" : "z-30")}>
      {/* Notifications Bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/70 transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border/50" />

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center rounded-xl p-0.5 transition-all duration-200 hover:bg-foreground/[0.06]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="h-7 w-7 rounded-full ring-1 ring-white/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-semibold text-white">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
          <div className="px-3 py-2 mb-1">
            <p className="text-[13px] font-semibold truncate">{fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem className="rounded-xl px-3 py-2.5 text-[13px] cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 text-[13px] cursor-pointer">
            <Link href="/dashboard/parametres">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem onClick={handleSignOut} className="rounded-xl px-3 py-2.5 text-[13px] text-red-500 cursor-pointer focus:text-red-500">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {notificationPanel}
    </>
  );
}
