"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Search,
  Star,
  Mail,
  Phone,
  FileText,
  Loader2,
  Trash2,
  Pencil,
  Users,
  X,
  Copy,
  Tag,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Contact = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  is_close: boolean;
  created_at: string;
  updated_at: string;
};

type ContactFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  tags: string;
  is_close: boolean;
};

type UserResult = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  has_account: boolean;
  is_close: boolean;
  avatar_url: string | null;
};

const FORM_INITIAL: ContactFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  notes: "",
  tags: "",
  is_close: false,
};

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

function getInitiale(prenom: string): string {
  return prenom.charAt(0).toUpperCase();
}

function getAvatarColors(prenom: string): { from: string; to: string } {
  const palettes = [
    { from: "#007AFF", to: "#0055CC" },
    { from: "#34C759", to: "#248A3D" },
    { from: "#FF9500", to: "#C97000" },
    { from: "#AF52DE", to: "#7B2FA3" },
    { from: "#FF2D55", to: "#C0001E" },
    { from: "#5AC8FA", to: "#0A84FF" },
    { from: "#FF6B00", to: "#BF4400" },
    { from: "#30D158", to: "#1A7A32" },
  ];
  const idx = prenom.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ═══════════════════════════════════════════════════════
   Page principale
   ═══════════════════════════════════════════════════════ */

export default function AnnuairePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Dialog ajout/modif
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormData>(FORM_INITIAL);
  const [saving, setSaving] = useState(false);

  // Dialog confirmation suppression
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ─── Fetch ─── */
  const fetchContacts = useCallback(async () => {
    const res = await fetch("/api/contacts");
    if (res.ok) {
      const data = await res.json();
      setContacts(data as Contact[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* ─── Recherche filtrée ─── */
  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.first_name.toLowerCase().includes(q) ||
        (c.last_name?.toLowerCase() ?? "").includes(q) ||
        (c.email?.toLowerCase() ?? "").includes(q) ||
        (c.phone ?? "").includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  /* ─── Stats ─── */
  const stats = useMemo(
    () => ({
      total: contacts.length,
      proches: contacts.filter((c) => c.is_close).length,
      avecEmail: contacts.filter((c) => c.is_close && c.email).length,
      avecTel: contacts.filter((c) => c.phone).length,
    }),
    [contacts]
  );

  /* ─── Ouvrir dialog ajout ─── */
  const handleOpenAdd = () => {
    setEditContact(null);
    setForm(FORM_INITIAL);
    setDialogOpen(true);
  };

  /* ─── Ouvrir dialog modification ─── */
  const handleOpenEdit = (contact: Contact) => {
    setEditContact(contact);
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      notes: contact.notes ?? "",
      tags: contact.tags.join(", "),
      is_close: contact.is_close,
    });
    setDialogOpen(true);
  };

  /* ─── Sauvegarde directe depuis la recherche ─── */
  const handleDirectSave = async (user: UserResult) => {
    const parts = user.full_name.trim().split(" ");
    const payload = {
      first_name: parts[0] || user.full_name,
      last_name: parts.slice(1).join(" ") || null,
      email: user.email || null,
      phone: user.phone || null,
      notes: null,
      tags: [],
      is_close: false,
      updated_at: new Date().toISOString(),
    };
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDialogOpen(false);
      await fetchContacts();
      toast.success(`${user.full_name} ajouté à l'annuaire`);
    }
  };

  /* ─── Sauvegarder (ajout ou modif) ─── */
  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      tags: parseTags(form.tags),
      is_close: form.is_close,
      updated_at: new Date().toISOString(),
    };

    if (editContact) {
      const res = await fetch("/api/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editContact.id, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (selectedContact?.id === editContact.id) {
          setSelectedContact(data as Contact);
        }
      }
    } else {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    setDialogOpen(false);
    await fetchContacts();
  };

  /* ─── Supprimer ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/contacts?id=${deleteTarget.id}`, { method: "DELETE" });
    if (selectedContact?.id === deleteTarget.id) {
      setSelectedContact(null);
      setSheetOpen(false);
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    await fetchContacts();
  };

  /* ─── Clic sur un contact ─── */
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSheetOpen(true);
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Ajouter un contact
        </button>
      </div>

      {/* ─── Stats ─── */}
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {[
          {
            label: "Contacts",
            value: stats.total,
            icon: Users,
            gradient: "from-blue-500/20 to-blue-600/20",
            color: "text-blue-500",
          },
          {
            label: "Proches",
            value: stats.proches,
            icon: Star,
            gradient: "from-yellow-400/20 to-amber-500/20",
            color: "text-amber-500",
          },
          {
            label: "Proches avec email",
            value: stats.avecEmail,
            icon: Mail,
            gradient: "from-green-500/20 to-green-600/20",
            color: "text-green-500",
          },
          {
            label: "Avec téléphone",
            value: stats.avecTel,
            icon: Phone,
            gradient: "from-purple-500/20 to-purple-600/20",
            color: "text-purple-500",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}
            >
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-[12px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Main Layout ─── */}
      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* ── Colonne gauche : liste ── */}
        <div
          className={cn(
            "space-y-4",
            selectedContact ? "lg:col-span-7" : "lg:col-span-12"
          )}
        >
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full py-2.5 pl-10 pr-10 text-[13px]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Compteur résultats */}
          <div className="px-1 text-[13px] font-medium text-muted-foreground">
            {search ? (
              <>
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour{" "}
                <span className="text-foreground">&laquo;{search}&raquo;</span>
              </>
            ) : (
              <>
                {contacts.length} contact{contacts.length > 1 ? "s" : ""}
              </>
            )}
          </div>

          {/* Liste vide */}
          {filtered.length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-foreground/[0.04]">
                <Users className="h-7 w-7 text-muted-foreground/50" />
              </div>
              {search ? (
                <>
                  <p className="text-[14px] font-medium">Aucun résultat</p>
                  <p className="text-[12px] text-muted-foreground max-w-[220px]">
                    Aucun contact ne correspond à &laquo;{search}&raquo;.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-medium">Annuaire vide</p>
                  <p className="text-[12px] text-muted-foreground max-w-[220px]">
                    Ajoutez votre premier contact pour commencer.
                  </p>
                  <button
                    onClick={handleOpenAdd}
                    className="mt-1 flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un contact
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContact?.id === contact.id}
                  onClick={() => handleSelectContact(contact)}
                  onEdit={() => handleOpenEdit(contact)}
                  onDelete={() => {
                    setDeleteTarget(contact);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Colonne droite : panel détail (desktop) ── */}
        {selectedContact && (
          <div className="hidden lg:block lg:col-span-5">
            <ContactDetail
              contact={selectedContact}
              onEdit={() => handleOpenEdit(selectedContact)}
              onDelete={() => {
                setDeleteTarget(selectedContact);
                setDeleteDialogOpen(true);
              }}
              onClose={() => setSelectedContact(null)}
            />
          </div>
        )}
      </div>

      {/* ─── Sheet mobile (détail contact) ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="lg:hidden rounded-t-3xl max-h-[85dvh] overflow-y-auto pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle className="sr-only">Détail du contact</SheetTitle>
          </SheetHeader>
          {selectedContact && (
            <div className="px-1 pb-6">
              <ContactDetail
                contact={selectedContact}
                onEdit={() => {
                  setSheetOpen(false);
                  handleOpenEdit(selectedContact);
                }}
                onDelete={() => {
                  setSheetOpen(false);
                  setDeleteTarget(selectedContact);
                  setDeleteDialogOpen(true);
                }}
                onClose={() => setSheetOpen(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Dialog Ajout / Modification ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editContact ? "Modifier le contact" : "Nouveau contact"}
            </DialogTitle>
          </DialogHeader>
          <ContactForm
            form={form}
            onChange={setForm}
            onSubmit={handleSave}
            onDirectSave={handleDirectSave}
            saving={saving}
            isEdit={!!editContact}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Confirmation suppression ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Voulez-vous vraiment supprimer{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.first_name} {deleteTarget?.last_name ?? ""}
              </span>{" "}
              ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-[13px] font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Carte contact (ligne de liste)
   ═══════════════════════════════════════════════════════ */

function ContactCard({
  contact,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = getAvatarColors(contact.first_name);
  const initiale = getInitiale(contact.first_name);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 cursor-pointer",
        isSelected
          ? "glass-card shadow-lg ring-2 ring-primary/30"
          : "hover:bg-foreground/[0.04]"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px] font-bold text-white shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        }}
      >
        {initiale}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold truncate">
            {contact.first_name} {contact.last_name ?? ""}
          </span>
          {contact.is_close && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-yellow-400 shrink-0">
              <Star className="h-3 w-3 fill-current" />
              Proche
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted-foreground">
          {contact.email && (
            <span className="flex items-center gap-1 truncate max-w-[160px]">
              <Mail className="h-3 w-3 shrink-0" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1 shrink-0">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
        </div>
        {contact.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="rounded-lg bg-foreground/[0.06] px-2 py-0.5 text-[11px] text-muted-foreground">
                +{contact.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions rapides (hover desktop) */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Panel détail contact
   ═══════════════════════════════════════════════════════ */

function ContactDetail({
  contact,
  onEdit,
  onDelete,
  onClose,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const colors = getAvatarColors(contact.first_name);
  const initiale = getInitiale(contact.first_name);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* En-tête coloré */}
      <div
        className="relative p-6"
        style={{
          background: `linear-gradient(135deg, ${colors.from}22, ${colors.from}08)`,
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Avatar large */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-2xl font-bold text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
              boxShadow: `0 8px 24px ${colors.from}40`,
            }}
          >
            {initiale}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold truncate">
              {contact.first_name} {contact.last_name ?? ""}
            </h3>
            {contact.is_close && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-xl bg-yellow-500/15 px-2.5 py-1 text-[12px] font-semibold text-amber-600 dark:text-yellow-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                Contact proche
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6 space-y-5">
        {/* Coordonnées */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Coordonnées
          </p>

          {contact.email ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{contact.email}</p>
                <p className="text-[11px] text-muted-foreground">Email</p>
              </div>
              <button
                onClick={() => handleCopy(contact.email!)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04]">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground italic">
                Pas d&apos;email renseigné
              </p>
            </div>
          )}

          {contact.phone ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <Phone className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px]">{contact.phone}</p>
                <p className="text-[11px] text-muted-foreground">Téléphone</p>
              </div>
              <button
                onClick={() => handleCopy(contact.phone!)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04]">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground italic">
                Pas de téléphone renseigné
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 mt-0.5">
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 rounded-2xl bg-foreground/[0.03] p-3">
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-xl bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Statut proche */}
        <div className="rounded-2xl bg-foreground/[0.03] p-3 flex items-center gap-3">
          <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-[12px] text-muted-foreground flex-1">
            {contact.is_close
              ? "Ce contact est marqué comme proche — il peut recevoir des notifications."
              : "Contact standard — non marqué comme proche."}
          </p>
        </div>

        {/* Métadonnées */}
        <div className="rounded-2xl bg-foreground/[0.03] px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Ajouté le{" "}
            {new Date(contact.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-500 transition-all hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Formulaire contact
   ═══════════════════════════════════════════════════════ */

function ContactForm({
  form,
  onChange,
  onSubmit,
  onDirectSave,
  saving,
  isEdit,
}: {
  form: ContactFormData;
  onChange: (f: ContactFormData) => void;
  onSubmit: () => void;
  onDirectSave: (user: UserResult) => Promise<void>;
  saving: boolean;
  isEdit: boolean;
}) {
  const set = (key: keyof ContactFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [key]: e.target.value });

  // ── Mode (recherche par défaut, manuel si édition) ──
  const [mode, setMode] = useState<"manual" | "search">(isEdit ? "manual" : "search");

  // Réinitialiser le mode quand on bascule add/edit
  useEffect(() => {
    setMode(isEdit ? "manual" : "search");
  }, [isEdit]);

  // Sauvegarde directe depuis les résultats de recherche
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // ── Recherche plateforme ──
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // ── Détection utilisateur inscrit (email manuel) ──
  const [suggestedUser, setSuggestedUser] = useState<UserResult | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Recherche temps réel en mode "search"
  useEffect(() => {
    if (mode !== "search" || userSearch.length < 2) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(userSearch)}&mode=all`);
        const data = await res.json();
        setUserResults(data.users || []);
      } catch { setUserResults([]); }
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, mode]);

  // Détection utilisateur inscrit via email (mode manuel)
  useEffect(() => {
    if (mode !== "manual" || !form.email || form.email.length < 5) {
      setSuggestedUser(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(form.email)}&mode=email`);
        const data = await res.json();
        const match = (data.users || []).find((u: UserResult) => u.has_account);
        setSuggestedUser(match || null);
      } catch { setSuggestedUser(null); }
      setCheckingEmail(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.email, mode]);

  // Remplir le formulaire depuis un utilisateur trouvé
  const fillFromUser = (user: UserResult) => {
    const parts = user.full_name.trim().split(" ");
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");
    onChange({
      ...form,
      first_name: first,
      last_name: last,
      email: user.email || form.email,
      phone: user.phone || form.phone,
    });
    setMode("manual");
    setUserSearch("");
    setUserResults([]);
    setSuggestedUser(null);
  };

  // Champs communs (proche toggle + bouton submit)
  const CloseToggle = () => (
    <button
      type="button"
      onClick={() => onChange({ ...form, is_close: !form.is_close })}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        form.is_close
          ? "border-yellow-400/40 bg-yellow-500/10"
          : "border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.04]"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", form.is_close ? "bg-yellow-400/20" : "bg-foreground/[0.06]")}>
        <Star className={cn("h-4 w-4 transition-colors", form.is_close ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
      </div>
      <div className="flex-1">
        <p className="text-[13px] font-semibold">Contact proche</p>
        <p className="text-[11px] text-muted-foreground">Les proches peuvent recevoir des notifications.</p>
      </div>
      <div className={cn("h-5 w-9 rounded-full transition-colors duration-200 relative", form.is_close ? "bg-yellow-400" : "bg-foreground/20")}>
        <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200", form.is_close ? "left-4" : "left-0.5")} />
      </div>
    </button>
  );

  const SubmitBtn = () => (
    <button
      onClick={onSubmit}
      disabled={!form.first_name.trim() || saving}
      className="w-full rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"
    >
      {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer les modifications" : "Créer le contact"}
    </button>
  );

  return (
    <div className="space-y-4 pt-2">
      {/* ── Toggle mode (ajout uniquement) ── */}
      {!isEdit && (
        <div className="flex rounded-xl bg-foreground/[0.04] p-0.5">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium transition-all", mode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Pencil className="h-3.5 w-3.5" /> Saisie manuelle
          </button>
          <button
            type="button"
            onClick={() => setMode("search")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium transition-all", mode === "search" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Search className="h-3.5 w-3.5" /> Rechercher
          </button>
        </div>
      )}

      {/* ── Mode : Recherche plateforme ── */}
      {mode === "search" && (
        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground text-center">
            Recherchez un utilisateur inscrit sur la plateforme pour l&apos;ajouter directement.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nom, email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="glass-input w-full py-2.5 pl-10 pr-4 text-[13px]"
              autoFocus
            />
          </div>

          {searchingUsers && (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          )}
          {!searchingUsers && userSearch.length >= 2 && userResults.length === 0 && (
            <p className="text-center text-[12px] text-muted-foreground py-4">Aucun résultat trouvé.</p>
          )}
          {!searchingUsers && userSearch.length < 2 && (
            <p className="text-center text-[12px] text-muted-foreground py-2">Tapez au moins 2 caractères pour rechercher.</p>
          )}

          {userResults.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={savingUserId !== null}
                  onClick={async () => {
                    setSavingUserId(user.id);
                    await onDirectSave(user);
                    setSavingUserId(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-foreground/[0.04] disabled:opacity-60"
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold",
                    user.has_account ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold truncate">{user.full_name}</p>
                      {user.has_account ? (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <UserCheck className="h-2.5 w-2.5" /> Inscrit
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Contact
                        </span>
                      )}
                      {user.is_close && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    {user.email && <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>}
                    {user.phone && <p className="text-[11px] text-muted-foreground">{user.phone}</p>}
                  </div>
                  {savingUserId === user.id
                    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    : <Plus className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                </button>
              ))}
            </div>
          )}

          {/* Bouton permanent — contact pas inscrit */}
          <div className="border-t border-foreground/[0.06] pt-3">
            <button
              type="button"
              onClick={() => { setMode("manual"); if (userSearch) onChange({ ...form, first_name: userSearch }); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/[0.15] py-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <UserX className="h-4 w-4" /> Contact pas inscrit
            </button>
          </div>
        </div>
      )}

      {/* ── Mode : Saisie manuelle ── */}
      {mode === "manual" && (
        <>
          {/* Bannière utilisateur inscrit détecté via email */}
          {suggestedUser && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <UserCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Utilisateur inscrit : {suggestedUser.full_name}
                </p>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">Cet email correspond à un compte existant sur la plateforme.</p>
                <button
                  type="button"
                  onClick={() => fillFromUser(suggestedUser)}
                  className="mt-1.5 text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  Utiliser ses informations →
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSuggestedUser(null)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {checkingEmail && !suggestedUser && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Vérification de l&apos;email…
            </div>
          )}

          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Prénom <span className="text-red-500">*</span></label>
              <input value={form.first_name} onChange={set("first_name")} placeholder="Marie" className="glass-input w-full py-2.5 px-4 text-[14px]" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Nom</label>
              <input value={form.last_name} onChange={set("last_name")} placeholder="Dupont" className="glass-input w-full py-2.5 px-4 text-[14px]" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="marie@exemple.fr" className="glass-input w-full py-2.5 px-4 text-[14px]" />
          </div>

          {/* Téléphone */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Téléphone</label>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+33 6 12 34 56 78" className="glass-input w-full py-2.5 px-4 text-[14px]" />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Tags
              <span className="text-muted-foreground font-normal">(séparés par des virgules)</span>
            </label>
            <input value={form.tags} onChange={set("tags")} placeholder="famille, travail, ami…" className="glass-input w-full py-2.5 px-4 text-[14px]" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} placeholder="Informations complémentaires…" rows={3} className="glass-input w-full py-2.5 px-4 text-[14px] resize-none" />
          </div>

          <CloseToggle />
          <SubmitBtn />
        </>
      )}
    </div>
  );
}
