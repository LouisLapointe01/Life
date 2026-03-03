"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    CalendarDays,
    Clock,
    User,
    Mail,
    Phone,
    MessageSquare,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    ChevronRight,
    Sparkles,
    Users,
    Search,
    X,
    UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserProfile = {
    id: string;
    full_name: string;
    avatar_url: string | null;
};

type Contact = {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    is_close: boolean;
};

type AppointmentType = {
    id: string;
    name: string;
    duration_min: number;
    color: string;
};

type Step = "recipient" | "type" | "date" | "slot" | "form" | "confirmation";

const stepLabels = ["Destinataire", "Type", "Date", "Créneau", "Infos"];

export default function RdvPage() {
    const [step, setStep] = useState<Step>("recipient");
    const [types, setTypes] = useState<AppointmentType[]>([]);
    const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        message: "",
    });

    // User selection
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [recipientResults, setRecipientResults] = useState<UserProfile[]>([]);
    const [searchingRecipients, setSearchingRecipients] = useState(false);
    const [emailSearch, setEmailSearch] = useState("");

    // Contact picker (admin)
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactSearch, setContactSearch] = useState("");
    const [showContactPicker, setShowContactPicker] = useState(false);

    const stepIndex = (["recipient", "type", "date", "slot", "form"] as const).indexOf(
        step as "recipient" | "type" | "date" | "slot" | "form"
    );

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("appointment_types")
            .select("*")
            .eq("is_active", true)
            .order("sort_order")
            .then(({ data }) => {
                if (data) setTypes(data);
            });

        async function loadUserData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setIsLoggedIn(true);

            setFormData((d) => ({
                ...d,
                guest_name: user.user_metadata?.full_name || "",
                guest_email: user.email || "",
            }));

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            if (profile?.role === "admin") {
                setIsAdmin(true);
                const { data: contactsData } = await supabase
                    .from("contacts")
                    .select("id, first_name, last_name, email, phone, is_close")
                    .order("first_name");
                if (contactsData) setContacts(contactsData);
            }
        }
        loadUserData();
    }, []);

    // Search recipients by name (logged-in users)
    const searchByName = useCallback(async (q: string) => {
        if (q.length < 2) { setRecipientResults([]); return; }
        setSearchingRecipients(true);
        try {
            const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(q)}&mode=name`);
            const data = await res.json();
            setRecipientResults(data.users || []);
        } catch {
            setRecipientResults([]);
        } finally {
            setSearchingRecipients(false);
        }
    }, []);

    // Search recipients by email (visitors)
    const searchByEmail = useCallback(async (email: string) => {
        if (email.length < 3) { setRecipientResults([]); return; }
        setSearchingRecipients(true);
        try {
            const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(email)}&mode=email`);
            const data = await res.json();
            setRecipientResults(data.users || []);
        } catch {
            setRecipientResults([]);
        } finally {
            setSearchingRecipients(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoggedIn) {
                searchByName(recipientSearch);
            } else {
                searchByEmail(emailSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [recipientSearch, emailSearch, isLoggedIn, searchByName, searchByEmail]);

    const fetchSlots = useCallback(async (date: Date, typeId: string) => {
        setLoadingSlots(true);
        setSlots([]);
        setSelectedSlot(null);
        try {
            const dateStr = format(date, "yyyy-MM-dd");
            const res = await fetch(`/api/appointments/available?date=${dateStr}&type_id=${typeId}`);
            const data = await res.json();
            setSlots(data.slots || []);
        } catch {
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, []);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date || !selectedType) return;
        setSelectedDate(date);
        fetchSlots(date, selectedType.id);
        setStep("slot");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType || !selectedSlot) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type_id: selectedType.id,
                    start_at: selectedSlot,
                    recipient_id: selectedRecipient?.id,
                    ...formData,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Une erreur est survenue");
                return;
            }

            setStep("confirmation");
        } catch {
            setError("Erreur de connexion");
        } finally {
            setSubmitting(false);
        }
    };

    const disabledDays = { before: new Date() };

    // Shared input class for the colored gradient background
    const inputClass = "w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20";

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ─── Header ─── */}
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl border border-white/30 shadow-xl">
                    <CalendarDays className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Prendre rendez-vous
                </h1>
                <p className="mt-2 text-[13px] sm:text-[14px] text-white/60 max-w-md mx-auto">
                    Choisissez un destinataire, un type de rendez-vous, une date et un créneau.
                </p>
            </div>

            {/* ─── Step Indicator ─── */}
            {step !== "confirmation" && (
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 overflow-x-auto px-2">
                    {stepLabels.map((label, i) => {
                        const isActive = stepIndex === i;
                        const isPast = stepIndex > i;
                        return (
                            <div key={label} className="flex items-center gap-0.5 sm:gap-1">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl text-[12px] sm:text-[13px] font-bold transition-all duration-300",
                                        isActive
                                            ? "bg-white text-[#185A9D] shadow-lg shadow-white/25 scale-110"
                                            : isPast
                                                ? "bg-white/25 text-white"
                                                : "bg-white/10 text-white/50"
                                    )}
                                >
                                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : i + 1}
                                </div>
                                {i < 4 && (
                                    <div
                                        className={cn(
                                            "h-[2px] w-4 sm:w-8 rounded-full transition-colors duration-500",
                                            isPast ? "bg-white/40" : "bg-white/10"
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Step 0: Recipient Selection ─── */}
            {step === "recipient" && (
                <div className="space-y-4 animate-slide-up">
                    <p className="text-center text-[12px] font-semibold uppercase tracking-widest text-white/60">
                        Avec qui souhaitez-vous prendre rendez-vous ?
                    </p>

                    <div className="glass-surface overflow-hidden">
                        <div className="p-4 sm:p-6">
                            {/* Mode info for visitors */}
                            {!isLoggedIn && (
                                <div className="mb-5">
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                                        <Mail className="h-5 w-5 text-white/70 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[14px] font-semibold text-white">Recherche par email</p>
                                            <p className="text-[12px] text-white/50 mt-0.5">
                                                Entrez l&apos;adresse email de la personne avec qui vous souhaitez prendre rendez-vous.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoggedIn && (
                                <div className="mb-5">
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                                        <Users className="h-5 w-5 text-white/70 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[14px] font-semibold text-white">Recherche par nom</p>
                                            <p className="text-[12px] text-white/50 mt-0.5">
                                                Tapez le nom ou prénom de la personne.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search input */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                {isLoggedIn ? (
                                    <input
                                        value={recipientSearch}
                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                        placeholder="Rechercher par nom ou prénom..."
                                        className={cn(inputClass, "pl-10")}
                                    />
                                ) : (
                                    <input
                                        type="email"
                                        value={emailSearch}
                                        onChange={(e) => setEmailSearch(e.target.value)}
                                        placeholder="email@exemple.com"
                                        className={cn(inputClass, "pl-10")}
                                    />
                                )}
                            </div>

                            {/* Loading */}
                            {searchingRecipients && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                </div>
                            )}

                            {/* Results */}
                            {!searchingRecipients && recipientResults.length > 0 && (
                                <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                                    {recipientResults.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedRecipient(user);
                                                setStep("type");
                                            }}
                                            className="flex w-full items-center gap-3 rounded-2xl px-3 sm:px-4 py-3 text-left transition-all hover:bg-white/10 hover:-translate-y-0.5"
                                        >
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.full_name}
                                                    className="h-10 w-10 rounded-full ring-2 ring-white/20 object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-[14px] font-bold text-white">
                                                    {user.full_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-semibold text-white truncate">{user.full_name}</p>
                                                <p className="text-[12px] text-white/50">Prendre rendez-vous</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-white/30" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No results */}
                            {!searchingRecipients &&
                                ((isLoggedIn && recipientSearch.length >= 2) || (!isLoggedIn && emailSearch.length >= 3)) &&
                                recipientResults.length === 0 && (
                                    <div className="mt-6 flex flex-col items-center gap-2 py-6">
                                        <Users className="h-10 w-10 text-white/25" />
                                        <p className="text-[14px] text-white/50">Aucun utilisateur trouvé.</p>
                                        {!isLoggedIn && (
                                            <p className="text-[12px] text-white/35">
                                                Vérifiez l&apos;adresse email et réessayez.
                                            </p>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Step 1: Type ─── */}
            {step === "type" && (
                <div className="space-y-3 animate-slide-up">
                    {selectedRecipient && (
                        <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-4 py-2">
                            <UserCheck className="h-4 w-4 text-white" />
                            <span className="text-[13px] font-medium text-white">{selectedRecipient.full_name}</span>
                        </div>
                    )}

                    <p className="text-center text-[12px] font-semibold uppercase tracking-widest text-white/60">
                        Choisissez un type
                    </p>

                    {types.length === 0 ? (
                        <div className="glass-surface flex flex-col items-center gap-3 py-16">
                            <CalendarDays className="h-12 w-12 text-white/25" />
                            <p className="text-[14px] text-white/50">Aucun type disponible pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {types.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => { setSelectedType(type); setStep("date"); }}
                                    className="group glass-surface flex items-center gap-4 p-4 sm:p-5 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    <div
                                        className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl"
                                        style={{ background: `linear-gradient(135deg, ${type.color}50, ${type.color}20)` }}
                                    >
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[14px] sm:text-[15px] font-semibold text-white">{type.name}</p>
                                        <p className="text-[12px] text-white/50">{type.duration_min} minutes</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => { setStep("recipient"); setSelectedType(null); }}
                        className="flex items-center gap-2 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" /> Changer de destinataire
                    </button>
                </div>
            )}

            {/* ─── Step 2: Date ─── */}
            {step === "date" && (
                <div className="space-y-4 animate-slide-up">
                    <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
                        {selectedRecipient && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-3 py-1.5">
                                <UserCheck className="h-3 w-3 text-white" />
                                <span className="text-[12px] font-medium text-white">{selectedRecipient.full_name}</span>
                            </div>
                        )}
                        {selectedType && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedType.color }} />
                                <span className="text-[13px] font-medium text-white">{selectedType.name}</span>
                                <span className="text-[12px] text-white/50">· {selectedType.duration_min} min</span>
                            </div>
                        )}
                    </div>

                    <div className="glass-surface overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <p className="mb-4 text-center text-[12px] font-semibold uppercase tracking-widest text-white/60">
                                Choisissez une date
                            </p>
                            <div className="flex justify-center [&_.rdp]:text-white [&_.rdp-day]:text-white [&_.rdp-head_th]:text-white/50 [&_.rdp-nav_button]:text-white [&_.rdp-caption]:text-white [&_.rdp-day_selected]:bg-white [&_.rdp-day_selected]:text-[#185A9D] [&_.rdp-day_today]:bg-white/20">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    disabled={disabledDays}
                                    locale={fr}
                                    className="rounded-2xl"
                                />
                            </div>
                        </div>
                        <div className="border-t border-white/10 px-4 sm:px-6 py-4">
                            <button
                                onClick={() => { setStep("type"); setSelectedType(null); }}
                                className="flex items-center gap-2 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" /> Retour
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Step 3: Slot ─── */}
            {step === "slot" && (
                <div className="space-y-4 animate-slide-up">
                    <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
                        {selectedRecipient && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-3 py-1.5">
                                <UserCheck className="h-3 w-3 text-white" />
                                <span className="text-[12px] font-medium text-white">{selectedRecipient.full_name}</span>
                            </div>
                        )}
                        {selectedType && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-3 py-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                                <span className="text-[12px] font-medium text-white">{selectedType.name}</span>
                            </div>
                        )}
                        {selectedDate && (
                            <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 border border-white/15 px-3 py-1.5">
                                <CalendarDays className="h-3 w-3 text-white/60" />
                                <span className="text-[12px] font-medium text-white">{format(selectedDate, "d MMMM yyyy", { locale: fr })}</span>
                            </div>
                        )}
                    </div>

                    <div className="glass-surface overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <p className="mb-5 text-center text-[12px] font-semibold uppercase tracking-widest text-white/60">
                                Créneaux disponibles
                            </p>
                            {loadingSlots ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                                </div>
                            ) : slots.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-12">
                                    <Clock className="h-10 w-10 text-white/25" />
                                    <p className="text-[14px] text-white/50">Aucun créneau disponible pour cette date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => { setSelectedSlot(slot); setStep("form"); }}
                                            className="rounded-2xl bg-white/10 border border-white/15 px-3 py-3 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-white hover:text-[#185A9D] hover:shadow-lg hover:shadow-white/20 hover:-translate-y-0.5"
                                        >
                                            {format(new Date(slot), "HH:mm")}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-white/10 px-4 sm:px-6 py-4">
                            <button
                                onClick={() => { setStep("date"); setSelectedSlot(null); }}
                                className="flex items-center gap-2 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" /> Retour
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Step 4: Form ─── */}
            {step === "form" && (
                <div className="space-y-4 animate-slide-up">
                    {/* Recap pills */}
                    <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
                        {selectedRecipient && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-3 py-1.5">
                                <UserCheck className="h-3 w-3 text-white" />
                                <span className="text-[12px] font-medium text-white">{selectedRecipient.full_name}</span>
                            </div>
                        )}
                        {selectedType && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-3 py-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                                <span className="text-[12px] font-medium text-white">{selectedType.name}</span>
                            </div>
                        )}
                        {selectedDate && (
                            <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 border border-white/15 px-3 py-1.5">
                                <CalendarDays className="h-3 w-3 text-white/60" />
                                <span className="text-[12px] font-medium text-white">{format(selectedDate, "d MMMM", { locale: fr })}</span>
                            </div>
                        )}
                        {selectedSlot && (
                            <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 border border-white/15 px-3 py-1.5">
                                <Clock className="h-3 w-3 text-white/60" />
                                <span className="text-[12px] font-medium text-white">{format(new Date(selectedSlot), "HH:mm")}</span>
                            </div>
                        )}
                    </div>

                    {/* Contact picker (admin only) */}
                    {isAdmin && contacts.length > 0 && (
                        <div className="glass-surface overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[12px] font-semibold uppercase tracking-widest text-white/60">
                                        Choisir depuis l&apos;annuaire
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowContactPicker(!showContactPicker)}
                                        className="flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/20 px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-white/25"
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        {showContactPicker ? "Masquer" : "Ouvrir"}
                                    </button>
                                </div>

                                {showContactPicker && (
                                    <div className="space-y-3 animate-slide-up">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                                            <input
                                                value={contactSearch}
                                                onChange={(e) => setContactSearch(e.target.value)}
                                                placeholder="Rechercher un contact..."
                                                className={cn(inputClass, "py-2.5 pl-9 text-[13px]")}
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                                            {contacts
                                                .filter((c) => {
                                                    const q = contactSearch.toLowerCase();
                                                    return !q || c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
                                                })
                                                .map((contact) => (
                                                    <button
                                                        key={contact.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                guest_name: `${contact.first_name} ${contact.last_name ?? ""}`.trim(),
                                                                guest_email: contact.email ?? "",
                                                                guest_phone: contact.phone ?? "",
                                                                message: formData.message,
                                                            });
                                                            setShowContactPicker(false);
                                                            setContactSearch("");
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                                                    >
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-bold text-white">
                                                            {contact.first_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-semibold text-white truncate">
                                                                {contact.first_name} {contact.last_name ?? ""}
                                                                {contact.is_close && <span className="ml-1.5 text-[10px] text-amber-300">⭐</span>}
                                                            </p>
                                                            {contact.email && <p className="text-[11px] text-white/40 truncate">{contact.email}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {formData.guest_name && (
                                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[12px] font-bold text-white">
                                            {formData.guest_name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="flex-1 text-[13px] font-medium text-white truncate">{formData.guest_name}</p>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ guest_name: "", guest_email: "", guest_phone: "", message: formData.message })}
                                            className="text-white/40 hover:text-white transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="glass-surface overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <p className="mb-5 text-center text-[12px] font-semibold uppercase tracking-widest text-white/60">
                                Vos informations
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                                        <User className="h-3.5 w-3.5 text-white/50" />
                                        Nom complet <span className="text-red-300">*</span>
                                    </label>
                                    <input
                                        required
                                        value={formData.guest_name}
                                        onChange={(e) => setFormData((d) => ({ ...d, guest_name: e.target.value }))}
                                        placeholder="Jean Dupont"
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                                        <Mail className="h-3.5 w-3.5 text-white/50" />
                                        Email <span className="text-red-300">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.guest_email}
                                        onChange={(e) => setFormData((d) => ({ ...d, guest_email: e.target.value }))}
                                        placeholder="jean@exemple.com"
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                                        <Phone className="h-3.5 w-3.5 text-white/50" />
                                        Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.guest_phone}
                                        onChange={(e) => setFormData((d) => ({ ...d, guest_phone: e.target.value }))}
                                        placeholder="+33 6 12 34 56 78"
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                                        <MessageSquare className="h-3.5 w-3.5 text-white/50" />
                                        Message
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData((d) => ({ ...d, message: e.target.value }))}
                                        placeholder="Détails supplémentaires..."
                                        rows={3}
                                        className={cn(inputClass, "resize-none")}
                                    />
                                </div>

                                {error && (
                                    <div className="rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 px-4 py-3 text-[13px] text-red-100 font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep("slot")}
                                        className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 sm:px-5 py-3 text-[13px] font-medium text-white/70 transition-all hover:bg-white/20 hover:text-white"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span className="hidden sm:inline">Retour</span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-semibold text-[#185A9D] shadow-xl shadow-black/10 transition-all hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Réserver</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Confirmation ─── */}
            {step === "confirmation" && (
                <div className="animate-slide-up">
                    <div className="glass-surface flex flex-col items-center gap-5 py-10 sm:py-14 px-6 sm:px-8 text-center">
                        <div className="relative">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-green-400/30 to-green-500/20 border border-green-400/30">
                                <CheckCircle2 className="h-10 w-10 text-green-300" />
                            </div>
                            <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-400 text-white shadow-lg shadow-green-400/30">
                                <Sparkles className="h-3.5 w-3.5" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">Rendez-vous réservé !</h2>
                            <p className="mt-2 text-[13px] sm:text-[14px] text-white/60 max-w-[340px]">
                                Votre demande a bien été envoyée
                                {selectedRecipient && (
                                    <> à <span className="font-semibold text-white">{selectedRecipient.full_name}</span></>
                                )}
                                . Vous recevrez une confirmation prochainement.
                            </p>
                        </div>

                        {selectedType && selectedDate && selectedSlot && (
                            <div className="w-full max-w-xs rounded-2xl bg-white/10 border border-white/15 p-5 space-y-2">
                                {selectedRecipient && (
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <UserCheck className="h-4 w-4 text-white" />
                                        <span className="text-[14px] font-semibold text-white">{selectedRecipient.full_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedType.color }} />
                                    <span className="text-[14px] font-semibold text-white">{selectedType.name}</span>
                                </div>
                                <p className="text-[13px] text-white/60">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })} à {format(new Date(selectedSlot), "HH:mm")}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setStep("recipient");
                                setSelectedType(null);
                                setSelectedDate(undefined);
                                setSelectedSlot(null);
                                setSelectedRecipient(null);
                                setRecipientSearch("");
                                setEmailSearch("");
                                setFormData({ guest_name: "", guest_email: "", guest_phone: "", message: "" });
                            }}
                            className="mt-2 rounded-2xl bg-white/15 border border-white/20 px-6 py-3 text-[13px] font-medium text-white transition-all hover:bg-white/25"
                        >
                            Prendre un autre rendez-vous
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
