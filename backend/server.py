from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Models ----------------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""
    group_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_token: str

class GroupCreate(BaseModel):
    name: str
    description: str
    location: str

class Group(BaseModel):
    group_id: str
    name: str
    description: str
    location: str
    members: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FundingRequestCreate(BaseModel):
    project_name: str
    problem: str
    solution: str
    target_amount: str
    beneficiaries: str
    sector: str

# ---------------- Auth helper ----------------
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(' ', 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get('expires_at')
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------------- Auth Routes ----------------
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    """Exchange session_token from Emergent Auth for verified user data + store session."""
    async with httpx.AsyncClient() as cli:
        r = await cli.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_token},
            timeout=10.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session token")
    data = r.json()
    email = data.get('email')
    name = data.get('name', '')
    picture = data.get('picture', '')
    session_token = data.get('session_token')

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing['user_id']
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "group_id": None,
            "created_at": datetime.now(timezone.utc),
        })

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}

@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request):
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth.split(' ', 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}

# ---------------- Groups ----------------
@api_router.post("/groups")
async def create_group(payload: GroupCreate, request: Request):
    user = await get_current_user(request)
    group_id = f"grp_{uuid.uuid4().hex[:10]}"
    grp = {
        "group_id": group_id,
        "name": payload.name,
        "description": payload.description,
        "location": payload.location,
        "members": [user['user_id']],
        "created_by": user['user_id'],
        "created_at": datetime.now(timezone.utc),
    }
    await db.groups.insert_one(grp)
    await db.users.update_one({"user_id": user['user_id']}, {"$set": {"group_id": group_id}})
    grp.pop("_id", None)
    return grp

@api_router.get("/groups")
async def list_groups():
    groups = await db.groups.find({}, {"_id": 0}).to_list(200)
    return groups

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, request: Request):
    user = await get_current_user(request)
    grp = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not grp:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    await db.groups.update_one({"group_id": group_id}, {"$addToSet": {"members": user['user_id']}})
    await db.users.update_one({"user_id": user['user_id']}, {"$set": {"group_id": group_id}})
    grp = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    return grp

@api_router.get("/groups/mine")
async def my_group(request: Request):
    user = await get_current_user(request)
    if not user.get('group_id'):
        return {"group": None, "members_info": []}
    grp = await db.groups.find_one({"group_id": user['group_id']}, {"_id": 0})
    if not grp:
        return {"group": None, "members_info": []}
    members_info = await db.users.find(
        {"user_id": {"$in": grp.get('members', [])}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "email": 1}
    ).to_list(100)
    return {"group": grp, "members_info": members_info}

# ---------------- Opportunities (seeded) ----------------
SEED_OPPORTUNITIES = [
    {
        "opp_id": "opp_001",
        "title": "Transformation du manioc en farine",
        "sector": "Agriculture",
        "location": "Région du Centre, Cameroun",
        "description": "Forte demande en farine de manioc dans les marchés urbains. Marge bénéficiaire élevée avec un équipement de transformation simple.",
        "image_url": "https://images.pexels.com/photos/31537320/pexels-photo-31537320.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "featured": True,
    },
    {
        "opp_id": "opp_002",
        "title": "Production de savon artisanal à l'huile de palme",
        "sector": "Artisanat",
        "location": "Province Orientale, RDC",
        "description": "Matières premières locales disponibles. Marché en croissance pour les produits naturels.",
        "image_url": "https://images.pexels.com/photos/36827828/pexels-photo-36827828.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "featured": False,
    },
    {
        "opp_id": "opp_003",
        "title": "Apiculture et vente de miel",
        "sector": "Agriculture",
        "location": "Plateaux, Gabon",
        "description": "Investissement modeste, retour rapide. Le miel rural est très recherché en ville.",
        "image_url": "https://images.unsplash.com/photo-1741940365831-1a1fdc2e33ff?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwcnVyYWwlMjB3b21lbiUyMGZhcm1pbmclMjBidXNpbmVzc3xlbnwwfHx8fDE3ODIzMDk3NTF8MA&ixlib=rb-4.1.0&q=85",
        "featured": False,
    },
    {
        "opp_id": "opp_004",
        "title": "Élevage de poulets de chair",
        "sector": "Élevage",
        "location": "Brazzaville, Congo",
        "description": "Cycle court (45 jours), forte demande urbaine. Idéal pour démarrer avec un petit groupe.",
        "image_url": "https://images.pexels.com/photos/33928802/pexels-photo-33928802.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "featured": False,
    },
    {
        "opp_id": "opp_005",
        "title": "Couture et confection de pagnes",
        "sector": "Artisanat",
        "location": "Bangui, RCA",
        "description": "Marché local stable. Possibilité de vente en ligne via WhatsApp pour étendre la clientèle.",
        "image_url": "https://images.pexels.com/photos/36827828/pexels-photo-36827828.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "featured": False,
    },
]

@api_router.get("/opportunities")
async def list_opportunities():
    return SEED_OPPORTUNITIES

# ---------------- Donors directory ----------------
SEED_DONORS = [
    # Cameroun
    {"donor_id": "d_cm_01", "name": "ONU Femmes Cameroun", "type": "ONG internationale", "country": "Cameroun",
     "sectors": ["Tous"], "description": "Programmes d'autonomisation économique des femmes, subventions pour coopératives.",
     "phone": "+237 222 50 47 47", "website": "https://africa.unwomen.org/fr/where-we-are/west-and-central-africa/cameroon", "city": "Yaoundé"},
    {"donor_id": "d_cm_02", "name": "ACEFA - Programme d'Appui aux Filières Agropastorales", "type": "Programme gouvernemental", "country": "Cameroun",
     "sectors": ["Agriculture", "Élevage"], "description": "Subventions matching pour groupes producteurs (40-70% du coût du projet).",
     "phone": "+237 222 22 51 96", "website": "https://www.acefa.cm", "city": "Yaoundé"},
    {"donor_id": "d_cm_03", "name": "MC² (Mutuelle Communautaire de Croissance)", "type": "Microfinance", "country": "Cameroun",
     "sectors": ["Tous"], "description": "Réseau de mutuelles villageoises, crédits adaptés aux femmes rurales (50 000 - 2M FCFA).",
     "phone": "+237 233 42 26 26", "website": "https://www.adafmc2.org", "city": "Bafoussam"},
    {"donor_id": "d_cm_04", "name": "Plan International Cameroun", "type": "ONG internationale", "country": "Cameroun",
     "sectors": ["Artisanat", "Agriculture"], "description": "Subventions et formation pour groupes de femmes et jeunes filles.",
     "phone": "+237 222 21 39 80", "website": "https://plan-international.org/cameroon", "city": "Yaoundé"},
    # Gabon
    {"donor_id": "d_ga_01", "name": "FODEX (Fonds Gabonais de l'Entrepreneuriat)", "type": "Programme gouvernemental", "country": "Gabon",
     "sectors": ["Tous"], "description": "Financement TPE/PME, crédit à partir de 500 000 FCFA, taux préférentiel femmes.",
     "phone": "+241 11 76 51 79", "website": "https://fodex.ga", "city": "Libreville"},
    {"donor_id": "d_ga_02", "name": "ONU Femmes Gabon", "type": "ONG internationale", "country": "Gabon",
     "sectors": ["Tous"], "description": "Appui à l'entrepreneuriat féminin et programmes communautaires.",
     "phone": "+241 11 73 84 21", "website": "https://africa.unwomen.org", "city": "Libreville"},
    {"donor_id": "d_ga_03", "name": "Caisse de Dépôts et de Consignations Gabon", "type": "Banque publique", "country": "Gabon",
     "sectors": ["Tous"], "description": "Crédits aux coopératives rurales, programmes inclusion financière.",
     "phone": "+241 11 79 79 79", "website": "https://cdc.ga", "city": "Libreville"},
    # RDC
    {"donor_id": "d_cd_01", "name": "FPI (Fonds de Promotion de l'Industrie)", "type": "Programme gouvernemental", "country": "RDC",
     "sectors": ["Artisanat", "Agriculture", "Élevage"], "description": "Crédits long terme pour PME et coopératives, taux 9%.",
     "phone": "+243 815 555 555", "website": "https://fpi.cd", "city": "Kinshasa"},
    {"donor_id": "d_cd_02", "name": "FINCA RDC", "type": "Microfinance", "country": "RDC",
     "sectors": ["Tous"], "description": "Crédits solidaires pour groupes de femmes (à partir de 100 USD).",
     "phone": "+243 999 911 011", "website": "https://finca.cd", "city": "Kinshasa"},
    {"donor_id": "d_cd_03", "name": "PADMPME (Projet d'Appui au Développement des MPME)", "type": "Programme gouvernemental", "country": "RDC",
     "sectors": ["Tous"], "description": "Subventions matching grants jusqu'à 50 000 USD, financé par Banque Mondiale.",
     "phone": "+243 815 015 015", "website": "https://padmpme.cd", "city": "Kinshasa"},
    {"donor_id": "d_cd_04", "name": "Vision Fund RDC", "type": "Microfinance", "country": "RDC",
     "sectors": ["Agriculture", "Artisanat"], "description": "Microcrédits ruraux, focus femmes et familles vulnérables.",
     "phone": "+243 970 010 010", "website": "https://visionfund.org/dr-congo", "city": "Goma"},
    # RCA
    {"donor_id": "d_cf_01", "name": "PNUD RCA - Programme Relèvement", "type": "ONG internationale", "country": "RCA",
     "sectors": ["Tous"], "description": "Subventions pour coopératives féminines, accompagnement business.",
     "phone": "+236 21 61 30 00", "website": "https://www.undp.org/fr/central-african-republic", "city": "Bangui"},
    {"donor_id": "d_cf_02", "name": "Catholic Relief Services (CRS) RCA", "type": "ONG internationale", "country": "RCA",
     "sectors": ["Agriculture", "Élevage"], "description": "Programmes SILC (épargne et crédit) pour groupes de femmes.",
     "phone": "+236 75 50 23 91", "website": "https://www.crs.org/our-work-overseas/where-we-work/central-african-republic", "city": "Bangui"},
    {"donor_id": "d_cf_03", "name": "COOPEC Centrafrique", "type": "Microfinance", "country": "RCA",
     "sectors": ["Tous"], "description": "Réseau de coopératives d'épargne et de crédit, services adaptés aux groupes ruraux.",
     "phone": "+236 21 61 09 60", "website": "https://coopec-ca.org", "city": "Bangui"},
    # Congo
    {"donor_id": "d_cg_01", "name": "MUCODEC (Mutuelle Congolaise d'Épargne et de Crédit)", "type": "Microfinance", "country": "Congo",
     "sectors": ["Tous"], "description": "1er réseau microfinance du Congo, crédits à partir de 50 000 FCFA pour groupes.",
     "phone": "+242 06 666 60 60", "website": "https://mucodec.com", "city": "Brazzaville"},
    {"donor_id": "d_cg_02", "name": "PRODER (Projet de Développement Rural)", "type": "Programme gouvernemental", "country": "Congo",
     "sectors": ["Agriculture", "Élevage"], "description": "Subventions matériel et formation pour groupements agricoles.",
     "phone": "+242 06 624 24 24", "website": "https://agriculture.gouv.cg", "city": "Brazzaville"},
    {"donor_id": "d_cg_03", "name": "ONU Femmes Congo", "type": "ONG internationale", "country": "Congo",
     "sectors": ["Tous"], "description": "Programmes d'autonomisation économique en zones rurales.",
     "phone": "+242 06 612 12 12", "website": "https://africa.unwomen.org", "city": "Brazzaville"},
    {"donor_id": "d_cg_04", "name": "Forum des Femmes Africaines (FAWE Congo)", "type": "ONG locale", "country": "Congo",
     "sectors": ["Artisanat", "Agriculture"], "description": "Subventions et mentorat pour entreprises féminines rurales.",
     "phone": "+242 05 555 55 55", "website": "https://fawe.org", "city": "Pointe-Noire"},
    # Tchad
    {"donor_id": "d_td_01", "name": "ONU Femmes Tchad", "type": "ONG internationale", "country": "Tchad",
     "sectors": ["Tous"], "description": "Programmes d'autonomisation économique et appui aux groupements féminins.",
     "phone": "+235 22 51 80 64", "website": "https://africa.unwomen.org", "city": "N'Djamena"},
    {"donor_id": "d_td_02", "name": "PARSAT (Projet d'Appui à la Résilience et Sécurité Alimentaire)", "type": "Programme gouvernemental", "country": "Tchad",
     "sectors": ["Agriculture", "Élevage"], "description": "Subventions matériel et formation pour coopératives rurales (cofinancement FIDA).",
     "phone": "+235 22 52 31 47", "website": "https://www.ifad.org/fr/web/operations/-/project/2000001255", "city": "N'Djamena"},
    {"donor_id": "d_td_03", "name": "URCOOPEC Tchad", "type": "Microfinance", "country": "Tchad",
     "sectors": ["Tous"], "description": "Réseau d'unions de coopératives d'épargne et de crédit pour zones rurales.",
     "phone": "+235 22 52 88 11", "website": "https://urcoopec.org", "city": "N'Djamena"},
    {"donor_id": "d_td_04", "name": "PNUD Tchad - Programme MPME", "type": "ONG internationale", "country": "Tchad",
     "sectors": ["Artisanat", "Agriculture"], "description": "Subventions pour micro et petites entreprises portées par les femmes.",
     "phone": "+235 22 52 27 56", "website": "https://www.undp.org/fr/chad", "city": "N'Djamena"},
    # Guinée Équatoriale
    {"donor_id": "d_gq_01", "name": "FOGAPYME (Fonds de Garantie PME)", "type": "Programme gouvernemental", "country": "Guinée Équatoriale",
     "sectors": ["Tous"], "description": "Garantie de crédit pour PME locales, accès facilité pour groupes structurés.",
     "phone": "+240 333 09 25 25", "website": "https://www.guineaecuatorialpress.com", "city": "Malabo"},
    {"donor_id": "d_gq_02", "name": "PNUD Guinée Équatoriale", "type": "ONG internationale", "country": "Guinée Équatoriale",
     "sectors": ["Tous"], "description": "Appui aux initiatives communautaires et autonomisation des femmes rurales.",
     "phone": "+240 333 09 28 87", "website": "https://www.undp.org/fr/equatorial-guinea", "city": "Malabo"},
    {"donor_id": "d_gq_03", "name": "CCEI Bank GE - Programme TPE", "type": "Banque publique", "country": "Guinée Équatoriale",
     "sectors": ["Artisanat", "Agriculture"], "description": "Microcrédits adaptés aux très petites entreprises et coopératives villageoises.",
     "phone": "+240 333 09 33 99", "website": "https://www.cceibankge.com", "city": "Bata"},
    {"donor_id": "d_gq_04", "name": "Caritas Guinée Équatoriale", "type": "ONG locale", "country": "Guinée Équatoriale",
     "sectors": ["Agriculture", "Artisanat"], "description": "Subventions et accompagnement de projets communautaires en milieu rural.",
     "phone": "+240 222 00 00 00", "website": "https://caritas.org", "city": "Malabo"},
]

@api_router.get("/donors")
async def list_donors(country: str | None = None):
    base = SEED_DONORS if not country or country == "Tous" else [d for d in SEED_DONORS if d["country"] == country]
    # enrich with ratings aggregate
    out = []
    for d in base:
        agg = await db.donor_ratings.aggregate([
            {"$match": {"donor_id": d["donor_id"]}},
            {"$group": {"_id": None, "avg": {"$avg": "$stars"}, "count": {"$sum": 1}}}
        ]).to_list(1)
        avg = round(agg[0]["avg"], 1) if agg else 0.0
        count = agg[0]["count"] if agg else 0
        out.append({**d, "avg_rating": avg, "rating_count": count})
    return out

@api_router.get("/donors/countries")
async def donor_countries():
    seen = []
    for d in SEED_DONORS:
        if d["country"] not in seen:
            seen.append(d["country"])
    return ["Tous"] + seen


class RatingCreate(BaseModel):
    stars: int
    outcome: str  # 'no_response' | 'responded' | 'funded' | 'rejected'
    comment: str = ""

@api_router.post("/donors/{donor_id}/rate")
async def rate_donor(donor_id: str, payload: RatingCreate, request: Request):
    user = await get_current_user(request)
    if not any(d["donor_id"] == donor_id for d in SEED_DONORS):
        raise HTTPException(status_code=404, detail="Bailleur introuvable")
    if payload.stars < 1 or payload.stars > 5:
        raise HTTPException(status_code=400, detail="stars must be 1..5")
    if payload.outcome not in ("no_response", "responded", "funded", "rejected"):
        raise HTTPException(status_code=400, detail="invalid outcome")
    doc = {
        "donor_id": donor_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "stars": payload.stars,
        "outcome": payload.outcome,
        "comment": payload.comment[:500],
        "created_at": datetime.now(timezone.utc),
    }
    # upsert per user per donor
    await db.donor_ratings.update_one(
        {"donor_id": donor_id, "user_id": user["user_id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}

@api_router.get("/donors/{donor_id}/reviews")
async def list_reviews(donor_id: str):
    if not any(d["donor_id"] == donor_id for d in SEED_DONORS):
        raise HTTPException(status_code=404, detail="Bailleur introuvable")
    reviews = await db.donor_ratings.find(
        {"donor_id": donor_id}, {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(100)
    agg = await db.donor_ratings.aggregate([
        {"$match": {"donor_id": donor_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$stars"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    avg = round(agg[0]["avg"], 1) if agg else 0.0
    count = agg[0]["count"] if agg else 0
    return {"reviews": reviews, "avg": avg, "count": count}

# ---------------- Training Modules (static) ----------------
TRAINING_MODULES = [
    {
        "module_id": "mod_001",
        "title": "Identifier une opportunité d'affaires",
        "icon": "compass",
        "duration": "20 min",
        "summary": "Apprenez à observer votre communauté pour découvrir des besoins non satisfaits.",
        "sections": [
            {
                "title": "Observer son environnement",
                "content": "Commencez par regarder autour de vous. Quels produits manquent au marché ? Que vos voisines achètent-elles ailleurs ? Notez chaque idée dans un cahier pendant une semaine."
            },
            {
                "title": "Écouter les besoins",
                "content": "Posez des questions simples : 'Qu'aimeriez-vous acheter plus facilement ?', 'Quel produit est trop cher ou trop loin ?'. Les meilleures idées viennent des conversations."
            },
            {
                "title": "Évaluer la faisabilité",
                "content": "Pour chaque idée : Ai-je les matières premières ? Combien de personnes sont prêtes à acheter ? À quel prix ? Y a-t-il déjà beaucoup de concurrentes ?"
            },
        ],
    },
    {
        "module_id": "mod_002",
        "title": "Créer son plan d'affaires",
        "icon": "file-text",
        "duration": "30 min",
        "summary": "Structurez votre projet en 5 étapes claires.",
        "sections": [
            {
                "title": "Le produit ou service",
                "content": "Décrivez précisément ce que vous vendez. À qui ? Quel est l'avantage par rapport à ce qui existe ?"
            },
            {
                "title": "Les coûts de départ",
                "content": "Listez tous les achats nécessaires : matériel, matières premières pour 1 mois, transport. Additionnez."
            },
            {
                "title": "Le prix de vente",
                "content": "Calculez le coût pour produire une unité, ajoutez votre marge (30-50%). Comparez avec les concurrents."
            },
            {
                "title": "Le plan de vente",
                "content": "Où vendrez-vous ? Marché, à domicile, livraison ? Combien d'unités par semaine ?"
            },
        ],
    },
    {
        "module_id": "mod_003",
        "title": "Gérer son argent",
        "icon": "wallet",
        "duration": "25 min",
        "summary": "Séparer l'argent du business et celui de la maison.",
        "sections": [
            {
                "title": "Tenir un cahier de comptes",
                "content": "Chaque jour, notez : ce qui rentre (ventes) et ce qui sort (achats, transport). Une page par jour suffit."
            },
            {
                "title": "Mettre de côté",
                "content": "Avant tout, mettez 10% des ventes dans une boîte fermée. C'est votre fonds de roulement pour racheter les matières premières."
            },
            {
                "title": "Tontine et épargne",
                "content": "Rejoignez une tontine du groupe. C'est un excellent moyen d'épargner et d'accéder à un capital plus important pour grandir."
            },
        ],
    },
    {
        "module_id": "mod_004",
        "title": "Vendre et communiquer",
        "icon": "megaphone",
        "duration": "20 min",
        "summary": "Faire connaître son produit sans publicité chère.",
        "sections": [
            {
                "title": "Le bouche-à-oreille",
                "content": "Vos premières clientes sont vos meilleures vendeuses. Offrez un petit cadeau à celle qui amène 3 nouvelles clientes."
            },
            {
                "title": "WhatsApp et statuts",
                "content": "Prenez de belles photos de vos produits. Postez-les en statut WhatsApp 2 fois par semaine. Créez un groupe 'Mes clientes'."
            },
            {
                "title": "Soigner la présentation",
                "content": "Un produit bien emballé se vend deux fois plus cher. Utilisez un papier propre, une étiquette avec votre nom."
            },
        ],
    },
    {
        "module_id": "mod_005",
        "title": "Grandir en groupe",
        "icon": "users",
        "duration": "15 min",
        "summary": "La force du collectif pour aller plus loin.",
        "sections": [
            {
                "title": "Acheter ensemble",
                "content": "Achetez les matières premières en gros avec le groupe. Vous obtiendrez de meilleurs prix et économiserez le transport."
            },
            {
                "title": "Se former mutuellement",
                "content": "Chaque membre a une compétence. Organisez une réunion mensuelle où une membre enseigne aux autres."
            },
            {
                "title": "Chercher un financement collectif",
                "content": "Les bailleurs préfèrent financer des groupes structurés plutôt que des individus. Préparez votre projet ensemble."
            },
        ],
    },
    {
        "module_id": "mod_006",
        "title": "Demander un financement",
        "icon": "hand-coins",
        "duration": "25 min",
        "summary": "Présenter son projet à des bailleurs et microfinances.",
        "sections": [
            {
                "title": "Préparer un dossier solide",
                "content": "Un bon dossier contient : le problème résolu, votre solution, le budget, le nombre de bénéficiaires et un calendrier."
            },
            {
                "title": "Les sources de financement",
                "content": "Microfinances locales, ONG (Plan International, ONU Femmes), programmes gouvernementaux, banques agricoles. Visitez l'agence la plus proche."
            },
            {
                "title": "Pitcher en 2 minutes",
                "content": "Phrase 1 : Qui vous êtes. Phrase 2 : Le problème. Phrase 3 : Votre solution. Phrase 4 : Le montant et l'impact. Entraînez-vous devant le groupe."
            },
        ],
    },
]

@api_router.get("/training/modules")
async def list_modules():
    return [{k: v for k, v in m.items() if k != 'sections'} for m in TRAINING_MODULES]

@api_router.get("/training/modules/{module_id}")
async def get_module(module_id: str):
    for m in TRAINING_MODULES:
        if m['module_id'] == module_id:
            return m
    raise HTTPException(status_code=404, detail="Module introuvable")

# ---------------- Funding Requests with AI ----------------
@api_router.post("/funding/generate")
async def generate_funding_pitch(payload: FundingRequestCreate, request: Request):
    user = await get_current_user(request)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM lib missing: {e}")

    system_msg = (
        "Tu es un expert en accompagnement de groupes de femmes rurales d'Afrique Centrale "
        "pour la création de petites entreprises. Tu rédiges en français, dans un style clair, "
        "professionnel et chaleureux. Tu produis un pitch et un mini plan d'affaires structuré, "
        "lisible par un bailleur de fonds (ONG, microfinance, programme gouvernemental)."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"pitch_{user['user_id']}_{uuid.uuid4().hex[:6]}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    prompt = f"""Rédige un pitch et un mini plan d'affaires pour ce projet d'un groupe de femmes rurales.
Utilise un format Markdown structuré avec ces sections exactes (titres en ## ) :

## Résumé exécutif
(3-4 phrases percutantes : qui, quoi, où, montant demandé)

## Le problème
(décris le besoin local concrètement)

## Notre solution
(explique le projet et ce qui le rend unique)

## Bénéficiaires & impact
(qui en profite, combien de personnes)

## Plan d'utilisation des fonds
(répartition réaliste du financement demandé en pourcentages, sous forme de liste)

## Pourquoi nous soutenir
(force du groupe, ancrage local, durabilité)

INFORMATIONS DU PROJET :
- Nom du projet : {payload.project_name}
- Secteur : {payload.sector}
- Problème identifié : {payload.problem}
- Solution proposée : {payload.solution}
- Montant recherché : {payload.target_amount}
- Bénéficiaires : {payload.beneficiaries}
- Porté par : {user.get('name', 'Un groupe de femmes')}

Rédige maintenant le document complet en français, prêt à être envoyé à un bailleur."""

    try:
        result = await chat.send_message(UserMessage(text=prompt))
        pitch_text = result if isinstance(result, str) else str(result)
    except Exception as e:
        logger.exception("AI generation failed")
        raise HTTPException(status_code=500, detail=f"Génération échouée: {e}")

    req_id = f"fund_{uuid.uuid4().hex[:10]}"
    record = {
        "request_id": req_id,
        "user_id": user['user_id'],
        "group_id": user.get('group_id'),
        "project_name": payload.project_name,
        "sector": payload.sector,
        "problem": payload.problem,
        "solution": payload.solution,
        "target_amount": payload.target_amount,
        "beneficiaries": payload.beneficiaries,
        "pitch": pitch_text,
        "status": "draft",
        "created_at": datetime.now(timezone.utc),
    }
    await db.funding_requests.insert_one(record)
    record.pop("_id", None)
    return record

@api_router.get("/funding/mine")
async def list_my_funding(request: Request):
    user = await get_current_user(request)
    items = await db.funding_requests.find(
        {"user_id": user['user_id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items

# ---------------- Root ----------------
@api_router.get("/")
async def root():
    return {"message": "Éclosion API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.groups.create_index("group_id", unique=True)
    logger.info("Indexes ready")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
