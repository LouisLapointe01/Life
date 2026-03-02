"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Loader2,
  Clock,
  Users,
  CalendarDays,
  Star,
} from "lucide-react";

// ============================================
// Types
// ============================================

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number;
  color: string;
  is_active: boolean;
  sort_order: number;
};

type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_close: boolean;
};

const DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

// ============================================
// Page principale
// ============================================

export default function ParametresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Configurez vos types de rendez-vous, disponibilités et contacts proches.
        </p>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types" className="gap-1">
            <CalendarDays className="h-4 w-4" />
            Types de RDV
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-1">
            <Clock className="h-4 w-4" />
            Disponibilités
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Users className="h-4 w-4" />
            Contacts proches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <AppointmentTypesSection />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <AvailabilitySection />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Section : Types de RDV
// ============================================

function AppointmentTypesSection() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    duration_min: "30",
    color: "#007AFF",
  });
  const [saving, setSaving] = useState(false);

  const fetchTypes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("appointment_types")
      .select("*")
      .order("sort_order");
    if (data) setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addType = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("appointment_types").insert({
      name: form.name,
      duration_min: parseInt(form.duration_min),
      color: form.color,
      sort_order: types.length,
    });
    setForm({ name: "", duration_min: "30", color: "#007AFF" });
    setDialogOpen(false);
    setSaving(false);
    fetchTypes();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const supabase = createClient();
    await supabase
      .from("appointment_types")
      .update({ is_active: !is_active })
      .eq("id", id);
    fetchTypes();
  };

  const deleteType = async (id: string) => {
    const supabase = createClient();
    await supabase.from("appointment_types").delete().eq("id", id);
    fetchTypes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Types de rendez-vous</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau type de rendez-vous</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Appel téléphonique"
                />
              </div>
              <div className="space-y-2">
                <Label>Durée (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="480"
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_min: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="font-mono"
                  />
                </div>
              </div>
              <Button
                onClick={addType}
                disabled={!form.name || saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {types.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Aucun type de rendez-vous. Créez-en un pour commencer.
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {type.duration_min} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={type.is_active}
                    onCheckedChange={() =>
                      toggleActive(type.id, type.is_active)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteType(type.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Section : Disponibilités
// ============================================

function AvailabilitySection() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    day_of_week: "1",
    start_time: "09:00",
    end_time: "17:00",
  });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("availability_rules")
      .select("*")
      .order("day_of_week")
      .order("start_time");
    if (data) setRules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("availability_rules").insert({
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    setDialogOpen(false);
    setSaving(false);
    fetchRules();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const supabase = createClient();
    await supabase
      .from("availability_rules")
      .update({ is_active: !is_active })
      .eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    const supabase = createClient();
    await supabase.from("availability_rules").delete().eq("id", id);
    fetchRules();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plages horaires</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle plage horaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Jour</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, day_of_week: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Début</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_time: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                onClick={addRule}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Aucune plage horaire. Ajoutez vos disponibilités.
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-medium">{DAYS[rule.day_of_week]}</p>
                  <p className="text-sm text-muted-foreground">
                    {rule.start_time.slice(0, 5)} — {rule.end_time.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() =>
                      toggleActive(rule.id, rule.is_active)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule(rule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Section : Contacts proches
// ============================================

function ContactsSection() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, is_close")
      .order("first_name");
    if (data) setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const toggleClose = async (id: string, is_close: boolean) => {
    const supabase = createClient();
    await supabase
      .from("contacts")
      .update({ is_close: !is_close })
      .eq("id", id);
    fetchContacts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts proches</CardTitle>
        <p className="text-sm text-muted-foreground">
          Les contacts marqués comme proches recevront un SMS de confirmation
          quand leur rendez-vous est confirmé.
        </p>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Aucun contact dans l&apos;annuaire. Ajoutez des contacts depuis la
            page Annuaire.
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  {contact.is_close && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <div>
                    <p className="font-medium">
                      {contact.first_name} {contact.last_name || ""}
                    </p>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={contact.is_close ? "default" : "secondary"}>
                    {contact.is_close ? "Proche" : "Standard"}
                  </Badge>
                  <Switch
                    checked={contact.is_close}
                    onCheckedChange={() =>
                      toggleClose(contact.id, contact.is_close)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
