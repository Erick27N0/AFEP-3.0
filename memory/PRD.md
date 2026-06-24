# Éclosion — Plateforme pour les femmes rurales d'Afrique Centrale

## Vision
Mobile app (Expo / React Native) en français qui permet aux femmes rurales d'Afrique Centrale de :
- Se connecter via Google Auth (Emergent)
- Créer / rejoindre un groupe (coopérative)
- Découvrir des opportunités d'affaires locales
- Suivre des formations pour créer, lancer et gérer une petite entreprise
- Générer un pitch / mini plan d'affaires via IA pour rechercher un financement

## Stack
- Frontend : Expo SDK 54, expo-router (file-based, bottom tabs)
- Backend : FastAPI + Motor (MongoDB)
- Auth : Emergent Managed Google Auth (session token in expo-secure-store)
- IA : Claude Sonnet 4.6 via `emergentintegrations` (EMERGENT_LLM_KEY)

## Écrans
1. `/` Welcome + Google Auth
2. `/(tabs)` Bottom tabs
   - Accueil : opportunités locales (seedées)
   - Formations : 6 modules statiques (créer un business, gérer son argent, vendre, etc.)
   - Financement : wizard 6 étapes → IA génère un pitch markdown
   - Mon Groupe : créer ou rejoindre un groupe, dashboard membres
3. `/module/[id]` détail d'un module
4. Logout depuis "Mon Groupe"

## Endpoints
- `POST /api/auth/session` exchange Emergent session_token → app session_token + user
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/opportunities`
- `GET /api/training/modules` + `GET /api/training/modules/{id}`
- `GET /api/groups`, `POST /api/groups`, `POST /api/groups/{id}/join`, `GET /api/groups/mine`
- `POST /api/funding/generate` (auth requis) → IA Claude
- `GET /api/funding/mine`

## Design
Palette terre/sage (#4A6B4E primary, #D98A2C secondary, surface #FDFDFB). Bottom tabs. Pas de violet/bleu.

## Statut
MVP fonctionnel testé end-to-end.
