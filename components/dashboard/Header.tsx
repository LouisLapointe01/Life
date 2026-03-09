"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [blockingId, setBlockingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) clientCache.setUser(data.user.id);
    });
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
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

  return (
    <div className="fixed top-4 right-4 z-30 flex items-center gap-1 rounded-2xl bg-white/15 dark:bg-white/[0.04] backdrop-blur-xl border border-white/10 dark:border-white/[0.06] px-1.5 py-1 shadow-sm">
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

        {/* Notification Panel */}
        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[380px] rounded-2xl border border-white/20 bg-background/80 backdrop-blur-2xl shadow-xl shadow-black/10 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.06]">
              <h3 className="text-[14px] font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-primary hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[13px] text-muted-foreground">Aucune notification</p>
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
                      <div className="flex items-center gap-2 px-4 py-2 bg-foreground/[0.02] border-b border-foreground/[0.04]">
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
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5",
                                isContactAdded
                                  ? "bg-blue-500/15 text-blue-500"
                                  : !n.is_read ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-muted-foreground"
                              )}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-[12px] leading-snug", !n.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
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
        )}
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
  );
}
