# AFEP-3.0 / Éclosion

Application mobile (Expo / React Native) pour les groupes de femmes rurales d'Afrique Centrale.
Backend FastAPI + MongoDB. Frontend Expo SDK 54 (expo-router).

## Fonctionnalités

- Authentification Google (Emergent Auth) **ou mode démo local** sans Google
- Accueil : opportunités d'affaires locales (5 secteurs seedés)
- Formations : 6 modules statiques + téléchargement hors ligne (AsyncStorage)
- Mon Groupe : créer / rejoindre un groupe, tableau de bord membres
- Financement : assistant IA en 6 étapes → pitch / mini plan d'affaires en markdown (Claude via EMERGENT_LLM_KEY, fallback templated si l'IA est indisponible)
- Annuaire des bailleurs : 26 organisations sur 7 pays (Cameroun, Gabon, RDC, RCA, Congo, Tchad, Guinée Équatoriale) avec notes communautaires

## Prérequis

- Python 3.11+
- Node.js 20+ et Yarn 1.x
- MongoDB 6+ local

## 1. Lancer MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Docker (option universelle)
docker run -d -p 27017:27017 --name afep-mongo mongo:6
```

Vérifier : `mongosh --eval "db.runCommand({ping:1})"`

## 2. Lancer le backend FastAPI

```bash
cd backend
cp .env.example .env
# éditer .env si besoin (clé EMERGENT_LLM_KEY)
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Vérifier : `curl http://localhost:8001/api/opportunities` → 5 opportunités.
`curl http://localhost:8001/api/config` → `{"demo_mode": true}` si DEMO_MODE est actif.

Avec `DEMO_MODE=true`, au premier démarrage le backend seede automatiquement :
- 2 groupes types (Bafia, Pointe-Noire)
- 1 demande de financement avec pitch
- 3 avis communautaires sur les bailleurs

## 3. Lancer le frontend Expo

```bash
cd frontend
cp .env.example .env
yarn install
yarn start
# puis 'w' pour web, 'a' pour Android, 'i' pour iOS (ou scanner le QR via Expo Go)
```

### Tester sur un téléphone réel (Expo Go)

`localhost` désigne le téléphone lui-même, pas votre ordinateur. Pour que le QR code et les appels API fonctionnent :

1. **Mettre à jour `frontend/.env`** avec l'IP LAN de votre machine de dev (pas `localhost`) :
   - macOS : `ipconfig getifaddr en0` (ex. `192.168.1.42`)
   - Linux : `hostname -I | awk '{print $1}'`
   - Windows : `ipconfig` → IPv4 de votre carte Wi-Fi
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.42:8001
   EXPO_PACKAGER_HOSTNAME=192.168.1.42
   EXPO_PACKAGER_PROXY_URL=http://192.168.1.42:8081
   ```
2. **Lancer le backend en bind 0.0.0.0** (déjà fait dans la commande uvicorn ci-dessus) — sinon le téléphone ne pourra pas l'atteindre.
3. **Téléphone + ordinateur sur le même Wi-Fi**, pare-feu autorisant les ports 8001 et 8081.
4. **Tunnel alternatif** (si le Wi-Fi du bureau bloque la découverte locale) :
   ```bash
   yarn start --tunnel
   ```
   Expo génère alors une URL `exp://...exp.direct` accessible depuis n'importe où, mais l'IP du backend dans `EXPO_PUBLIC_BACKEND_URL` doit rester accessible publiquement (utiliser ngrok, Cloudflare Tunnel, ou la preview Emergent).

### Tester via la preview Emergent hébergée

Aucune configuration locale nécessaire : ouvrir l'URL `https://<sous-domaine>.preview.emergentagent.com` sur n'importe quel téléphone. Toutes les variables `EXPO_PUBLIC_*` sont déjà pointées vers le bon backend public.

## 4. Tester sans Google

Avec `EXPO_PUBLIC_DEMO_MODE=true` (frontend) **et** `DEMO_MODE=true` (backend), un second bouton **« Connexion démo (sans Google) »** apparaît sur l'écran d'accueil. Il crée/renvoie un utilisateur `demo@afep.local`.

## 5. Parcours utilisateur recommandé

1. Lancer MongoDB → backend → frontend
2. Ouvrir l'app → **Connexion démo**
3. **Mon Groupe** → créer ou rejoindre un groupe
4. **Formations** → ouvrir un module → **Télécharger pour hors ligne** (puis tester en mode avion)
5. **Financement** → 6 étapes → **Générer mon pitch**
   - Avec EMERGENT_LLM_KEY valide : pitch rédigé par Claude
   - Sans clé / si l'IA échoue : pitch templated marqué comme « hors-IA (fallback) »
6. **Bailleurs** (bouton dans Financement) → filtrer par pays → **Noter** un bailleur

## Endpoints publics (sans auth)

- `GET /api/config` → `{demo_mode: bool}`
- `GET /api/opportunities` → 5 opportunités
- `GET /api/training/modules` + `GET /api/training/modules/{id}`
- `GET /api/donors?country=...` + `GET /api/donors/countries` + `GET /api/donors/{id}/reviews`
- `GET /api/groups`

## Endpoints protégés (Bearer token)

- Auth : `POST /api/auth/session`, `POST /api/auth/demo-login` (DEMO_MODE), `GET /api/auth/me`, `POST /api/auth/logout`
- Groupes : `POST /api/groups`, `POST /api/groups/{id}/join`, `GET /api/groups/mine`
- Financement : `POST /api/funding/generate`, `GET /api/funding/mine`
- Notes bailleurs : `POST /api/donors/{id}/rate`

## Structure

```
app/
├── backend/
│   ├── server.py        # FastAPI all-in-one
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/             # expo-router (file-based)
│   │   ├── index.tsx              # welcome / login
│   │   ├── (tabs)/                # bottom tabs
│   │   ├── module/[id].tsx        # détail formation
│   │   ├── donors.tsx             # annuaire bailleurs
│   │   └── donor-rate/[id].tsx    # notation
│   ├── src/
│   │   ├── auth-context.tsx
│   │   ├── api.ts
│   │   ├── offline.ts             # cache formations
│   │   ├── toast.tsx              # erreurs visibles
│   │   └── theme.ts
│   └── .env.example
└── README.md
```
