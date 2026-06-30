"""Backend API tests for Éclosion."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://rural-womens-hub.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

# ---------- Health / Root ----------
def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "Éclosion" in r.json().get("message", "")

# ---------- Opportunities ----------
def test_opportunities_returns_5(api):
    r = api.get(f"{BASE_URL}/api/opportunities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 5
    item = data[0]
    for k in ("opp_id", "title", "sector", "location", "description", "image_url"):
        assert k in item, f"missing {k}"
    assert item["opp_id"] == "opp_001"

# ---------- Training modules ----------
def test_training_modules_list(api):
    r = api.get(f"{BASE_URL}/api/training/modules")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6
    # list endpoint should NOT include sections
    assert all("sections" not in m for m in data)
    assert data[0]["module_id"] == "mod_001"

def test_training_module_detail(api):
    r = api.get(f"{BASE_URL}/api/training/modules/mod_001")
    assert r.status_code == 200
    data = r.json()
    assert data["module_id"] == "mod_001"
    assert "sections" in data
    assert len(data["sections"]) >= 1
    assert "title" in data["sections"][0] and "content" in data["sections"][0]

def test_training_module_not_found(api):
    r = api.get(f"{BASE_URL}/api/training/modules/does_not_exist")
    assert r.status_code == 404

# ---------- Auth ----------
def test_auth_session_invalid_token(api):
    r = api.post(f"{BASE_URL}/api/auth/session", json={"session_token": "INVALID_FAKE_TOKEN_XXX"})
    assert r.status_code == 401

def test_auth_me_without_token(api):
    r = api.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401

def test_auth_me_with_bad_token(api):
    r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bogus"})
    assert r.status_code == 401

# ---------- Protected: Groups ----------
def test_create_group_requires_auth(api):
    r = api.post(f"{BASE_URL}/api/groups", json={
        "name": "TEST_grp", "description": "x", "location": "Yaoundé"
    })
    assert r.status_code == 401

def test_join_group_requires_auth(api):
    r = api.post(f"{BASE_URL}/api/groups/grp_x/join")
    assert r.status_code == 401

def test_my_group_requires_auth(api):
    r = api.get(f"{BASE_URL}/api/groups/mine")
    assert r.status_code == 401

def test_group_messages_requires_auth(api):
    r = api.get(f"{BASE_URL}/api/groups/mine/messages")
    assert r.status_code == 401

def test_create_group_message_requires_auth(api):
    r = api.post(f"{BASE_URL}/api/groups/mine/messages", json={"content": "Bonjour"})
    assert r.status_code == 401

def test_list_groups_public(api):
    # Listing groups is not protected in code; ensure 200
    r = api.get(f"{BASE_URL}/api/groups")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

# ---------- Protected: Funding ----------
def test_funding_generate_requires_auth(api):
    r = api.post(f"{BASE_URL}/api/funding/generate", json={
        "project_name": "TEST", "problem": "p", "solution": "s",
        "target_amount": "500000", "beneficiaries": "20", "sector": "Agri"
    })
    assert r.status_code == 401

def test_funding_mine_requires_auth(api):
    r = api.get(f"{BASE_URL}/api/funding/mine")
    assert r.status_code == 401

def test_funding_pdf_requires_auth(api):
    r = api.get(f"{BASE_URL}/api/funding/fund_x/pdf")
    assert r.status_code == 401
