<div align="center">

<img src="public/icons/icon-512.svg" width="100" alt="Life Logo" />

# Life — Dashboard Personnel IoT

**Votre hub de vie intelligent. Centralisez, automatisez, vivez mieux.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://life-ngcn9x3av-naviscrew31-9590s-projects.vercel.app/)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple)](https://life-ngcn9x3av-naviscrew31-9590s-projects.vercel.app/)

[Demo Live](https://life-ngcn9x3av-naviscrew31-9590s-projects.vercel.app/) · [Signaler un bug](https://github.com/LouisLapointe01/Life/issues) · [Contribuer](#contribuer)

</div>

---

## Table des matieres

- [Vision du projet](#vision-du-projet)
- [Fonctionnalites actuelles](#fonctionnalites-actuelles)
- [Architecture technique](#architecture-technique)
- [Structure du projet](#structure-du-projet)
- [Installation & demarrage](#installation--demarrage)
- [Variables d'environnement](#variables-denvironnement)
- [Modules du dashboard](#modules-du-dashboard)
- [API Routes](#api-routes)
- [PWA & Mobile](#pwa--mobile)
- [Feuille de route](#feuille-de-route)
- [Contribuer](#contribuer)

---

## Vision du projet

**Life** est bien plus qu'un simple tableau de bord. L'objectif final est de construire un **assistant de vie intelligent** — une interface unifiee entre vous, votre domicile, et vos donnees personnelles, propulsee par une IA locale.

```
Aujourd'hui                       Demain
─────────────────────             ─────────────────────────────────────
Dashboard web/PWA           →     IA conversationnelle locale (Llama, Mistral...)
Donnees manuelles           →     Capteurs IoT en temps reel (temperature,
Widgets statiques                 CO2, energie, presence...)
Integrations cloud                Cameras IP avec vision par ordinateur
                                  Automatisations intelligentes (routines,
                                  alertes, scenes domotiques)
                                  Controle vocal offline
                                  Apprentissage des habitudes
```

La philosophie centrale : **vos donnees restent chez vous**. L'IA tourne localement, les integrations cloud sont optionnelles.

---

## Fonctionnalites actuelles

### Dashboard personnalisable
- Tableau de bord modulaire avec widgets glisser-deposer
- Widgets organises par categorie : Systeme, Planning, Meteo, IoT, Sante, Finance
- Mode sombre / clair natif
- Interface responsive (mobile, tablette, desktop)
- Application installable (PWA) avec support hors-ligne

### Agenda & Rendez-vous
- Creation et gestion de rendez-vous avec types personnalisables (couleur, duree)
- Systeme de participants multiples (internes au compte + invites externes)
- Synchronisation bidirectionnelle avec **Google Calendar**
- Notifications de rappel par **email (Mailjet)** et **SMS (Twilio)**
- Gestion des indisponibilites
- Page publique de prise de RDV (`/rdv`)

### Annuaire
- Carnet de contacts personnel
- Tags, notes, contacts proches / favoris
- Recherche intelligente par nom, email, telephone
- Blocage de contacts
- Distinction entre utilisateurs de la plateforme et contacts externes

### Messagerie temps reel
- Conversations entre utilisateurs de la plateforme
- Messages en temps reel via **Supabase Realtime**
- Indicateur de messages non lus (store Zustand)
- Interface split-view (liste + chat)
- Vue mobile optimisee (navigation entre liste et conversation)

### Gestion de fichiers
- Explorateur de fichiers et dossiers personnel
- Integration **Google Drive** (synchronisation, webhooks de renouvellement)
- Upload, telechargement, suppression
- Navigation par arborescence

### Sante & Bien-etre
- Metriques personnalisables : pas, sommeil, calories, hydratation, frequence cardiaque, poids
- Graphiques hebdomadaires (Recharts)
- Journal d'humeur quotidien
- Objectifs personnels cochables (persistance localStorage)
- Sections masquables

### Logement & Domotique (IoT ready)
- Interface de gestion par pieces
- Types d'appareils : lumieres, thermostats, cameras, securite, electromenager, medias, capteurs
- Donnees de temperature et humidite par piece
- Suivi de consommation energetique (tendances)
- Base prete pour l'integration de vrais capteurs (MQTT, WebSocket)

### Meteo
- Meteo actuelle et previsions sur 7 jours via **Open-Meteo** (API gratuite, sans cle)
- Vue par periodes (matin, midi, soir, nuit) avec donnees horaires
- Gestion de plusieurs villes
- Donnees : temperature, precipitations, vent, humidite, UV, lever du soleil

### Finance *(en developpement)*
- Interface prete : solde, depenses, revenus, epargne, crypto
- Connexion de comptes bancaires a venir

### Notifications
- Systeme de notifications in-app (centre de notifications)
- Push notifications web (Web Push API + service worker)
- Cron jobs automatiques pour rappels et renouvellement de webhooks Google

---

## Architecture technique

```
+----------------------------------------------------------+
|                     CLIENT (Browser / PWA)               |
|  Next.js 16 App Router · React 19 · TypeScript 5         |
|  Tailwind CSS v4 · shadcn/ui · Framer Motion             |
|  Zustand (state global) · Recharts (graphiques)          |
+----------------------+-----------------------------------+
                       | API Routes (Next.js)
+----------------------▼-----------------------------------+
|                     SERVEUR (Vercel Edge)                 |
|  Next.js API Routes · Zod (validation)                   |
|  Middleware auth (Supabase SSR)                          |
+------+----------------------------------+----------------+
       |                                  |
+------▼------+               +-----------▼--------------+
|  Supabase   |               |     Services tiers        |
|  ---------  |               |  ------------------------ |
|  Auth       |               |  Google Calendar API      |
|  PostgreSQL |               |  Google Drive API         |
|  Realtime   |               |  Mailjet (emails)         |
|  Storage    |               |  Twilio (SMS)             |
+-------------+               |  Open-Meteo (meteo)       |
                              |  Web Push (notifications)  |
                              +---------------------------+
```

### Choix techniques cles

| Technologie | Role | Pourquoi |
|-------------|------|----------|
| **Next.js 16** | Framework full-stack | App Router, Server Components, API Routes dans un seul projet |
| **Supabase** | BDD + Auth + Realtime | PostgreSQL manage, auth OAuth, websockets natifs |
| **Zustand v5** | State management | Leger, sans boilerplate, parfait pour state UI cross-composants |
| **shadcn/ui** | Composants UI | Non opine, entierement personnalisable, base sur Radix |
| **Tailwind v4** | CSS | Utilitaire, pas de CSS custom sauf cas extremes |
| **Zod v4** | Validation | Schemas types cote serveur pour toutes les API |
| **Recharts** | Graphiques | Composants React natifs, facile a integrer avec Tailwind |
| **Framer Motion** | Animations | Transitions fluides sans overhead |

---

## Structure du projet

```
life/
├── app/
│   ├── (auth)/
│   │   ├── login/              # Page de connexion
│   │   └── register/           # Page d'inscription
│   ├── api/
│   │   ├── appointments/       # CRUD RDV, participants, types, notifs
│   │   ├── auth/               # Callback OAuth
│   │   ├── contacts/           # Annuaire + blocage
│   │   ├── conversations/      # Messagerie
│   │   ├── cron/               # Jobs planifies (rappels, webhooks)
│   │   ├── files/ & folders/   # Gestion fichiers
│   │   ├── google/             # OAuth Google, Drive, Calendar, Webhooks
│   │   ├── messages/           # Messages temps reel
│   │   ├── notifications/      # Centre de notifications
│   │   └── push/               # Abonnements Push
│   ├── dashboard/
│   │   ├── page.tsx            # Accueil (widgets personnalisables)
│   │   ├── agenda/             # Agenda & RDV
│   │   ├── annuaire/           # Carnet de contacts
│   │   ├── fichiers/           # Gestionnaire de fichiers
│   │   ├── finance/            # Finances (WIP)
│   │   ├── logement/           # Domotique / IoT
│   │   ├── messages/           # Messagerie
│   │   ├── meteo/              # Meteo multi-villes
│   │   ├── sante/              # Sante & bien-etre
│   │   ├── profil/             # Profil utilisateur
│   │   └── parametres/         # Parametres
│   └── rdv/                    # Page publique de prise de RDV
├── components/
│   ├── dashboard/              # Shell, Header, BottomNav, widgets...
│   ├── messages/               # ConversationList, ChatView
│   └── ui/                     # Composants shadcn/ui
├── lib/
│   ├── stores/                 # Zustand stores (presence, messages, sante...)
│   ├── supabase/               # Clients Supabase (admin, client, server, middleware)
│   ├── google-calendar.ts      # Integration Google Calendar
│   ├── google-drive.ts         # Integration Google Drive
│   ├── mailjet.ts              # Envoi d'emails
│   ├── push-notifications.ts   # Web Push
│   ├── twilio.ts               # SMS
│   └── validations.ts          # Schemas Zod
├── hooks/                      # Hooks React custom
├── supabase/
│   └── migration.sql           # Schema PostgreSQL complet
└── public/
    ├── sw.js                   # Service Worker (PWA)
    └── icons/                  # Icones multi-resolutions (PWA)
```

---

## Installation & demarrage

### Prerequis

- Node.js 20+
- Compte [Supabase](https://supabase.com) (gratuit)
- (Optionnel) Comptes Google Cloud, Twilio, Mailjet

### 1. Cloner et installer

```bash
git clone https://github.com/LouisLapointe01/Life.git
cd Life
npm install
```

### 2. Configurer Supabase

1. Creez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et executez le contenu de `supabase/migration.sql`
3. Dans **Authentication > Providers**, activez Google OAuth si souhaite

### 3. Variables d'environnement

Copiez `.env.example` en `.env.local` et remplissez les valeurs :

```bash
cp .env.example .env.local
```

### 4. Lancer en developpement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle anonyme Supabase | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service Supabase (admin) | Oui |
| `GOOGLE_CLIENT_ID` | OAuth Google - Client ID | Optionnel |
| `GOOGLE_CLIENT_SECRET` | OAuth Google - Client Secret | Optionnel |
| `GOOGLE_REDIRECT_URI` | URI de callback Google | Optionnel |
| `MAILJET_API_KEY` | Cle API Mailjet | Optionnel |
| `MAILJET_SECRET_KEY` | Secret Mailjet | Optionnel |
| `MAILJET_FROM_EMAIL` | Adresse expediteur emails | Optionnel |
| `TWILIO_ACCOUNT_SID` | SID du compte Twilio | Optionnel |
| `TWILIO_AUTH_TOKEN` | Token auth Twilio | Optionnel |
| `TWILIO_PHONE_NUMBER` | Numero Twilio expediteur | Optionnel |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cle VAPID publique (Push) | Optionnel |
| `VAPID_PRIVATE_KEY` | Cle VAPID privee (Push) | Optionnel |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app | Optionnel |

---

## Modules du dashboard

### Widgets disponibles

| Categorie | Widgets |
|-----------|---------|
| **Systeme** | Horloge, Notifications, Batterie, Wi-Fi |
| **Planning** | Prochain RDV, Messages non lus, Taches |
| **Meteo** | Temperature, Vent, Pluie, Humidite, UV, Lever du soleil |
| **IoT / Logement** | Temp. interieure, Humidite, CO2, Lumiere, Energie, Eau, Thermostat, Securite, Prise, Qualite de l'air |
| **Sante** | Pas, Sommeil, Calories, Hydratation, Frequence cardiaque, Poids, Score de bien-etre |
| **Finance** | Solde, Depenses, Budget, Crypto |

---

## API Routes

| Methode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/api/appointments` | Lister / creer des RDV |
| GET | `/api/appointments/available` | Creneaux disponibles |
| POST | `/api/appointments/notify` | Envoyer une notification de RDV |
| GET | `/api/appointments/types` | Types de RDV disponibles |
| GET/POST | `/api/contacts` | Lister / creer des contacts |
| POST | `/api/contacts/block` | Bloquer un contact |
| GET/POST | `/api/conversations` | Conversations messagerie |
| GET/POST | `/api/messages` | Messages d'une conversation |
| GET/POST | `/api/files` | Fichiers (list/upload) |
| GET/PUT/DELETE | `/api/files/[id]` | Fichier specifique |
| GET/POST | `/api/folders` | Dossiers |
| GET | `/api/google/auth` | Initier OAuth Google |
| GET | `/api/google/callback` | Callback OAuth Google |
| GET | `/api/google/drive` | Lister fichiers Google Drive |
| POST | `/api/google/sync` | Synchroniser Drive |
| POST | `/api/google/webhook` | Webhook changements Drive |
| GET | `/api/notifications` | Notifications de l'utilisateur |
| POST | `/api/push/subscribe` | S'abonner aux push notifications |
| GET/POST | `/api/unavailabilities` | Indisponibilites agenda |
| POST | `/api/cron/reminders` | Cron : envoyer rappels RDV |
| POST | `/api/cron/webhook-renewal` | Cron : renouveler webhooks Google |

---

## PWA & Mobile

Life est une **Progressive Web App** installable sur iOS, Android et desktop :

- **Service Worker** (`public/sw.js`) - cache des ressources statiques
- **Web App Manifest** - icones, couleurs, orientation
- **Icones multi-resolutions** - de 16x16 a 2048x2048, incluant maskable et Apple Touch
- **Navigation mobile** - barre de navigation bas native (MobileBottomNav)
- **Push Notifications** - via Web Push API, meme app fermee

Pour installer : ouvrir l'app dans Safari (iOS) ou Chrome (Android/Desktop) > "Ajouter a l'ecran d'accueil".

---

## Feuille de route

### Phase 1 - Fondations *(en cours)*
- [x] Dashboard modulaire et personnalisable
- [x] Authentification (email + Google OAuth)
- [x] Agenda avec synchronisation Google Calendar
- [x] Annuaire de contacts
- [x] Messagerie temps reel
- [x] Gestion de fichiers + Google Drive
- [x] Module Sante avec graphiques
- [x] Module Logement (UI domotique)
- [x] Meteo multi-villes (Open-Meteo)
- [x] PWA installable + Push Notifications
- [x] Notifications email (Mailjet) + SMS (Twilio)
- [ ] Module Finance complet (connexion bancaire, budget, crypto)
- [ ] Parametres et profil utilisateur avances

### Phase 2 - Intelligence locale *(a venir)*
- [ ] **Integration LLM local** (Ollama + Llama 3 / Mistral)
  - Interpretation du langage naturel pour controler le dashboard
  - Resume journalier intelligent de votre activite
  - Suggestions personnalisees basees sur vos habitudes
  - Interface de chat avec contexte de vos donnees de vie
- [ ] **Assistant vocal offline** - wake word + reconnaissance vocale locale
- [ ] **API IoT** - endpoint MQTT/WebSocket pour capteurs physiques (ESP32, Raspberry Pi)
  - Capteurs de temperature / humidite / CO2
  - Capteurs de presence (PIR)
  - Prises connectees (consommation electrique)
  - Thermostats intelligents

### Phase 3 - Vision intelligente *(roadmap)*
- [ ] **Integration cameras IP** (RTSP / WebRTC)
  - Flux video en direct dans le dashboard
  - Detection de mouvement par vision par ordinateur
  - Analyse de scenes (modeles vision comme LLaVA)
  - Alertes intelligentes (intrusion, chute de personne, etc.)
- [ ] **Automatisations** - regles evenement -> action (style Home Assistant)
  - "Si temperature > 26C -> allumer ventilateur"
  - "Si aucune presence depuis 30 min -> eteindre les lumieres"
  - "Si arrivee a la maison -> lancer ma scene soiree"
- [ ] **Apprentissage des habitudes** - modele local qui predit vos routines
- [ ] **Tableau de bord famille** - espace partage multi-utilisateurs
- [ ] **Integration domotique** - compatibilite Home Assistant, Matter, Zigbee

### Phase 4 - Ecosysteme *(vision long terme)*
- [ ] Application mobile native (React Native / Expo)
- [ ] Box locale dediee (image Docker, Raspberry Pi 5)
- [ ] Marketplace de widgets communautaires
- [ ] API publique pour integrations tierces
- [ ] Chiffrement de bout en bout des donnees personnelles

---

## Stack complete

```
Frontend          Backend           Base de donnees     Services
──────────        ───────           ───────────────     ────────
Next.js 16        Next.js API       Supabase            Vercel (hebergement)
React 19          Routes            (PostgreSQL)        Google Calendar API
TypeScript 5      Supabase          Supabase            Google Drive API
Tailwind v4       Admin Client      Realtime            Mailjet (email)
shadcn/ui         Zod validation    (WebSockets)        Twilio (SMS)
Framer Motion     Web Push                              Open-Meteo (meteo)
Zustand v5        Mailjet                               Web Push API
Recharts          Twilio
date-fns
```

---

## Contribuer

Les contributions sont les bienvenues ! Ce projet est personnel mais ouvert.

1. Fork le repo
2. Cree une branche feature (`git checkout -b feature/ma-fonctionnalite`)
3. Commit (`git commit -m 'feat: ajouter ma fonctionnalite'`)
4. Push (`git push origin feature/ma-fonctionnalite`)
5. Ouvre une Pull Request

Pour les bugs et suggestions : [ouvrir une issue](https://github.com/LouisLapointe01/Life/issues)

---

<div align="center">

Fait avec passion par [Louis Lapointe](https://github.com/LouisLapointe01)

*"La technologie au service d'une vie mieux vecue."*

</div>
