"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientCache } from "@/lib/client-cache";
import { useProfile } from "@/hooks/use-profile";
import {
  format, isToday, isTomorrow, addDays, addWeeks, addMonths, subMonths, subWeeks,
  isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Clock, User, Mail, Phone, MessageSquare, CheckCircle2,
  XCircle, Loader2, Star, ChevronLeft, ChevronRight, Copy, Search, CalendarDays,
  TrendingUp, Plus, ArrowLeft, Users, X, AlertTriangle, ArrowRightLeft, UserCheck, UserX,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type Participant = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  type_id: string | null;
  status: "pending" | "accepted" | "declined";
  is_organizer: boolean;
  is_close_contact: boolean;
  responded_at: string | null;
  participant_type: { id: string; name: string; color: string; duration_min: number | null } | null;
};

type Appointment = {
  id: string;
  type_id: string;
  requester_id: string;
  user_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  start_at: string;
  end_at: string;
  message: string | null;
  status: string;
  is_close_contact: boolean;
  notify_on_event: boolean;
  created_at: string;
  appointment_types: { id: string; name: string; color: string; duration_min: number | null };
  appointment_participants: Participant[];
  creator?: { id: string; full_name: string; avatar_url: string | null };
  google_event_id?: string | null;
  google_sync_status?: string | null;
};

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number | null;
  color: string;
  google_token_id?: string | null;
  google_calendar_id?: string | null;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_close: boolean;
};

type UserProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email?: string | null;
  phone?: string | null;
  has_account?: boolean;
  is_close?: boolean;
  source?: "profile" | "contact";
  user_id?: string;
};

type SlotInfo = {
  time: string;
  available: boolean;
  busy_users: string[];
};

type ViewMode = "month" | "week";
type RdvStep = "recipient" | "type" | "date" | "slot" | "form" | "confirmation";

// Hauteur uniforme pour la vue semaine
const W_HOUR_H = 40; // px par heure
const W_TOTAL_H = 24 * W_HOUR_H; // 960px
const W_VISIBLE_H = 15 * W_HOUR_H; // 600px (montre 6h–21h)
const W_SCROLL_TO = 6 * W_HOUR_H; // scroll initial à 6h

// Algorithme anti-chevauchement d'événements
function layoutWeekEvents(events: Appointment[]): { apt: Appointment; col: number; cols: number }[] {
  const sorted = [...events].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const result: { apt: Appointment; col: number; cols: number }[] = [];
  const colEnds: Date[] = [];
  for (const apt of sorted) {
    const start = new Date(apt.start_at);
    const end = new Date(apt.end_at);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) { col = colEnds.length; colEnds.push(end); } else { colEnds[col] = end; }
    result.push({ apt, col, cols: 0 });
  }
  for (const item of result) {
    const s = new Date(item.apt.start_at).getTime();
    const e = new Date(item.apt.end_at).getTime();
    item.cols = Math.max(...result.filter(o => new Date(o.apt.start_at).getTime() < e && new Date(o.apt.end_at).getTime() > s).map(o => o.col)) + 1;
  }
  return result;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "En attente", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  confirmed: { label: "Confirmé", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", dot: "bg-green-500" },
  cancelled: { label: "Annulé", color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10", dot: "bg-red-500" },
  rescheduling: { label: "Report demandé", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-500" },
};

const stepLabels = ["Destinataires", "Type", "Date", "Créneau", "Infos"];
const emptyForm = { guest_name: "", guest_email: "", guest_phone: "", message: "", notify_on_event: true };

/**
 * Retourne le type à afficher pour le viewer actuel.
 * Si je suis participant et j'ai un type_id → mon type
 * Sinon → type du créateur (appointment_types)
 */
function getMyType(apt: Appointment, currentUserId?: string): { name: string; color: string; duration_min: number | null } {
  if (currentUserId && apt.appointment_participants) {
    const myPart = apt.appointment_participants.find((p) => p.user_id === currentUserId);
    if (myPart?.participant_type) return myPart.participant_type;
  }
  return apt.appointment_types;
}

/** Mon statut de participant */
function getMyParticipant(apt: Appointment, currentUserId?: string): Participant | undefined {
  if (!currentUserId || !apt.appointment_participants) return undefined;
  return apt.appointment_participants.find((p) => p.user_id === currentUserId);
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
export default function AgendaPage() {
  const { profile } = useProfile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024 ? "week" : "month"
  );

  // RDV creation state
  const [showRdvForm, setShowRdvForm] = useState(false);
  const [rdvStep, setRdvStep] = useState<RdvStep>("recipient");
  const [rdvTypes, setRdvTypes] = useState<AppointmentType[]>([]);
  const [googleAccountsMap, setGoogleAccountsMap] = useState<Record<string, string>>({}); // tokenId → email
  const [rdvSelectedType, setRdvSelectedType] = useState<AppointmentType | null>(null);
  const [rdvSelectedDate, setRdvSelectedDate] = useState<Date | undefined>();
  const [rdvSlots, setRdvSlots] = useState<SlotInfo[]>([]);
  const [rdvSelectedSlot, setRdvSelectedSlot] = useState<string | null>(null);
  const [rdvLoadingSlots, setRdvLoadingSlots] = useState(false);
  const [rdvSubmitting, setRdvSubmitting] = useState(false);
  const [rdvError, setRdvError] = useState<string | null>(null);
  const [rdvFormData, setRdvFormData] = useState(emptyForm);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [rdvSelectedDuration, setRdvSelectedDuration] = useState(30);
  const [showCreateType, setShowCreateType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#007AFF");
  const [creatingType, setCreatingType] = useState(false);

  // Participants for RDV creation (multi)
  const [rdvParticipants, setRdvParticipants] = useState<UserProfile[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<UserProfile[]>([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);

  // External participant form (step 1)
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalDraft, setExternalDraft] = useState({ name: "", email: "", phone: "" });

  // Save to annuaire (confirmation step)
  const [savedContacts, setSavedContacts] = useState<Set<string>>(new Set());
  const [confirmDuplicate, setConfirmDuplicate] = useState<{ participant: UserProfile; existing: Contact } | null>(null);

  const isAdmin = profile?.role === "admin";
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const [quickCreate, setQuickCreate] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [aptPopup, setAptPopup] = useState<Appointment | null>(null);
  const [dragOver, setDragOver] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const [resizing, setResizing] = useState<{ aptId: string; startY: number; origDurMin: number; curDurMin: number } | null>(null);
  const resizingRef = useRef<typeof resizing>(null);
  resizingRef.current = resizing;
  const appointmentsRef = useRef<Appointment[]>([]);
  appointmentsRef.current = appointments;

  useEffect(() => {
    if (viewMode === "week" && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = W_SCROLL_TO;
    }
  }, [viewMode]);

  const fetchAppointments = useCallback(async () => {
    const cached = clientCache.get<Appointment[]>("appointments");
    if (cached) { setAppointments(cached); setLoading(false); }
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data as Appointment[]);
        clientCache.set("appointments", data as Appointment[]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleDrop = useCallback(async (targetDay: Date, targetHour?: number, targetMinute?: number) => {
    const aptId = draggedAptId;
    setDraggedAptId(null);
    if (!aptId) return;
    const apt = appointments.find((a) => a.id === aptId);
    if (!apt) return;
    const oldStart = new Date(apt.start_at);
    const oldEnd = new Date(apt.end_at);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(targetDay);
    newStart.setHours(targetHour ?? oldStart.getHours(), targetMinute ?? oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    if (newStart.getTime() === oldStart.getTime()) return;
    clientCache.del("appointments");
    setAppointments((prev) => prev.map((a) => a.id === aptId ? { ...a, start_at: newStart.toISOString(), end_at: newEnd.toISOString() } : a));
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aptId, start_at: newStart.toISOString(), end_at: newEnd.toISOString() }),
      });
      if (!res.ok) { clientCache.del("appointments"); fetchAppointments(); }
    } catch { clientCache.del("appointments"); fetchAppointments(); }
  }, [draggedAptId, appointments, fetchAppointments]);

  // Ref fetchAppointments + mouse listeners resize (déclarés après fetchAppointments)
  const fetchAppointmentsRef = useRef(fetchAppointments);
  fetchAppointmentsRef.current = fetchAppointments;

  useEffect(() => {
    if (!resizing?.aptId) return;
    const handleMouseMove = (e: MouseEvent) => {
      const r = resizingRef.current!;
      const deltaY = e.clientY - r.startY;
      const deltaMin = Math.round((deltaY / W_HOUR_H) * 60 / 15) * 15;
      const newDur = Math.max(15, r.origDurMin + deltaMin);
      if (newDur !== r.curDurMin) setResizing((prev) => prev ? { ...prev, curDurMin: newDur } : null);
    };
    // handleMouseUp recalcule depuis e.clientY pour éviter la valeur périmée du ref
    const handleMouseUp = async (e: MouseEvent) => {
      const r = resizingRef.current!;
      const { aptId, startY, origDurMin } = r;
      const deltaY = e.clientY - startY;
      const deltaMin = Math.round((deltaY / W_HOUR_H) * 60 / 15) * 15;
      const finalDurMin = Math.max(15, origDurMin + deltaMin);
      setResizing(null);
      const apt = appointmentsRef.current.find((a) => a.id === aptId);
      if (!apt) return;
      const prevDurMin = Math.round((new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()) / 60000);
      if (finalDurMin === prevDurMin) return;
      const newEnd = new Date(new Date(apt.start_at).getTime() + finalDurMin * 60000);
      clientCache.del("appointments");
      setAppointments((prev) => prev.map((a) => a.id === aptId ? { ...a, end_at: newEnd.toISOString() } : a));
      try {
        const res = await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: aptId, end_at: newEnd.toISOString() }) });
        if (!res.ok) { clientCache.del("appointments"); fetchAppointmentsRef.current(); }
      } catch { clientCache.del("appointments"); fetchAppointmentsRef.current(); }
    };
    document.body.style.cursor = "s-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing?.aptId]);

  // Sync selectedAppointment avec les données fraîches après chaque refresh
  useEffect(() => {
    setSelectedAppointment((prev) => {
      if (!prev) return null;
      const fresh = appointments.find((a) => a.id === prev.id);
      return fresh ?? prev;
    });
  }, [appointments]);

  // Realtime — postgres_changes (fonctionne maintenant grâce à REPLICA IDENTITY FULL)
  useEffect(() => {
    const supabase = createClient();
    const ch1 = supabase.channel("apts-rt").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
      clientCache.del("appointments");
      fetchAppointments();
    }).subscribe();
    const ch2 = supabase.channel("parts-rt").on("postgres_changes", { event: "*", schema: "public", table: "appointment_participants" }, () => {
      clientCache.del("appointments");
      fetchAppointments();
    }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchAppointments]);

  // Broadcast Google sync — déclenché par le webhook après chaque sync admin
  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createClient();
    const ch = supabase.channel(`google-sync:${profile.id}`)
      .on("broadcast", { event: "update" }, () => {
        // Invalider le cache avant de refetch pour éviter l'affichage stale
        clientCache.del("appointments");
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, fetchAppointments]);

  // Auto-sync polling (8s) — silencieux, pause quand l'onglet est invisible
  // Intervalle court pour garantir la visibilité des changements Google en < 10s
  // même si le broadcast realtime n'est pas reçu
  useEffect(() => {
    const silentFetch = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/appointments");
        if (res.ok) {
          const data = await res.json();
          setAppointments(data as Appointment[]);
          clientCache.set("appointments", data as Appointment[]);
        }
      } catch { /* silencieux */ }
    };
    const interval = setInterval(silentFetch, 3_000);
    return () => clearInterval(interval);
  }, []);

  // Retour sur l'onglet (ex: depuis Google Agenda) → refresh immédiat sans stale
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clientCache.del("appointments");
        fetchAppointments();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchAppointments]);

  // Contacts
  useEffect(() => {
    const cached = clientCache.get<Contact[]>("contacts");
    if (cached) setContacts(cached);
    fetch("/api/contacts").then(r => r.ok ? r.json() : null).then(data => {
      if (data) { setContacts(data); clientCache.set("contacts", data); }
    });
  }, []);

  // My types
  const fetchMyTypes = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`/api/appointments/types?user_id=${profile.id}`);
      if (res.ok) setRdvTypes(await res.json());
    } catch { setRdvTypes([]); }
  }, [profile?.id]);

  // Google accounts map (tokenId → email) for display in type picker
  const fetchGoogleAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sync");
      if (!res.ok) return;
      const data = await res.json();
      if (data.accounts) {
        const map: Record<string, string> = {};
        for (const acc of data.accounts) map[acc.id] = acc.google_email;
        setGoogleAccountsMap(map);
      }
    } catch { /* ignore */ }
  }, []);

  // Search recipients (unified: profiles + contacts)
  useEffect(() => {
    if (recipientSearch.length < 2) { setRecipientResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingRecipients(true);
      try {
        const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(recipientSearch)}&mode=all`);
        const data = await res.json();
        // Filtrer ceux déjà ajoutés (par id OU par email) + soi-même
        const addedIds = new Set(rdvParticipants.map((p) => p.id));
        const addedEmails = new Set(rdvParticipants.filter((p) => p.email).map((p) => p.email!.toLowerCase()));
        setRecipientResults((data.users || []).filter((u: UserProfile) => {
          if (u.id === profile?.id) return false;
          if (addedIds.has(u.id)) return false;
          if (u.email && addedEmails.has(u.email.toLowerCase())) return false;
          return true;
        }));
      } catch { setRecipientResults([]); }
      setSearchingRecipients(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [recipientSearch, rdvParticipants, profile?.id]);

  // ─── Actions ───
  const respondToInvitation = async (participantId: string, status: "accepted" | "declined", typeId?: string) => {
    setActionLoading(participantId);
    try {
      const body: Record<string, string> = { id: participantId, status };
      if (typeId) body.type_id = typeId;
      const res = await fetch("/api/appointments/participants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(status === "accepted" ? "Participation confirmée !" : "Participation déclinée.");
        await fetchAppointments();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur de connexion"); }
    setActionLoading(null);
  };

  const cancelAppointment = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("RDV annulé.");
        await fetchAppointments();
        setSelectedAppointment(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur de connexion"); }
    setActionLoading(null);
  };

  // ─── RDV Creation ───
  const fetchSlots = useCallback(async (date: Date, typeId: string, duration?: number) => {
    setRdvLoadingSlots(true);
    setRdvSlots([]);
    setRdvSelectedSlot(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const dur = duration || rdvSelectedDuration;
      // Ne passer que les participants avec un compte pour checker la dispo
      const userIds = rdvParticipants.filter((p) => p.has_account && p.user_id).map((p) => p.user_id || p.id).join(",");
      let url = `/api/appointments/available?date=${dateStr}&type_id=${typeId}&duration_min=${dur}`;
      if (userIds) url += `&user_ids=${userIds}`;
      const res = await fetch(url);
      const data = await res.json();
      const raw = data.slots || [];
      setRdvSlots(raw.map((s: { time: string; status?: string; busy_users?: string[] }) => ({
        time: s.time,
        available: (s.status ?? "available") === "available",
        busy_users: s.busy_users || [],
      })));
    } catch { setRdvSlots([]); }
    setRdvLoadingSlots(false);
  }, [rdvParticipants]);

  const handleRdvDateSelect = (date: Date | undefined) => {
    if (!date || !rdvSelectedType) return;
    setRdvSelectedDate(date);
    fetchSlots(date, rdvSelectedType.id);
    setRdvStep("slot");
  };

  const handleRdvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdvSelectedType || !rdvSelectedSlot) return;
    setRdvSubmitting(true);
    setRdvError(null);
    try {
      // Construire la liste de participants avec toutes les infos
      const participants: Array<{ user_id?: string; name: string; email?: string; phone?: string }> = rdvParticipants.map((p) => ({
        user_id: p.has_account ? (p.user_id || p.id) : undefined,
        name: p.full_name || "",
        email: p.email || undefined,
        phone: p.phone || undefined,
      }));
      // Si le formulaire a des infos guest supplémentaires → les ajouter
      if (rdvFormData.guest_name && !rdvParticipants.some((p) => p.full_name === rdvFormData.guest_name)) {
        participants.push({
          name: rdvFormData.guest_name,
          email: rdvFormData.guest_email || undefined,
          phone: rdvFormData.guest_phone || undefined,
        });
      }
      // S'assurer qu'il y a au moins 1 participant
      if (participants.length === 0) {
        setRdvError("Ajoutez au moins un participant.");
        setRdvSubmitting(false);
        return;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_id: rdvSelectedType.id,
          start_at: rdvSelectedSlot,
          duration_min: rdvSelectedDuration,
          message: rdvFormData.message || undefined,
          notify_on_event: rdvFormData.notify_on_event,
          participants,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRdvError(data.error || "Erreur");
        return;
      }
      setRdvStep("confirmation");
      toast.success("RDV créé avec succès !");
      await fetchAppointments();
    } catch { setRdvError("Erreur de connexion"); }
    setRdvSubmitting(false);
  };

  const resetRdvForm = () => {
    setShowRdvForm(false);
    setRdvStep("recipient");
    setRdvSelectedType(null);
    setRdvSelectedDate(undefined);
    setRdvSlots([]);
    setRdvSelectedSlot(null);
    setRdvFormData(emptyForm);
    setRdvError(null);
    setShowContactPicker(false);
    setContactSearch("");
    setRdvParticipants([]);
    setRecipientSearch("");
    setRecipientResults([]);
    setRdvTypes([]);
    setShowExternalForm(false);
    setExternalDraft({ name: "", email: "", phone: "" });
    setSavedContacts(new Set());
    setConfirmDuplicate(null);
  };

  const selectContactForRdv = (contact: Contact) => {
    setRdvFormData({
      ...rdvFormData,
      guest_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      guest_email: contact.email || "",
      guest_phone: contact.phone || "",
    });
    setShowContactPicker(false);
    setContactSearch("");
  };

  const addParticipant = (user: UserProfile) => {
    setRdvParticipants((prev) => [...prev, user]);
    // Auto-remplir les champs de contact si le participant n'a pas de compte
    if (!user.has_account) {
      setRdvFormData((prev) => ({
        ...prev,
        guest_name: prev.guest_name || user.full_name || "",
        guest_email: prev.guest_email || user.email || "",
        guest_phone: prev.guest_phone || user.phone || "",
      }));
    }
    setRecipientSearch("");
    setRecipientResults([]);
  };

  const removeParticipant = (userId: string) => {
    setRdvParticipants((prev) => prev.filter((p) => p.id !== userId));
  };

  const doSaveContact = async (p: UserProfile) => {
    const [first_name, ...rest] = (p.full_name || "").split(" ");
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name, last_name: rest.join(" ") || null, email: p.email || null, phone: p.phone || null }),
    });
    setSavedContacts((prev) => new Set([...prev, p.id]));
    toast.success(`${p.full_name} ajouté à l'annuaire`);
  };

  const saveParticipantAsContact = async (p: UserProfile) => {
    const duplicate = contacts.find(
      (c) =>
        (p.email && c.email?.toLowerCase() === p.email.toLowerCase()) ||
        `${c.first_name} ${c.last_name || ""}`.trim().toLowerCase() === p.full_name?.toLowerCase()
    );
    if (duplicate) {
      setConfirmDuplicate({ participant: p, existing: duplicate });
      return;
    }
    await doSaveContact(p);
  };

  // ─── Computed ───
  const now = new Date();
  const stats = useMemo(() => {
    const upcoming = appointments.filter((a) => new Date(a.start_at) >= now && a.status !== "cancelled");
    const pending = appointments.filter((a) => a.status === "pending");
    const todayAppts = appointments.filter((a) => isToday(new Date(a.start_at)) && a.status !== "cancelled");
    return { total: upcoming.length, pending: pending.length, today: todayAppts.length, confirmed: appointments.filter((a) => a.status === "confirmed").length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const monthDays = useMemo(() => {
    const ms = startOfMonth(selectedDate); const me = endOfMonth(selectedDate);
    return eachDayOfInterval({ start: startOfWeek(ms, { weekStartsOn: 1 }), end: endOfWeek(me, { weekStartsOn: 1 }) });
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const appointmentsForDay = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.start_at), selectedDate))
      .filter((a) => a.status !== "cancelled")
      .filter((a) => filter === "all" || a.status === filter)
      .filter((a) => !search || a.guest_name.toLowerCase().includes(search.toLowerCase()) || a.guest_email.toLowerCase().includes(search.toLowerCase()));
  }, [appointments, selectedDate, filter, search]);

  const cancelledForDay = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.start_at), selectedDate))
      .filter((a) => a.status === "cancelled")
      .filter((a) => !search || a.guest_name.toLowerCase().includes(search.toLowerCase()) || a.guest_email.toLowerCase().includes(search.toLowerCase()));
  }, [appointments, selectedDate, search]);

  const appointmentCountForDay = useCallback(
    (day: Date) => appointments.filter((a) => isSameDay(new Date(a.start_at), day) && a.status !== "cancelled").length,
    [appointments]
  );

  const navigatePrev = () => { viewMode === "month" ? setSelectedDate((d) => subMonths(d, 1)) : setSelectedDate((d) => subWeeks(d, 1)); };
  const navigateNext = () => { viewMode === "month" ? setSelectedDate((d) => addMonths(d, 1)) : setSelectedDate((d) => addWeeks(d, 1)); };
  const goToToday = () => setSelectedDate(new Date());

  if (loading) return null;

  const rdvStepIndex = (["recipient", "type", "date", "slot", "form"] as const).indexOf(rdvStep as never);

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || (c.last_name?.toLowerCase() ?? "").includes(q) || (c.email?.toLowerCase() ?? "").includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="premium-panel relative overflow-hidden rounded-[2rem] px-5 py-5 lg:px-7 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_22%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary/75">Agenda</p>
              <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-foreground lg:text-[40px]">
                Une vue claire sur vos rendez-vous.
              </h1>
              <p className="mt-3 max-w-xl text-[14px] leading-6 text-muted-foreground lg:text-[15px]">
                Suivi des disponibilités, lecture rapide des rendez-vous et panneau détail plus lisible, dans une interface plus sobre et plus premium.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[320px]">
              <div className="premium-panel-soft rounded-[1.35rem] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Date</p>
                <p className="mt-2 text-[15px] font-semibold text-foreground">{format(selectedDate, "d MMM", { locale: fr })}</p>
              </div>
              <div className="premium-panel-soft rounded-[1.35rem] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Vue</p>
                <p className="mt-2 text-[15px] font-semibold capitalize text-foreground">{viewMode === "month" ? "Mois" : "Semaine"}</p>
              </div>
              <div className="premium-panel-soft rounded-[1.35rem] px-4 py-3 sm:col-span-2 xl:col-span-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Filtre</p>
                <p className="mt-2 text-[15px] font-semibold text-foreground">{filter === "all" ? "Tous" : filter === "pending" ? "En attente" : filter === "confirmed" ? "Confirmés" : "Annulés"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-panel-soft rounded-[2rem] px-4 py-4 lg:px-5 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Cadence</p>
              <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-foreground">Résumé du jour</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Focus</div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[1.2rem] bg-white/55 px-4 py-3 dark:bg-white/[0.05]">
              <span className="text-[13px] text-muted-foreground">Rendez-vous visibles</span>
              <span className="text-[14px] font-semibold text-foreground">{appointmentsForDay.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.2rem] bg-white/55 px-4 py-3 dark:bg-white/[0.05]">
              <span className="text-[13px] text-muted-foreground">Annulés</span>
              <span className="text-[14px] font-semibold text-foreground">{cancelledForDay.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.2rem] bg-white/55 px-4 py-3 dark:bg-white/[0.05]">
              <span className="text-[13px] text-muted-foreground">Panneau détail</span>
              <span className="text-[14px] font-semibold text-foreground">{selectedAppointment ? "Ouvert" : showRdvForm ? "Création" : "Repos"}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          { label: "Aujourd'hui", value: stats.today, icon: CalendarDays, color: "text-blue-500", gradient: "from-blue-500/20 to-blue-600/20" },
          { label: "En attente", value: stats.pending, icon: Clock, color: "text-amber-500", gradient: "from-amber-500/20 to-amber-600/20" },
          { label: "Confirmés", value: stats.confirmed, icon: CheckCircle2, color: "text-green-500", gradient: "from-green-500/20 to-green-600/20" },
          { label: "À venir", value: stats.total, icon: TrendingUp, color: "text-purple-500", gradient: "from-purple-500/20 to-purple-600/20" },
        ].map((stat) => (
          <div key={stat.label} className="premium-panel-soft rounded-[1.7rem] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold tracking-[-0.05em] sm:text-2xl">{stat.value}</p>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        {/* Left: Calendar + List */}
        <div className={cn("space-y-4", viewMode === "week" ? "lg:col-span-12" : "lg:col-span-8")}>
          {/* Calendar Nav */}
          <div className="premium-panel rounded-[1.9rem] p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button onClick={navigatePrev} className="premium-panel-soft flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={goToToday} className="hidden sm:block rounded-xl px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors">Aujourd&apos;hui</button>
                <button onClick={navigateNext} className="premium-panel-soft flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <h3 className="text-[13px] sm:text-[15px] font-semibold tracking-[-0.03em] capitalize truncate">
                {viewMode === "month" ? format(selectedDate, "MMMM yyyy", { locale: fr }) : `${format(weekDays[0], "d MMM", { locale: fr })} — ${format(weekDays[6], "d MMM yyyy", { locale: fr })}`}
              </h3>
              <div className="premium-panel-soft flex rounded-xl p-0.5 shrink-0">
                <button onClick={() => setViewMode("month")} className={cn("rounded-lg px-2 py-1 text-[10px] font-medium transition-all", viewMode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Mois</button>
                <button onClick={() => setViewMode("week")} className={cn("rounded-lg px-2 py-1 text-[10px] font-medium transition-all", viewMode === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Sem.</button>
              </div>
            </div>

            {/* Month View */}
            {viewMode === "month" && (
              <div>
                {/* En-têtes jours */}
                <div className="grid grid-cols-7 mb-1.5">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
                    <div key={d} className={cn("text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest py-2", i >= 5 ? "text-muted-foreground/40" : "text-muted-foreground/60")}>{d}</div>
                  ))}
                </div>
                {/* Grille */}
                <div className="grid grid-cols-7 gap-px bg-foreground/[0.07] rounded-2xl overflow-hidden">
                  {monthDays.map((day) => {
                    const count = appointmentCountForDay(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, selectedDate);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start_at), day) && a.status !== "cancelled").slice(0, 3);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => { if (!draggedAptId) setSelectedDate(day); }}
                        onDragOver={isDesktop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } : undefined}
                        onDrop={isDesktop ? (e) => { e.preventDefault(); handleDrop(day); } : undefined}
                        className={cn(
                          "relative flex flex-col items-start p-1.5 sm:p-2 min-h-[72px] sm:min-h-[96px] lg:min-h-[112px] transition-all duration-150",
                          isWeekend ? "bg-foreground/[0.018] dark:bg-foreground/[0.03]" : "bg-card",
                          isSelected ? "!bg-primary/[0.08] ring-2 ring-inset ring-primary/30" : "hover:bg-primary/[0.03]",
                          !isCurrentMonth && "opacity-30",
                          draggedAptId && "hover:!bg-primary/[0.12] hover:ring-2 hover:ring-inset hover:ring-primary/30"
                        )}
                      >
                        {/* Numéro du jour */}
                        <span className={cn(
                          "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[11px] sm:text-[12px]",
                          isTodayDay
                            ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/40"
                            : isSelected
                              ? "bg-primary/12 text-primary font-bold"
                              : isWeekend
                                ? "font-medium text-foreground/45"
                                : "font-medium text-foreground/75"
                        )}>
                          {format(day, "d")}
                        </span>
                        {/* Événements */}
                        <div className="mt-1 w-full space-y-[3px] overflow-hidden">
                          {dayAppts.map((apt) => {
                            const mt = getMyType(apt, profile?.id);
                            return (
                              <div
                                key={apt.id}
                                draggable={isDesktop}
                                onDragStart={isDesktop ? (e) => {
                                  e.stopPropagation(); setDraggedAptId(apt.id); e.dataTransfer.effectAllowed = "move";
                                  const c = document.createElement("canvas"); c.width = 1; c.height = 1; c.style.cssText = "position:fixed;top:-2px;left:-2px;opacity:0;pointer-events:none;";
                                  document.body.appendChild(c); e.dataTransfer.setDragImage(c, 0, 0); requestAnimationFrame(() => { if (document.body.contains(c)) document.body.removeChild(c); });
                                } : undefined}
                                onDragEnd={isDesktop ? () => setDraggedAptId(null) : undefined}
                                className={cn("hidden sm:flex items-center gap-1 truncate rounded-md px-1.5 py-[3px] text-[9px] sm:text-[10px] font-medium select-none", isDesktop ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
                                style={{ backgroundColor: `${mt.color}18`, color: mt.color }}
                              >
                                <span className="shrink-0 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mt.color }} />
                                <span className="truncate">{format(new Date(apt.start_at), "HH:mm")} {apt.guest_name.split(" ")[0]}</span>
                              </div>
                            );
                          })}
                          {/* Mobile : dots + compteur */}
                          {count > 0 && (
                            <div className="flex items-center gap-1 sm:hidden justify-center mt-1">
                              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                                <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                              ))}
                              {count > 3 && <span className="text-[8px] text-muted-foreground/70">+{count - 3}</span>}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Week View — Google Calendar style */}
            {viewMode === "week" && (
              <div className="rounded-2xl border border-foreground/[0.07] overflow-hidden select-none bg-card">
                {/* En-tête jours — sticky */}
                <div className="flex border-b border-foreground/[0.07] bg-card/95 backdrop-blur-sm">
                  <div className="w-14 shrink-0 border-r border-foreground/[0.05]" />
                  {weekDays.map((day) => {
                    const isTodayDay = isToday(day);
                    const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div key={day.toISOString()} className={cn("flex-1 min-w-0 py-3 text-center border-l border-foreground/[0.05]", isWeekendDay && "bg-foreground/[0.012]")}>
                        <div className={cn("text-[9px] uppercase font-semibold tracking-wider", isTodayDay ? "text-primary" : isWeekendDay ? "text-muted-foreground/45" : "text-muted-foreground/60")}>
                          {format(day, "EEE", { locale: fr })}
                        </div>
                        <div className={cn("mx-auto mt-1 h-8 w-8 flex items-center justify-center rounded-full text-[13px] font-bold", isTodayDay ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : isWeekendDay ? "text-foreground/45" : "text-foreground/80")}>
                          {format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Grille scrollable */}
                <div ref={weekScrollRef} className="overflow-y-auto" style={{ height: `${W_VISIBLE_H}px` }}>
                  <div className="flex" style={{ height: `${W_TOTAL_H}px` }}>
                    {/* Labels horaires */}
                    <div className="w-14 shrink-0 relative border-r border-foreground/[0.05]">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="absolute w-full flex justify-end pr-2" style={{ top: `${h * W_HOUR_H - 8}px` }}>
                          {h > 0 && <span className="text-[10px] font-medium text-muted-foreground/45">{String(h).padStart(2, "0")}:00</span>}
                        </div>
                      ))}
                    </div>
                    {/* Colonnes jours */}
                    {weekDays.map((day) => {
                      const isTodayDay = isToday(day);
                      const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;
                      const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start_at), day) && a.status !== "cancelled");
                      const laid = layoutWeekEvents(dayAppts);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn("relative flex-1 min-w-0 border-l border-foreground/[0.05]", isWeekendDay && "bg-foreground/[0.012]", isTodayDay && "bg-primary/[0.018]")}
                          style={{ height: `${W_TOTAL_H}px` }}
                          onDragOver={isDesktop && draggedAptId ? (e) => {
                            e.preventDefault(); e.dataTransfer.dropEffect = "move";
                            const relY = e.clientY - e.currentTarget.getBoundingClientRect().top + (weekScrollRef.current?.scrollTop ?? 0);
                            const h = Math.min(23, Math.max(0, Math.floor(relY / W_HOUR_H)));
                            const rawMin = Math.round((relY % W_HOUR_H) / (W_HOUR_H / 2)) * 30;
                            const m = rawMin >= 60 ? 0 : rawMin;
                            const adjH = rawMin >= 60 ? Math.min(23, h + 1) : h;
                            if (!dragOver || !isSameDay(dragOver.day, day) || dragOver.hour !== adjH || dragOver.minute !== m) setDragOver({ day, hour: adjH, minute: m });
                          } : undefined}
                          onDrop={isDesktop && draggedAptId ? (e) => {
                            e.preventDefault();
                            const relY = e.clientY - e.currentTarget.getBoundingClientRect().top + (weekScrollRef.current?.scrollTop ?? 0);
                            const h = Math.min(23, Math.max(0, Math.floor(relY / W_HOUR_H)));
                            const rawMin = Math.round((relY % W_HOUR_H) / (W_HOUR_H / 2)) * 30;
                            const m = rawMin >= 60 ? 0 : rawMin;
                            const adjH = rawMin >= 60 ? Math.min(23, h + 1) : h;
                            setDragOver(null); handleDrop(day, adjH, m);
                          } : undefined}
                        >
                          {/* Lignes heure pleine */}
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="absolute w-full border-t border-foreground/[0.06]" style={{ top: `${h * W_HOUR_H}px` }} />
                          ))}
                          {/* Lignes demi-heure (tiretées) */}
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="absolute w-full border-t border-dashed border-foreground/[0.03]" style={{ top: `${h * W_HOUR_H + W_HOUR_H / 2}px` }} />
                          ))}
                          {/* Zones click-to-create (desktop uniquement) */}
                          {isDesktop && !draggedAptId && Array.from({ length: 48 }, (_, i) => {
                            const hour = Math.floor(i / 2);
                            const minute = (i % 2) * 30;
                            return (
                              <div
                                key={i}
                                className="absolute w-full cursor-pointer hover:bg-foreground/[0.03] transition-colors"
                                style={{ top: `${i * (W_HOUR_H / 2)}px`, height: `${W_HOUR_H / 2}px` }}
                                onClick={() => { setQuickTitle(""); setQuickCreate({ date: day, hour, minute }); }}
                              />
                            );
                          })}
                          {/* Ghost de déplacement */}
                          {draggedAptId && dragOver && isSameDay(dragOver.day, day) && (() => {
                            const draggedApt = appointments.find((a) => a.id === draggedAptId);
                            if (!draggedApt) return null;
                            const dur = new Date(draggedApt.end_at).getTime() - new Date(draggedApt.start_at).getTime();
                            const ghostTop = (dragOver.hour + dragOver.minute / 60) * W_HOUR_H;
                            const ghostH = Math.max(22, (dur / 3600000) * W_HOUR_H);
                            const mt = getMyType(draggedApt, profile?.id);
                            return (
                              <div
                                className="absolute left-[1%] right-[1%] rounded-lg pointer-events-none z-30 transition-[top] duration-75"
                                style={{
                                  top: `${ghostTop}px`,
                                  height: `${ghostH}px`,
                                  backgroundColor: `${mt.color}28`,
                                  borderLeft: `3px solid ${mt.color}`,
                                  outline: `1.5px solid ${mt.color}`,
                                  outlineOffset: "-1px",
                                }}
                              >
                                <p className="px-1.5 pt-0.5 text-[10px] font-bold" style={{ color: mt.color }}>
                                  {String(dragOver.hour).padStart(2, "0")}:{String(dragOver.minute).padStart(2, "0")}
                                </p>
                              </div>
                            );
                          })()}
                          {/* Événements positionnés */}
                          {laid.map(({ apt, col, cols }) => {
                            const startDate = new Date(apt.start_at);
                            const endDate = new Date(apt.end_at);
                            const top = (startDate.getHours() + startDate.getMinutes() / 60) * W_HOUR_H;
                            const isBeingDragged = draggedAptId === apt.id;
                            const isResizingThis = resizing?.aptId === apt.id;
                            const durMin = isResizingThis
                              ? resizing!.curDurMin
                              : Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                            const height = Math.max(22, (durMin / 60) * W_HOUR_H);
                            const resizeEndTotalMin = isResizingThis ? startDate.getHours() * 60 + startDate.getMinutes() + resizing!.curDurMin : 0;
                            const resizeEndLabel = isResizingThis ? `${String(Math.floor(resizeEndTotalMin / 60) % 24).padStart(2, "0")}:${String(resizeEndTotalMin % 60).padStart(2, "0")}` : "";
                            const myType = getMyType(apt, profile?.id);
                            const colW = 100 / cols;
                            return (
                              <div
                                key={apt.id}
                                draggable={isDesktop && !resizing}
                                onDragStart={isDesktop && !resizing ? (e) => {
                                  e.stopPropagation(); setDraggedAptId(apt.id); e.dataTransfer.effectAllowed = "move";
                                  const c = document.createElement("canvas"); c.width = 1; c.height = 1; c.style.cssText = "position:fixed;top:-2px;left:-2px;opacity:0;pointer-events:none;";
                                  document.body.appendChild(c); e.dataTransfer.setDragImage(c, 0, 0); requestAnimationFrame(() => { if (document.body.contains(c)) document.body.removeChild(c); });
                                } : undefined}
                                onDragEnd={isDesktop ? () => { setDraggedAptId(null); setDragOver(null); } : undefined}
                                onClick={(e) => { e.stopPropagation(); if (!isBeingDragged && !resizing) setAptPopup(apt); }}
                                className={cn("absolute rounded-lg px-1.5 py-1 overflow-hidden z-10 hover:z-20 transition-[opacity,filter] shadow-sm", isDesktop && !resizing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer", isBeingDragged ? "opacity-25" : "hover:brightness-95", isResizingThis && "z-20 shadow-md")}
                                style={{
                                  top: `${top + 1}px`,
                                  height: `${height - 2}px`,
                                  left: `${col * colW + 1}%`,
                                  width: `calc(${colW}% - 3px)`,
                                  backgroundColor: `${myType.color}20`,
                                  borderLeft: `3px solid ${myType.color}`,
                                }}
                              >
                                <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: myType.color }}>
                                  {format(startDate, "HH:mm")}
                                  {isResizingThis
                                    ? <span className="font-normal"> → {resizeEndLabel}</span>
                                    : height > 30 && <span className="font-normal"> {apt.guest_name.split(" ")[0]}</span>
                                  }
                                </p>
                                {!isResizingThis && height > 44 && <p className="text-[9px] text-muted-foreground/60 truncate mt-0.5">{myType.name}</p>}
                                {/* Resize handle */}
                                {isDesktop && (
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center pb-0.5 cursor-s-resize z-20 group/rh"
                                    onMouseDown={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      const dur = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                                      setResizing({ aptId: apt.id, startY: e.clientY, origDurMin: dur, curDurMin: dur });
                                    }}
                                  >
                                    <div className="w-6 h-[3px] rounded-full opacity-0 group-hover/rh:opacity-60 transition-opacity" style={{ backgroundColor: myType.color }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="premium-panel-soft flex flex-col gap-2 rounded-[1.7rem] p-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full glass-input py-2.5 pl-10 pr-4 text-[13px]" />
            </div>
            <div className="flex gap-1 rounded-2xl bg-foreground/[0.04] p-1 overflow-x-auto">
              {([{ key: "all", label: "Tous" }, { key: "pending", label: "En attente" }, { key: "confirmed", label: "Confirmés" }, { key: "cancelled", label: "Annulés" }] as const).map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)} className={cn("rounded-xl px-3 py-1.5 text-[11px] sm:text-[12px] font-medium transition-all shrink-0", filter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-2">
            {filter === "cancelled" ? (
              /* ── Section Annulés ── */
              <>
                <div className="px-1 text-[13px] font-semibold text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  {isToday(selectedDate) ? "Aujourd'hui" : isTomorrow(selectedDate) ? "Demain" : format(selectedDate, "EEEE d MMMM", { locale: fr })}
                  {" · "}{cancelledForDay.length} annulé{cancelledForDay.length !== 1 ? "s" : ""}
                </div>
                {cancelledForDay.length === 0 ? (
                  <div className="premium-panel-soft flex flex-col items-center gap-3 rounded-[1.8rem] py-16">
                    <XCircle className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-[14px] text-muted-foreground">Aucun rendez-vous annulé ce jour.</p>
                  </div>
                ) : (
                  cancelledForDay.map((apt) => {
                    const isSelected = selectedAppointment?.id === apt.id;
                    const myType = getMyType(apt, profile?.id);
                    const participantCount = apt.appointment_participants?.length || 0;
                    return (
                      <button key={apt.id} onClick={() => setSelectedAppointment(apt)} className={cn("group w-full text-left rounded-[1.7rem] p-3 sm:p-4 transition-all duration-300 opacity-60", isSelected ? "premium-panel shadow-lg opacity-100" : "premium-panel-soft hover:bg-white/72 hover:opacity-80 dark:hover:bg-white/[0.08]")}>
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex flex-col items-center text-center min-w-[48px] sm:min-w-[56px]">
                            <span className="text-base sm:text-lg font-bold line-through text-muted-foreground">{format(new Date(apt.start_at), "HH:mm")}</span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground">{Math.round((new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()) / 60000)} min</span>
                          </div>
                          <div className="mt-1 h-10 sm:h-12 w-1 rounded-full shrink-0 bg-red-500/40" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] sm:text-[14px] font-semibold truncate line-through text-muted-foreground">{apt.guest_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] sm:text-[12px] font-medium text-muted-foreground/60">{myType.name}</span>
                              {participantCount > 1 && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Users className="h-3 w-3" /> {participantCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-2 py-1 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            <span className="text-[10px] sm:text-[11px] font-medium text-red-500">Annulé</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            ) : (
              /* ── Section normale ── */
              <>
                <div className="px-1 text-[13px] font-semibold text-muted-foreground">
                  {isToday(selectedDate) ? "Aujourd'hui" : isTomorrow(selectedDate) ? "Demain" : format(selectedDate, "EEEE d MMMM", { locale: fr })}
                  {" · "}{appointmentsForDay.length} rendez-vous
                </div>
                {appointmentsForDay.length === 0 ? (
                  <div className="premium-panel-soft flex flex-col items-center gap-3 rounded-[1.8rem] py-16">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-[14px] text-muted-foreground">Aucun rendez-vous ce jour.</p>
                  </div>
                ) : (
                  appointmentsForDay.map((apt) => {
                    const config = statusConfig[apt.status] || statusConfig.pending;
                    const isSelected = selectedAppointment?.id === apt.id;
                    const myType = getMyType(apt, profile?.id);
                    const myPart = getMyParticipant(apt, profile?.id);
                    const participantCount = apt.appointment_participants?.length || 0;
                    return (
                      <button key={apt.id} draggable onDragStart={(e) => { setDraggedAptId(apt.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDraggedAptId(null)} onClick={() => setSelectedAppointment(apt)} className={cn("group w-full text-left rounded-[1.7rem] p-3 sm:p-4 transition-all duration-300 cursor-grab active:cursor-grabbing", isSelected ? "premium-panel shadow-lg" : "premium-panel-soft hover:bg-white/72 dark:hover:bg-white/[0.08]")}>
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex flex-col items-center text-center min-w-[48px] sm:min-w-[56px]">
                            <span className="text-base sm:text-lg font-bold">{format(new Date(apt.start_at), "HH:mm")}</span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground">{Math.round((new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()) / 60000)} min</span>
                          </div>
                          <div className="mt-1 h-10 sm:h-12 w-1 rounded-full shrink-0" style={{ backgroundColor: myType.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] sm:text-[14px] font-semibold truncate">{apt.guest_name}</span>
                              {apt.is_close_contact && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] sm:text-[12px] font-medium" style={{ color: myType.color }}>{myType.name}</span>
                              {participantCount > 1 && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Users className="h-3 w-3" /> {participantCount}
                                </span>
                              )}
                            </div>
                            {/* Mon statut de participant */}
                            {myPart && !myPart.is_organizer && myPart.status === "pending" && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 rounded-lg px-1.5 py-0.5">
                                <AlertTriangle className="h-3 w-3" /> Réponse attendue
                              </span>
                            )}
                            {/* Indicateur Google Calendar */}
                            {apt.google_event_id && (
                              <span className={cn(
                                "inline-flex items-center gap-1 mt-1 text-[10px] font-medium rounded-lg px-1.5 py-0.5",
                                apt.google_sync_status === "synced"
                                  ? "text-blue-600 bg-blue-500/10 dark:text-blue-400"
                                  : apt.google_sync_status === "error"
                                  ? "text-red-600 bg-red-500/10 dark:text-red-400"
                                  : "text-gray-600 bg-gray-500/10 dark:text-gray-400"
                              )}>
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm-1.177 18.003l-.07-.003c-.93 0-1.81-.373-2.463-1.036l-3.14-3.203 1.458-1.428 3.14 3.203c.56.571 1.51.577 2.076.013l6.842-6.797 1.42 1.442-6.842 6.797a2.951 2.951 0 01-2.421 1.012z"/></svg>
                                Google
                              </span>
                            )}
                          </div>
                          <div className={cn("flex items-center gap-1.5 rounded-xl px-2 py-1 shrink-0", config.bg)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                            <span className={cn("text-[10px] sm:text-[11px] font-medium", config.color)}>{config.label}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel */}
        {(selectedAppointment || showRdvForm) && (
          <div className={cn("fixed inset-0 z-50 bg-background/80 backdrop-blur-sm", viewMode === "month" && "lg:sticky lg:top-6 lg:self-start lg:bg-transparent lg:backdrop-blur-none lg:col-span-4")}>
            <div className="h-full overflow-y-auto lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto p-4 lg:p-0">
              {showRdvForm ? (
                <RdvCreationPanel
                  step={rdvStep} setStep={setRdvStep} stepIndex={rdvStepIndex}
                  types={rdvTypes} selectedType={rdvSelectedType} setSelectedType={setRdvSelectedType}
                  selectedDate={rdvSelectedDate} onDateSelect={handleRdvDateSelect}
                  slots={rdvSlots} selectedSlot={rdvSelectedSlot}
                  setSelectedSlot={(slot) => { setRdvSelectedSlot(slot); setRdvStep("form"); }}
                  loadingSlots={rdvLoadingSlots} submitting={rdvSubmitting} error={rdvError}
                  formData={rdvFormData} setFormData={setRdvFormData}
                  onSubmit={handleRdvSubmit} onClose={resetRdvForm}
                  contacts={contacts} contactSearch={contactSearch} setContactSearch={setContactSearch}
                  showContactPicker={showContactPicker} setShowContactPicker={setShowContactPicker}
                  filteredContacts={filteredContacts} selectContact={selectContactForRdv}
                  participants={rdvParticipants} recipientSearch={recipientSearch} setRecipientSearch={setRecipientSearch}
                  recipientResults={recipientResults} searchingRecipients={searchingRecipients}
                  onAddParticipant={addParticipant} onRemoveParticipant={removeParticipant}
                  currentUser={profile ? { id: profile.id, full_name: profile.full_name || "Moi", avatar_url: profile.avatar_url, email: profile.email, has_account: true, user_id: profile.id, source: "profile" as const } : null}
                  googleAccounts={googleAccountsMap}
                  selectedDuration={rdvSelectedDuration} setSelectedDuration={setRdvSelectedDuration}
                  showCreateType={showCreateType} setShowCreateType={setShowCreateType}
                  newTypeName={newTypeName} setNewTypeName={setNewTypeName}
                  newTypeColor={newTypeColor} setNewTypeColor={setNewTypeColor}
                  creatingType={creatingType}
                  onCreateType={async () => {
                    setCreatingType(true);
                    try {
                      const res = await fetch("/api/appointments/types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTypeName.trim(), color: newTypeColor, user_id: profile?.id }) });
                      if (res.ok) { const newType = await res.json(); setRdvTypes((prev) => [...prev, newType]); setRdvSelectedType(newType); setShowCreateType(false); setNewTypeName(""); setNewTypeColor("#007AFF"); setRdvStep("date"); }
                    } catch { /* ignore */ }
                    setCreatingType(false);
                  }}
                  onNextFromRecipients={() => { fetchMyTypes(); fetchGoogleAccounts(); setRdvStep("type"); }}
                  showExternalForm={showExternalForm} setShowExternalForm={setShowExternalForm}
                  externalDraft={externalDraft} setExternalDraft={setExternalDraft}
                  savedContacts={savedContacts} confirmDuplicate={confirmDuplicate}
                  onSaveParticipant={saveParticipantAsContact}
                  onConfirmDuplicate={async () => { if (confirmDuplicate) { await doSaveContact(confirmDuplicate.participant); setConfirmDuplicate(null); } }}
                  onCancelDuplicate={() => setConfirmDuplicate(null)}
                />
              ) : selectedAppointment ? (
                <AppointmentDetail
                  appointment={selectedAppointment}
                  currentUserId={profile?.id}
                  isAdmin={isAdmin}
                  isLoading={!!actionLoading}
                  onAccept={(participantId, typeId) => respondToInvitation(participantId, "accepted", typeId)}
                  onDecline={(participantId) => respondToInvitation(participantId, "declined")}
                  onCancel={(aptId) => cancelAppointment(aptId)}
                  onClose={() => setSelectedAppointment(null)}
                />
              ) : null}
            </div>
          </div>
        )}
        {!selectedAppointment && !showRdvForm && (
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
            <div className="premium-panel flex flex-col items-center justify-center rounded-[2rem] py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 mb-4"><CalendarIcon className="h-7 w-7 text-primary" /></div>
              <p className="text-[14px] font-medium">Aucun RDV sélectionné</p>
              <p className="mt-1 text-[12px] text-muted-foreground max-w-[200px]">Cliquez sur un rendez-vous pour voir les détails.</p>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Popup */}
      {aptPopup && (
        <>
          <div className="fixed inset-0 z-[65]" onClick={() => setAptPopup(null)} />
          <div className="fixed z-[70] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl dark:bg-card/90 bottom-0 left-0 right-0 rounded-t-3xl p-5 lg:bottom-[84px] lg:left-auto lg:right-10 lg:w-80 lg:rounded-2xl lg:p-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/[0.1] lg:hidden" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: aptPopup.appointment_types.color }} />
                <p className="text-[15px] font-semibold tracking-tight truncate">{aptPopup.guest_name}</p>
              </div>
              <button onClick={() => setAptPopup(null)} className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-foreground/[0.04] rounded-xl px-3 py-2.5">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="capitalize">{format(new Date(aptPopup.start_at), "EEEE d MMMM", { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-foreground/[0.04] rounded-xl px-3 py-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{format(new Date(aptPopup.start_at), "HH:mm")} – {format(new Date(aptPopup.end_at), "HH:mm")}</span>
                <span className="ml-auto text-[11px] opacity-60">{Math.round((new Date(aptPopup.end_at).getTime() - new Date(aptPopup.start_at).getTime()) / 60000)} min</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] px-3 py-1.5">
                <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-medium", statusConfig[aptPopup.status]?.bg, statusConfig[aptPopup.status]?.color)}>
                  {statusConfig[aptPopup.status]?.label ?? aptPopup.status}
                </span>
                <span className="text-muted-foreground/60">{aptPopup.appointment_types.name}</span>
              </div>
            </div>
            <button
              onClick={() => { setSelectedAppointment(aptPopup); setSelectedDate(new Date(aptPopup.start_at)); setAptPopup(null); }}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Voir les détails
            </button>
          </div>
        </>
      )}

      {/* Quick Create Popup */}
      {quickCreate && (
        <>
          <div className="fixed inset-0 z-[65]" onClick={() => setQuickCreate(null)} />
          <div className="fixed z-[70] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl dark:bg-card/90 bottom-0 left-0 right-0 rounded-t-3xl p-5 lg:bottom-[84px] lg:left-auto lg:right-10 lg:w-80 lg:rounded-2xl lg:p-5">
            {/* Handle bar mobile */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/[0.1] lg:hidden" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold tracking-tight">Nouveau rendez-vous</p>
              <button onClick={() => setQuickCreate(null)} className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2 text-[12px] text-muted-foreground bg-foreground/[0.04] rounded-xl px-3 py-2.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="capitalize">{format(quickCreate.date, "EEEE d MMMM", { locale: fr })}</span>
              <span className="mx-0.5 opacity-40">·</span>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{String(quickCreate.hour).padStart(2, "0")}:{String(quickCreate.minute).padStart(2, "0")}</span>
            </div>
            <input
              type="text"
              placeholder="Titre (optionnel)..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const d = new Date(quickCreate.date);
                  d.setHours(quickCreate.hour, quickCreate.minute, 0, 0);
                  setQuickCreate(null);
                  resetRdvForm();
                  if (quickTitle.trim()) setRdvFormData({ ...emptyForm, guest_name: quickTitle.trim() });
                  setRdvSelectedDate(d);
                  setShowRdvForm(true);
                }
              }}
              className="w-full glass-input px-3 py-2.5 text-[13px] mb-4"
              autoFocus
            />
            <button
              onClick={() => {
                const d = new Date(quickCreate.date);
                d.setHours(quickCreate.hour, quickCreate.minute, 0, 0);
                setQuickCreate(null);
                resetRdvForm();
                if (quickTitle.trim()) setRdvFormData({ ...emptyForm, guest_name: quickTitle.trim() });
                setRdvSelectedDate(d);
                setShowRdvForm(true);
              }}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Configurer le rendez-vous
            </button>
          </div>
        </>
      )}

      {/* FAB — toujours visible */}
      <button
        onClick={() => {
          const now = new Date();
          const rMin = now.getMinutes() >= 30 ? 30 : 0;
          setQuickTitle("");
          setQuickCreate({ date: now, hour: now.getHours(), minute: rMin });
        }}
        className="fixed bottom-20 right-5 z-[60] flex h-13 w-13 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-xl border border-white/20 text-muted-foreground shadow-md transition-all hover:shadow-xl hover:scale-105 active:scale-95 lg:bottom-10 lg:right-10 lg:bg-white/58 lg:border-white/45 lg:text-foreground lg:shadow-lg dark:lg:bg-white/[0.08] dark:lg:border-white/[0.12]"
        aria-label="Nouveau rendez-vous"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RDV Creation Panel (multi-participants)
   ═══════════════════════════════════════════════════════ */
function RdvCreationPanel({
  step, setStep, stepIndex, types, selectedType, setSelectedType,
  selectedDate, onDateSelect, slots, selectedSlot, setSelectedSlot,
  loadingSlots, submitting, error, formData, setFormData,
  onSubmit, onClose, contacts, contactSearch, setContactSearch,
  showContactPicker, setShowContactPicker, filteredContacts, selectContact,
  participants, recipientSearch, setRecipientSearch, recipientResults,
  searchingRecipients, onAddParticipant, onRemoveParticipant, onNextFromRecipients,
  showExternalForm, setShowExternalForm, externalDraft, setExternalDraft,
  savedContacts, confirmDuplicate, onSaveParticipant, onConfirmDuplicate, onCancelDuplicate,
  selectedDuration, setSelectedDuration,
  showCreateType, setShowCreateType, newTypeName, setNewTypeName, newTypeColor, setNewTypeColor,
  creatingType, onCreateType,
  currentUser, googleAccounts,
}: {
  step: RdvStep; setStep: (s: RdvStep) => void; stepIndex: number;
  types: AppointmentType[]; selectedType: AppointmentType | null; setSelectedType: (t: AppointmentType) => void;
  selectedDate: Date | undefined; onDateSelect: (d: Date | undefined) => void;
  slots: SlotInfo[]; selectedSlot: string | null; setSelectedSlot: (s: string) => void;
  loadingSlots: boolean; submitting: boolean; error: string | null;
  formData: typeof emptyForm; setFormData: (d: typeof emptyForm) => void;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void;
  contacts: Contact[]; contactSearch: string; setContactSearch: (s: string) => void;
  showContactPicker: boolean; setShowContactPicker: (b: boolean) => void;
  filteredContacts: Contact[]; selectContact: (c: Contact) => void;
  participants: UserProfile[]; recipientSearch: string; setRecipientSearch: (s: string) => void;
  recipientResults: UserProfile[]; searchingRecipients: boolean;
  onAddParticipant: (u: UserProfile) => void; onRemoveParticipant: (id: string) => void;
  onNextFromRecipients: () => void;
  showExternalForm: boolean; setShowExternalForm: (b: boolean) => void;
  externalDraft: { name: string; email: string; phone: string };
  setExternalDraft: (d: { name: string; email: string; phone: string }) => void;
  savedContacts: Set<string>;
  confirmDuplicate: { participant: UserProfile; existing: Contact } | null;
  onSaveParticipant: (p: UserProfile) => void;
  onConfirmDuplicate: () => void;
  onCancelDuplicate: () => void;
  selectedDuration: number; setSelectedDuration: (d: number) => void;
  showCreateType: boolean; setShowCreateType: (b: boolean) => void;
  newTypeName: string; setNewTypeName: (s: string) => void;
  newTypeColor: string; setNewTypeColor: (s: string) => void;
  creatingType: boolean; onCreateType: () => void;
  currentUser: UserProfile | null;
  googleAccounts: Record<string, string>;
}) {
  const [pickedTime, setPickedTime] = useState("");

  return (
    <div className="premium-panel overflow-hidden rounded-[2rem]">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-foreground/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5"><CalendarDays className="h-4 w-4 text-primary" /></div>
          <h3 className="text-[15px] font-semibold">Nouveau RDV</h3>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {step !== "confirmation" && (
          <div className="flex items-center justify-center gap-1">
            {stepLabels.map((label, i) => {
              const isActive = stepIndex === i; const isPast = stepIndex > i;
              return (
                <div key={label} className="flex items-center gap-1">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-xl text-[11px] font-bold transition-all duration-300", isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110" : isPast ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-muted-foreground")}>
                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  {i < 4 && <div className={cn("h-[2px] w-5 rounded-full transition-colors duration-500", isPast ? "bg-primary/40" : "bg-foreground/[0.08]")} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Step: Recipients (multi) */}
        {step === "recipient" && (
          <div className="space-y-3">
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ajoutez les participants</p>

            {/* Pour moi seul */}
            {currentUser && participants.length === 0 && (
              <button
                type="button"
                onClick={() => { onAddParticipant(currentUser); onNextFromRecipients(); }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 py-2.5 text-[13px] font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
              >
                <User className="h-4 w-4" /> Pour moi seul
              </button>
            )}
            
            {/* Added participants */}
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <div key={p.id} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium ${p.has_account ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.has_account ? <UserCheck className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
                    <span className="truncate max-w-[120px]">{p.full_name}</span>
                    <button onClick={() => onRemoveParticipant(p.id)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Rechercher par nom, email, téléphone..." value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} className="w-full glass-input py-2.5 pl-10 pr-4 text-[13px]" />
            </div>
            {searchingRecipients && <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
            {!searchingRecipients && recipientResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recipientResults.map((user) => (
                  <button key={user.id} onClick={() => onAddParticipant(user)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-foreground/[0.04]">
                    <div className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold ${user.has_account ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                      {user.is_close && <Star className="absolute -top-0.5 -right-0.5 h-3 w-3 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold truncate">{user.full_name}</p>
                        {user.has_account ? (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"><UserCheck className="h-2.5 w-2.5" />Inscrit</span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Contact</span>
                        )}
                      </div>
                      {(user.email || user.phone) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {user.email && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground truncate"><Mail className="h-2.5 w-2.5 shrink-0" />{user.email}</span>}
                          {user.phone && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><Phone className="h-2.5 w-2.5 shrink-0" />{user.phone}</span>}
                        </div>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            )}
            {!searchingRecipients && recipientSearch.length >= 2 && recipientResults.length === 0 && (
              <p className="text-center text-[12px] text-muted-foreground py-2">Aucun résultat — Ajouter comme externe ↓</p>
            )}

            {/* External participant form */}
            {!showExternalForm ? (
              <button
                type="button"
                onClick={() => setShowExternalForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/[0.15] px-3 py-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Ajouter un externe
              </button>
            ) : (
              <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Externe (sans compte)</p>
                <input
                  type="text"
                  placeholder="Nom complet *"
                  value={externalDraft.name}
                  onChange={(e) => setExternalDraft({ ...externalDraft, name: e.target.value })}
                  className="glass-input w-full py-2 px-3 text-[13px]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={externalDraft.email}
                  onChange={(e) => setExternalDraft({ ...externalDraft, email: e.target.value })}
                  className="glass-input w-full py-2 px-3 text-[13px]"
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={externalDraft.phone}
                  onChange={(e) => setExternalDraft({ ...externalDraft, phone: e.target.value })}
                  className="glass-input w-full py-2 px-3 text-[13px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowExternalForm(false); setExternalDraft({ name: "", email: "", phone: "" }); }}
                    className="flex-1 rounded-xl bg-foreground/[0.06] py-2 text-[12px] font-medium text-muted-foreground hover:bg-foreground/[0.1] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!externalDraft.name.trim()) return;
                      onAddParticipant({
                        id: crypto.randomUUID(),
                        full_name: externalDraft.name.trim(),
                        avatar_url: null,
                        email: externalDraft.email || null,
                        phone: externalDraft.phone || null,
                        has_account: false,
                        source: "contact",
                      });
                      setExternalDraft({ name: "", email: "", phone: "" });
                      setShowExternalForm(false);
                    }}
                    className="flex-1 rounded-xl bg-primary py-2 text-[12px] font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {participants.length > 0 && (
              <button onClick={onNextFromRecipients} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl">
                Continuer avec {participants.length} participant{participants.length > 1 ? "s" : ""} <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Step: Type */}
        {step === "type" && (
          <div className="space-y-2">
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mb-2">
                {participants.map((p) => (
                  <span key={p.id} className="rounded-lg bg-foreground/[0.04] px-2 py-1 text-[11px] font-medium">{p.full_name?.split(" ")[0]}</span>
                ))}
              </div>
            )}
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Choisissez un type</p>
            {types.length === 0 && !showCreateType ? (
              <div className="flex flex-col items-center gap-3 py-10"><CalendarDays className="h-9 w-9 text-muted-foreground/40" /><p className="text-[13px] text-muted-foreground">Aucun type disponible.</p></div>
            ) : !showCreateType ? (
              <div className="space-y-2">
                {types.map((type) => (
                  <button key={type.id} onClick={() => { setSelectedType(type); setStep("date"); }} className="group w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all duration-300 hover:bg-foreground/[0.04]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)` }}><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold">{type.name}</p>
                      {type.google_token_id && googleAccounts[type.google_token_id] && (
                        <p className="text-[10px] text-muted-foreground truncate">{googleAccounts[type.google_token_id]}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Inline create type */}
            {showCreateType ? (
              <div className="space-y-3 rounded-2xl bg-foreground/[0.03] p-4">
                <p className="text-[12px] font-semibold text-center">Nouveau type</p>
                <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nom du type" className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">Couleur</span>
                  <input type="color" value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} className="h-7 w-7 rounded-lg border-0 cursor-pointer" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateType(false)} className="flex-1 rounded-xl bg-foreground/[0.06] py-2 text-[12px] font-medium text-muted-foreground hover:bg-foreground/[0.1]">Annuler</button>
                  <button onClick={onCreateType} disabled={!newTypeName.trim() || creatingType} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                    {creatingType ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Créer
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreateType(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/10 py-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
                <Plus className="h-4 w-4" /> Créer un type
              </button>
            )}

            {/* Duration selector */}
            {selectedType && (
              <div className="space-y-2 pt-2">
                <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Durée</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <button key={d} onClick={() => setSelectedDuration(d)} className={cn("rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all", selectedDuration === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.1]")}>
                      {d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? (d % 60).toString().padStart(2, "0") : ""}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setStep("recipient")} className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
          </div>
        )}

        {/* Step: Date */}
        {step === "date" && (
          <div className="space-y-3">
            {selectedType && (
              <div className="flex w-fit mx-auto items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                <span className="text-[12px] font-medium">{selectedType.name}</span>
              </div>
            )}
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Choisissez une date</p>
            <div className="flex justify-center"><Calendar mode="single" selected={selectedDate} onSelect={onDateSelect} disabled={{ before: new Date() }} locale={fr} className="rounded-2xl" /></div>
            <button onClick={() => setStep("type")} className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
          </div>
        )}

        {/* Step: Slot (with busy indicators) */}
        {step === "slot" && (
          <div className="space-y-4">
            {/* Time picker */}
            <div>
              <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Heure de début</p>
              <div className="flex flex-col items-center gap-1">
                <input
                  type="time"
                  value={pickedTime}
                  onChange={(e) => setPickedTime(e.target.value)}
                  className="glass-input text-center text-2xl font-bold py-3 px-6 rounded-2xl w-full max-w-[180px]"
                />
                {selectedDate && (
                  <p className="text-[11px] text-muted-foreground">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</p>
                )}
              </div>
            </div>

            {/* Duration picker */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Durée</p>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60, 90, 120, 180, 240].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDuration(d)}
                    className={cn(
                      "rounded-xl py-2 text-[12px] font-semibold transition-all",
                      selectedDuration === d
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-foreground/[0.04] hover:bg-foreground/[0.08]"
                    )}
                  >
                    {d < 60 ? `${d}min` : `${Math.floor(d / 60)}h${d % 60 ? d % 60 : ""}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict indicator */}
            {pickedTime && slots.length > 0 && (() => {
              const matched = slots.find((s) => format(new Date(s.time), "HH:mm") === pickedTime);
              return matched && !matched.available ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Un participant pourrait ne pas être disponible à cette heure.
                </div>
              ) : null;
            })()}

            <button
              type="button"
              disabled={!pickedTime}
              onClick={() => {
                if (!pickedTime || !selectedDate) return;
                const [h, m] = pickedTime.split(":").map(Number);
                const dt = new Date(selectedDate);
                dt.setHours(h, m, 0, 0);
                setSelectedSlot(dt.toISOString());
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmer <ChevronRight className="h-4 w-4" />
            </button>

            <button onClick={() => setStep("date")} className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && (
          <form onSubmit={onSubmit} className="space-y-3">
            {participants.length > 0 ? (
              /* Participants already added at step 1 — show recap only */
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Participants</p>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p) => (
                    <div key={p.id} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium ${p.has_account ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.has_account ? <UserCheck className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
                      <span className="truncate max-w-[120px]">{p.full_name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-muted-foreground">Les coordonnées ont déjà été renseignées à l&apos;étape précédente.</p>
              </div>
            ) : (
              /* No participants yet — classic form with name/email/phone */
              <>
                {contacts.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowContactPicker(!showContactPicker)} className="flex w-full items-center gap-2 rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
                      <Users className="h-4 w-4" />Remplir depuis un contact
                    </button>
                    {showContactPicker && (
                      <div className="mt-2 rounded-xl border border-foreground/[0.06] bg-card p-2 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input type="text" placeholder="Rechercher..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="w-full rounded-lg bg-foreground/[0.04] py-2 pl-8 pr-3 text-[12px]" />
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-0.5">
                          {filteredContacts.slice(0, 10).map((c) => (
                            <button key={c.id} type="button" onClick={() => selectContact(c)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-foreground/[0.04]">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{c.first_name.charAt(0)}</div>
                              <span className="font-medium truncate">{c.first_name} {c.last_name || ""}</span>
                              {c.is_close && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1"><label className="text-[11px] font-medium text-muted-foreground">Nom *</label>
                  <div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input required value={formData.guest_name} onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })} className="glass-input w-full py-2.5 pl-10 pr-4 text-[13px]" placeholder="Prénom Nom" /></div>
                </div>
                <div className="space-y-1"><label className="text-[11px] font-medium text-muted-foreground">Email *</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input required type="email" value={formData.guest_email} onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })} className="glass-input w-full py-2.5 pl-10 pr-4 text-[13px]" placeholder="email@exemple.com" /></div>
                </div>
                <div className="space-y-1"><label className="text-[11px] font-medium text-muted-foreground">Téléphone</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={formData.guest_phone} onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })} className="glass-input w-full py-2.5 pl-10 pr-4 text-[13px]" placeholder="+33 6 12 34 56 78" /></div>
                </div>
              </>
            )}
            <div className="space-y-1"><label className="text-[11px] font-medium text-muted-foreground">Message</label>
              <div className="relative"><MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="glass-input w-full py-2.5 pl-10 pr-4 text-[13px] min-h-[70px] resize-none" placeholder="Infos complémentaires..." /></div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] px-3 py-2.5">
              <span className="text-[12px] font-medium text-muted-foreground">Envoyer un rappel</span>
              <button type="button" onClick={() => setFormData({ ...formData, notify_on_event: !formData.notify_on_event })} className={cn("relative h-6 w-11 rounded-full transition-colors", formData.notify_on_event ? "bg-primary" : "bg-foreground/20")}>
                <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", formData.notify_on_event && "translate-x-5")} />
              </button>
            </div>
            {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep("slot")} className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.06] px-3 py-2.5 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
              <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Confirmer</>}
              </button>
            </div>
          </form>
        )}

        {/* Step: Confirmation */}
        {step === "confirmation" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-500/15"><CheckCircle2 className="h-8 w-8 text-green-500" /></div>
            <div>
              <p className="text-[16px] font-bold">RDV créé !</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Les participants ont été notifiés.</p>
            </div>

            {/* Save external participants to annuaire */}
            {participants.filter((p) => !p.has_account).length > 0 && (
              <div className="w-full space-y-2 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Sauvegarder dans l&apos;annuaire</p>
                {participants.filter((p) => !p.has_account).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-foreground/[0.04] px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{p.full_name}</p>
                        {p.email && <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>}
                      </div>
                    </div>
                    {savedContacts.has(p.id) ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Ajouté
                      </span>
                    ) : (
                      <button
                        onClick={() => onSaveParticipant(p)}
                        className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        Sauvegarder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Duplicate detection dialog */}
            {confirmDuplicate && (
              <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 text-left">
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">Un contact similaire existe déjà :</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-600">
                    {confirmDuplicate.existing.first_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold">{confirmDuplicate.existing.first_name} {confirmDuplicate.existing.last_name || ""}</p>
                    {confirmDuplicate.existing.email && <p className="text-[11px] text-muted-foreground">{confirmDuplicate.existing.email}</p>}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Ajouter quand même ?</p>
                <div className="flex gap-2">
                  <button onClick={onCancelDuplicate} className="flex-1 rounded-xl bg-foreground/[0.06] py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.1]">Annuler</button>
                  <button onClick={onConfirmDuplicate} className="flex-1 rounded-xl bg-primary py-2 text-[12px] font-semibold text-primary-foreground">Ajouter</button>
                </div>
              </div>
            )}

            <button onClick={onClose} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25">Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Appointment Detail (multi-participants)
   ═══════════════════════════════════════════════════════ */
function AppointmentDetail({
  appointment: apt, currentUserId, isAdmin, isLoading, onAccept, onDecline, onCancel, onClose,
}: {
  appointment: Appointment;
  currentUserId?: string;
  isAdmin: boolean;
  isLoading: boolean;
  onAccept: (participantId: string, typeId?: string) => void;
  onDecline: (participantId: string) => void;
  onCancel: (aptId: string) => void;
  onClose: () => void;
}) {
  const config = statusConfig[apt.status] || statusConfig.pending;
  const myType = getMyType(apt, currentUserId);
  const myPart = getMyParticipant(apt, currentUserId);
  const isCreator = currentUserId === apt.requester_id;
  const participants = apt.appointment_participants || [];

  // Type picker for accepting
  const [myTypes, setMyTypes] = useState<AppointmentType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const loadMyTypes = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/appointments/types?user_id=${currentUserId}`);
      if (res.ok) setMyTypes(await res.json());
    } catch { /* */ }
    setLoadingTypes(false);
    setShowTypePicker(true);
  }, [currentUserId]);

  const handleAccept = () => {
    if (!myPart) return;
    onAccept(myPart.id, selectedTypeId || undefined);
  };

  return (
    <div className="premium-panel overflow-hidden rounded-[2rem]">
      {/* Header */}
      <div className="relative p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${myType.color}22, ${myType.color}08)` }}>
        <button onClick={onClose} className="absolute left-4 top-4 flex items-center gap-1.5 rounded-xl px-2 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors lg:hidden">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <button onClick={onClose} className="absolute right-4 top-4 hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors">
          <XCircle className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 mb-3 mt-6 lg:mt-0">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: myType.color }} />
          <span className="text-[13px] font-semibold" style={{ color: myType.color }}>{myType.name}</span>
          {apt.is_close_contact && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
        </div>
        <h3 className="text-xl font-bold">{apt.guest_name}</h3>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <div className={cn("inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1", config.bg)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            <span className={cn("text-[12px] font-medium", config.color)}>{config.label}</span>
          </div>
          {apt.google_event_id && (
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1",
              apt.google_sync_status === "synced" ? "bg-blue-500/10" : apt.google_sync_status === "error" ? "bg-red-500/10" : "bg-gray-500/10"
            )}>
              <svg className={cn("h-3 w-3", apt.google_sync_status === "synced" ? "text-blue-500" : apt.google_sync_status === "error" ? "text-red-500" : "text-gray-500")} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm-1.177 18.003l-.07-.003c-.93 0-1.81-.373-2.463-1.036l-3.14-3.203 1.458-1.428 3.14 3.203c.56.571 1.51.577 2.076.013l6.842-6.797 1.42 1.442-6.842 6.797a2.951 2.951 0 01-2.421 1.012z"/></svg>
              <span className={cn("text-[11px] font-medium", apt.google_sync_status === "synced" ? "text-blue-600 dark:text-blue-400" : apt.google_sync_status === "error" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400")}>
                {apt.google_sync_status === "synced" ? "Google sync" : apt.google_sync_status === "error" ? "Erreur sync" : "En attente"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* Date & Time */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10"><CalendarDays className="h-4 w-4 text-blue-500" /></div>
          <div>
            <p className="text-[13px] font-medium">{format(new Date(apt.start_at), "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-[12px] text-muted-foreground">{format(new Date(apt.start_at), "HH:mm")} — {format(new Date(apt.end_at), "HH:mm")} · {Math.round((new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()) / 60000)} min</p>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Participants ({participants.length})</p>
          <div className="space-y-1.5">
            {participants.map((p) => {
              const statusIcon = p.status === "accepted" ? <UserCheck className="h-3.5 w-3.5 text-green-500" /> : p.status === "declined" ? <UserX className="h-3.5 w-3.5 text-red-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />;
              const statusLabel = p.status === "accepted" ? "Accepté" : p.status === "declined" ? "Décliné" : "En attente";
              return (
                <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-foreground/[0.03] px-3 py-2">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold", p.is_organizer ? "bg-primary/15 text-primary" : "bg-foreground/[0.08] text-muted-foreground")}>
                    {p.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-semibold truncate">{p.name}</p>
                      {p.is_organizer && <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded px-1 py-0.5">Organisateur</span>}
                      {p.is_close_contact && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                    </div>
                    {p.participant_type && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.participant_type.color }} />
                        <span className="text-[10px]" style={{ color: p.participant_type.color }}>{p.participant_type.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {statusIcon}
                    <span className="text-[10px] font-medium text-muted-foreground">{statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.04]"><Mail className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0"><p className="text-[13px] truncate">{apt.guest_email}</p></div>
            <button onClick={() => navigator.clipboard.writeText(apt.guest_email)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          {apt.guest_phone && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.04]"><Phone className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1"><p className="text-[13px]">{apt.guest_phone}</p></div>
              <button onClick={() => navigator.clipboard.writeText(apt.guest_phone!)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>

        {/* Message */}
        {apt.message && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Message</p>
            <div className="rounded-2xl bg-foreground/[0.03] p-3 sm:p-4"><p className="text-[13px] leading-relaxed whitespace-pre-wrap">{apt.message}</p></div>
          </div>
        )}

        <div className="rounded-2xl bg-foreground/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">
            Créé par {apt.creator?.full_name || "inconnu"} le {format(new Date(apt.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>

        {/* Actions: Répondre si participant pending */}
        {myPart && !myPart.is_organizer && myPart.status === "pending" && apt.status !== "cancelled" && !showTypePicker && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Répondre à l&apos;invitation</p>
            <div className="flex gap-2">
              <button onClick={loadMyTypes} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-xl disabled:opacity-50">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Je participe
              </button>
              <button onClick={() => myPart && onDecline(myPart.id)} disabled={isLoading} className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Pas dispo
              </button>
            </div>
          </div>
        )}

        {/* Type picker when accepting */}
        {showTypePicker && myPart && (
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Choisissez votre type pour ce RDV</p>
            {loadingTypes ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : myTypes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[12px] text-muted-foreground">Aucun type configuré.</p>
                <button onClick={handleAccept} disabled={isLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-green-500/25 disabled:opacity-50">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirmer sans type
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {myTypes.map((type) => (
                    <button key={type.id} onClick={() => setSelectedTypeId(type.id)} className={cn("flex w-full items-center gap-3 rounded-xl p-2.5 transition-all", selectedTypeId === type.id ? "bg-primary/10 ring-2 ring-primary/30 ring-inset" : "hover:bg-foreground/[0.04]")}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)` }}>
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color }} />
                      </div>
                      <div className="flex-1 text-left"><p className="text-[13px] font-semibold">{type.name}</p></div>
                      {selectedTypeId === type.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowTypePicker(false)} className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.06] px-3 py-2.5 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
                  <button onClick={handleAccept} disabled={isLoading || !selectedTypeId} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-green-500/25 disabled:opacity-50">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Je participe
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Already responded */}
        {myPart && !myPart.is_organizer && myPart.status === "accepted" && apt.status !== "cancelled" && (
          <div className="flex items-center gap-2 rounded-2xl bg-green-500/10 p-3 mt-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-[12px] font-medium text-green-700 dark:text-green-400">Vous avez accepté ce rendez-vous.</p>
          </div>
        )}
        {myPart && !myPart.is_organizer && myPart.status === "declined" && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 p-3 mt-2">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-[12px] font-medium text-red-700 dark:text-red-400">Vous avez décliné ce rendez-vous.</p>
          </div>
        )}

        {/* Cancel (creator only) */}
        {(isCreator || isAdmin) && apt.status !== "cancelled" && (
          <div className="pt-2 border-t border-foreground/[0.06]">
            <button onClick={() => onCancel(apt.id)} disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-2.5 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-50">
              <XCircle className="h-4 w-4" /> Annuler le RDV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
