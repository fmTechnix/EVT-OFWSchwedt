
from flask import Flask, request, redirect, url_for, render_template, session, flash, send_from_directory
import os, json
from pathlib import Path

# --- App setup ---
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.environ.get("EVT_SECRET_KEY", "dev-secret-change-me")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

USERS_FILE = DATA_DIR / "users.json"
VEHICLES_FILE = DATA_DIR / "vehicles.json"
KAMERADEN_FILE = DATA_DIR / "kameraden.json"
EINSATZ_FILE = DATA_DIR / "einsatz.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

def read_json(path, default):
    if not path.exists():
        write_json(path, default)
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --- Minimal auth helpers ---
def current_user():
    username = session.get("username")
    if not username:
        return None
    users = read_json(USERS_FILE, {})
    u = users.get(username)
    if u:
        u["username"] = username
    return u

def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user():
            flash("Bitte einloggen.", "warn")
            return redirect(url_for("login_view"))
        return f(*args, **kwargs)
    return wrapper

def role_required(role):
    def decorator(f):
        from functools import wraps
        @wraps(f)
        def wrapper(*args, **kwargs):
            u = current_user()
            if not u or u.get("role") not in ([role] if isinstance(role, str) else role):
                flash("Keine Berechtigung.", "error")
                return redirect(url_for("dashboard_view"))
            return f(*args, **kwargs)
        return wrapper
    return decorator

# --- Ensure default data exists ---
if not USERS_FILE.exists():
    write_json(USERS_FILE, {
        "admin": {"password": "admin", "role": "admin", "name": "Admin"},
        "member": {"password": "member", "role": "member", "name": "Mitglied"}
    })

if not VEHICLES_FILE.exists():
    write_json(VEHICLES_FILE, [
        {"id": 1, "name": "HLF 20", "funk": "Florian Schwedt 1/46/1", "besatzung": 9},
        {"id": 2, "name": "DLK 23/12", "funk": "Florian Schwedt 1/33/1", "besatzung": 3}
    ])

if not KAMERADEN_FILE.exists():
    write_json(KAMERADEN_FILE, [
        {"id": 1, "name": "Max Mustermann", "qualifikationen": ["TM", "Sprechfunker"]},
        {"id": 2, "name": "Anna Beispiel", "qualifikationen": ["TM", "AGT"]}
    ])

if not SETTINGS_FILE.exists():
    write_json(SETTINGS_FILE, {
        "schichtlaenge_std": 12,
        "min_agt": 2,
        "min_maschinist": 1,
        "min_gf": 1
    })

if not EINSATZ_FILE.exists():
    write_json(EINSATZ_FILE, {"stichwort": "B: Kleinbrand", "bemerkung": "", "mannschaftsbedarf": 9})

# --- Routes ---
@app.get("/", endpoint="root")
def root():
    if current_user():
        return redirect(url_for("dashboard_view"))
    return redirect(url_for("login_view"))

@app.route("/login", methods=["GET", "POST"], endpoint="login_view")
def login_view():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        users = read_json(USERS_FILE, {})
        u = users.get(username)
        if u and u.get("password") == password:
            session["username"] = username
            session["role"] = u.get("role")
            session["name"] = u.get("name", username)
            flash("Erfolgreich eingeloggt.", "ok")
            return redirect(url_for("dashboard_view"))
        flash("Login fehlgeschlagen.", "error")
    return render_template("login.html")

@app.get("/logout", endpoint="logout_view")
def logout_view():
    session.clear()
    flash("Abgemeldet.", "ok")
    return redirect(url_for("login_view"))

@app.get("/dashboard", endpoint="dashboard_view")
@login_required
def dashboard_view():
    vehicles = read_json(VEHICLES_FILE, [])
    kameraden = read_json(KAMERADEN_FILE, [])
    einsatz = read_json(EINSATZ_FILE, {})
    settings = read_json(SETTINGS_FILE, {})
    return render_template("dashboard.html",
                           vehicles=vehicles,
                           kameraden=kameraden,
                           einsatz=einsatz,
                           settings=settings,
                           user=current_user())

@app.route("/fahrzeuge", methods=["GET", "POST"], endpoint="vehicles_view")
@login_required
@role_required(["admin"])
def vehicles_view():
    vehicles = read_json(VEHICLES_FILE, [])
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        funk = request.form.get("funk", "").strip()
        besatzung = int(request.form.get("besatzung", "0") or 0)
        if name:
            new_id = (max([v["id"] for v in vehicles]) + 1) if vehicles else 1
            vehicles.append({"id": new_id, "name": name, "funk": funk, "besatzung": besatzung})
            write_json(VEHICLES_FILE, vehicles)
            flash("Fahrzeug hinzugefügt.", "ok")
        return redirect(url_for("vehicles_view"))
    return render_template("fahrzeuge.html", vehicles=vehicles)

@app.route("/fahrzeuge/<int:vid>/delete", methods=["POST"], endpoint="vehicle_delete")
@login_required
@role_required(["admin"])
def vehicle_delete(vid):
    vehicles = read_json(VEHICLES_FILE, [])
    vehicles = [v for v in vehicles if v["id"] != vid]
    write_json(VEHICLES_FILE, vehicles)
    flash("Fahrzeug gelöscht.", "ok")
    return redirect(url_for("vehicles_view"))

@app.route("/kameraden", methods=["GET", "POST"], endpoint="kameraden_view")
@login_required
def kameraden_view():
    kameraden = read_json(KAMERADEN_FILE, [])
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        quals = request.form.getlist("qualifikationen")
        if name:
            new_id = (max([k["id"] for k in kameraden]) + 1) if kameraden else 1
            kameraden.append({"id": new_id, "name": name, "qualifikationen": quals})
            write_json(KAMERADEN_FILE, kameraden)
            flash("Kamerad hinzugefügt.", "ok")
        return redirect(url_for("kameraden_view"))
    all_quals = ["TM", "AGT", "Maschinist", "GF", "Sprechfunker", "San"]
    return render_template("kameraden.html", kameraden=kameraden, all_quals=all_quals)

@app.post("/kameraden/<int:kid>/delete")
@login_required
@role_required(["admin"])
def kamerad_delete(kid):
    kameraden = read_json(KAMERADEN_FILE, [])
    kameraden = [k for k in kameraden if k["id"] != kid]
    write_json(KAMERADEN_FILE, kameraden)
    flash("Kamerad gelöscht.", "ok")
    return redirect(url_for("kameraden_view"))

@app.get("/seed-kameraden", endpoint="seed_kameraden_view")
@login_required
@role_required(["admin"])
def seed_kameraden_view():
    import random
    first = ["Max","Anna","Felix","Laura","Uwe","Marco","Sebastian","Lisa","Markus","Nina","Timo","Kevin","Julia","Tom","Sarah","Jonas","Miriam","Kai","Sven","Lea"]
    last = ["Müller","Schmidt","Meier","Schulz","Fischer","Weber","Wagner","Becker","Hoffmann","Keller","König","Krause","Brandt","Jäger","Vogel","Berg","Arnold","Lorenz","Roth","Pohl"]
    quals_all = ["TM","AGT","Maschinist","GF","Sprechfunker","San"]
    kameraden = []
    for i in range(1, 78):  # 77 Kameraden
        name = f"{random.choice(first)} {random.choice(last)}"
        q = set()
        # Always TM
        q.add("TM")
        # Randomly assign others with weighted variety
        if random.random() < 0.45: q.add("AGT")
        if random.random() < 0.25: q.add("Maschinist")
        if random.random() < 0.15: q.add("GF")
        if random.random() < 0.55: q.add("Sprechfunker")
        if random.random() < 0.30: q.add("San")
        kameraden.append({"id": i, "name": name, "qualifikationen": sorted(list(q))})
    write_json(KAMERADEN_FILE, kameraden)
    flash("77 Beispielkameraden generiert.", "ok")
    return redirect(url_for("kameraden_view"))

@app.route("/mein-einsatz", methods=["GET", "POST"], endpoint="mein_einsatz_view")
@login_required
def mein_einsatz_view():
    einsatz = read_json(EINSATZ_FILE, {})
    settings = read_json(SETTINGS_FILE, {})
    kameraden = read_json(KAMERADEN_FILE, [])
    # Simple Bedarfserfüllung prüfen
    def count_with(q): return sum(1 for k in kameraden if q in k.get("qualifikationen", []))
    check = {
        "AGT": count_with("AGT"),
        "Maschinist": count_with("Maschinist"),
        "GF": count_with("GF"),
        "gesamt": len(kameraden)
    }
    need = {
        "min_agt": settings.get("min_agt", 2),
        "min_maschinist": settings.get("min_maschinist", 1),
        "min_gf": settings.get("min_gf", 1),
        "mannschaftsbedarf": einsatz.get("mannschaftsbedarf", 9)
    }
    ok = (check["AGT"] >= need["min_agt"] and
          check["Maschinist"] >= need["min_maschinist"] and
          check["GF"] >= need["min_gf"] and
          check["gesamt"] >= need["mannschaftsbedarf"])
    return render_template("mein_einsatz.html", einsatz=einsatz, settings=settings, check=check, need=need, ok=ok)

@app.route("/einstellungen", methods=["GET", "POST"], endpoint="einstellungen_view")
@login_required
@role_required(["admin"])
def einstellungen_view():
    settings = read_json(SETTINGS_FILE, {})
    einsatz = read_json(EINSATZ_FILE, {})
    if request.method == "POST":
        settings["schichtlaenge_std"] = int(request.form.get("schichtlaenge_std", settings.get("schichtlaenge_std", 12)))
        settings["min_agt"] = int(request.form.get("min_agt", settings.get("min_agt", 2)))
        settings["min_maschinist"] = int(request.form.get("min_maschinist", settings.get("min_maschinist", 1)))
        settings["min_gf"] = int(request.form.get("min_gf", settings.get("min_gf", 1)))
        einsatz["stichwort"] = request.form.get("stichwort", einsatz.get("stichwort","")).strip()
        einsatz["mannschaftsbedarf"] = int(request.form.get("mannschaftsbedarf", einsatz.get("mannschaftsbedarf",9)))
        einsatz["bemerkung"] = request.form.get("bemerkung", einsatz.get("bemerkung","")).strip()
        write_json(SETTINGS_FILE, settings)
        write_json(EINSATZ_FILE, einsatz)
        flash("Einstellungen gespeichert.", "ok")
        return redirect(url_for("einstellungen_view"))
    return render_template("einstellungen.html", settings=settings, einsatz=einsatz)

# --- Static logo fallback ---
@app.get("/logo.png")
def logo():
    return send_from_directory(app.static_folder, "logo.png")

# --- Error pages ---
@app.errorhandler(404)
def not_found(e):
    return render_template("fehler.html", code=404, msg="Seite nicht gefunden"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template("fehler.html", code=500, msg="Serverfehler"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
