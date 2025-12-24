import json
import os
import smtplib
import sqlite3
import uuid
from datetime import datetime, timedelta
from email.message import EmailMessage

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import csv
from io import StringIO

# --- Flask Initialization ---
app = Flask(__name__)
CORS(app)

# --- Paths & Constants ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "assetflow.db")
FRONTEND_DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
LEGACY_FRONTEND = os.path.join(BASE_DIR, "appupdate.html")
FRONTEND_ENTRY = "index.html"
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "properties")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

COLLECTIONS = [
    "users",
    "assets",
    "loans",
    "maintenances",
    "procurements",
    "properties",
    "vendors",
    "activities",
    "notifications",
]

# --- SMTP Configuration ---
SMTP_CONFIG = {
    "host": os.getenv("SMTP_HOST", ""),
    "port": int(os.getenv("SMTP_PORT", "587")),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASS", ""),
    "from_email": os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", "")),
    "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
}

# --- Auth/OTP Stores (In-Memory) ---
OTP_STORE: dict[str, dict] = {}
SESSIONS: set[str] = set()


# --- Database Helpers -----------------------------------------------------
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            collection TEXT NOT NULL,
            document TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection)"
    )
    conn.commit()
    conn.close()
    seed_database()


def seed_database():
    conn = get_connection()
    cursor = conn.execute("SELECT COUNT(*) AS total FROM records")
    total = cursor.fetchone()["total"]
    if total:
        conn.close()
        return

    now = datetime.now()

    seed_data = {
        "users": [
            {
                "id": "admin-mock-1",
                "email": "admin@org.com",
                "full_name": "Admin User",
                "role": "admin",
                "created_date": now.isoformat(),
                "department": "IT",
                "phone": "+919999911111",
                "employee_id": "ADM001",
            },
            {
                "id": "manager-mock-1",
                "email": "manager@org.com",
                "full_name": "Manager Smith",
                "role": "manager",
                "created_date": now.isoformat(),
                "department": "Operations",
                "phone": "+919876543210",
                "employee_id": "MGR005",
            },
            {
                "id": "user-mock-1",
                "email": "user@org.com",
                "full_name": "Standard User",
                "role": "user",
                "created_date": now.isoformat(),
                "department": "Sales",
                "phone": "+919000000000",
                "employee_id": "USR100",
            },
        ],
        "assets": [
            {
                "id": "ast-001",
                "name": "MacBook Pro M3",
                "asset_id": "CMP-001",
                "category": "computer",
                "status": "active",
                "purchase_date": "2024-01-15",
                "purchase_value": 250000,
                "current_value": 240000,
                "serial_number": "SN123456789",
                "manufacturer": "Apple",
                "warranty_expiry": "2027-01-15",
                "assigned_to_email": "user@org.com",
                "owner_email": "admin@org.com",
                "location": "Floor 5, Desk 3",
                "notes": "High-end laptop for development team.",
                "created_date": now.isoformat(),
            },
            {
                "id": "ast-002",
                "name": "Office Chair (Ergo)",
                "asset_id": "FUR-010",
                "category": "furniture",
                "status": "in_storage",
                "purchase_date": "2023-05-20",
                "purchase_value": 15000,
                "current_value": 10000,
                "serial_number": "CHAIR101",
                "manufacturer": "Herman",
                "warranty_expiry": "2028-05-20",
                "assigned_to_email": "admin@org.com",
                "owner_email": "admin@org.com",
                "location": "Warehouse A",
                "notes": "Spare ergonomic chair.",
                "created_date": now.isoformat(),
            },
            {
                "id": "ast-003",
                "name": "Server Rack 30U",
                "asset_id": "NET-050",
                "category": "networking",
                "status": "in_maintenance",
                "purchase_date": "2022-08-01",
                "purchase_value": 80000,
                "current_value": 50000,
                "serial_number": "RACK005",
                "manufacturer": "Dell",
                "warranty_expiry": "2025-08-01",
                "assigned_to_email": "manager@org.com",
                "owner_email": "admin@org.com",
                "location": "Server Room",
                "notes": "Scheduled maintenance for cooling unit.",
                "created_date": now.isoformat(),
            },
        ],
        "loans": [
            {
                "id": "loan-001",
                "asset_id": "ast-001",
                "asset_name": "MacBook Pro M3",
                "borrower_email": "user@org.com",
                "borrower_name": "Standard User",
                "loan_date": now.isoformat().split("T")[0],
                "expected_return_date": (now + timedelta(days=30)).isoformat().split("T")[0],
                "purpose": "Client Presentation",
                "condition_at_loan": "good",
                "notes": "",
                "status": "active",
                "created_date": now.isoformat(),
            }
        ],
        "maintenances": [
            {
                "id": "maint-001",
                "asset_id": "ast-003",
                "asset_name": "Server Rack 30U",
                "title": "Cooling Fan Replacement",
                "description": "The primary cooling fan is making noise and needs replacement.",
                "priority": "high",
                "status": "pending",
                "scheduled_date": (now + timedelta(days=4)).isoformat().split("T")[0],
                "technician": "Vendor Tech",
                "notes": "",
                "created_date": now.isoformat(),
                "created_by": "manager@org.com",
            }
        ],
        "procurements": [
            {
                "id": "proc-001",
                "item_name": "New Desks (x10)",
                "category": "furniture",
                "quantity": 10,
                "estimated_cost": 12000,
                "total_cost": 120000,
                "justification": "Expanding team requires new office furniture.",
                "urgency": "medium",
                "status": "pending",
                "created_date": now.isoformat(),
                "created_by": "manager@org.com",
            }
        ],
        "properties": [],
        "vendors": [],
        "activities": [
            {
                "id": "act-001",
                "user_email": "admin@org.com",
                "user_name": "Admin User",
                "action": "CREATE_ASSET",
                "details": 'created a new asset: "MacBook Pro M3".',
                "asset_name": "MacBook Pro M3",
                "created_date": now.isoformat(),
            },
            {
                "id": "act-002",
                "user_email": "user@org.com",
                "user_name": "Standard User",
                "action": "CREATE_LOAN",
                "details": 'created a new loan for "MacBook Pro M3".',
                "asset_name": "MacBook Pro M3",
                "created_date": now.isoformat(),
            },
        ],
        "notifications": [],
    }

    for collection, documents in seed_data.items():
        for doc in documents:
            conn.execute(
                "INSERT INTO records (id, collection, document) VALUES (?, ?, ?)",
                (doc["id"], collection, json.dumps(doc)),
            )
    conn.commit()
    conn.close()


def db_list(collection):
    conn = get_connection()
    rows = conn.execute(
        "SELECT document FROM records WHERE collection = ?", (collection,)
    ).fetchall()
    conn.close()
    documents = [json.loads(row["document"]) for row in rows]
    try:
        documents.sort(
            key=lambda doc: doc.get("created_date", "1970-01-01T00:00:00"), reverse=True
        )
    except Exception:
        pass
    return documents


def db_get(collection, doc_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT document FROM records WHERE collection = ? AND id = ?",
        (collection, doc_id),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row["document"])


def db_insert(collection, document):
    doc_id = document.get("id") or str(uuid.uuid4())
    document["id"] = doc_id
    if "created_date" not in document:
        document["created_date"] = datetime.now().isoformat()
    conn = get_connection()
    conn.execute(
        "INSERT INTO records (id, collection, document) VALUES (?, ?, ?)",
        (doc_id, collection, json.dumps(document)),
    )
    conn.commit()
    conn.close()
    return document


def db_update(collection, doc_id, updates):
    existing = db_get(collection, doc_id)
    if not existing:
        return None
    existing.update(updates)
    existing["modified_date"] = datetime.now().isoformat()
    conn = get_connection()
    conn.execute(
        "UPDATE records SET document = ? WHERE id = ? AND collection = ?",
        (json.dumps(existing), doc_id, collection),
    )
    conn.commit()
    conn.close()
    return existing


def db_delete(collection, doc_id):
    conn = get_connection()
    conn.execute(
        "DELETE FROM records WHERE id = ? AND collection = ?", (doc_id, collection)
    )
    conn.commit()
    conn.close()


def get_user_by_email(email: str, include_password: bool = False):
    """Get user by email. By default, excludes password_hash for security."""
    conn = get_connection()
    row = conn.execute(
        "SELECT document FROM records WHERE collection = ? AND json_extract(document, '$.email') = ?",
        ("users", email),
    ).fetchone()
    conn.close()
    if not row:
        return None
    user = json.loads(row["document"])
    if not include_password:
        user.pop("password_hash", None)
    return user


def ensure_user(email: str, password_hash: str = None):
    """Ensure a user exists. If password_hash is provided, set/update it."""
    user = get_user_by_email(email)
    if user:
        if password_hash:
            # Update existing user with password if provided
            if not user.get("password_hash") or user.get("password_hash") != password_hash:
                user["password_hash"] = password_hash
                db_update("users", user["id"], {"password_hash": password_hash})
                user = get_user_by_email(email)  # Refresh
        return user
    # Create new user
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": email.split("@")[0].title(),
        "role": "user",
        "created_date": datetime.now().isoformat(),
        "department": "",
        "phone": "",
        "employee_id": "",
    }
    if password_hash:
        user["password_hash"] = password_hash
    return db_insert("users", user)


# Initialize database on import
init_db()


# --- Utility Helpers ------------------------------------------------------
def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    import random
    return str(random.randint(100000, 999999))


def send_otp_email(email: str, code: str) -> None:
    missing = [key for key in ("host", "port") if not SMTP_CONFIG.get(key)]
    if not SMTP_CONFIG["from_email"]:
        missing.append("from_email")

    if missing or not SMTP_CONFIG["user"] or not SMTP_CONFIG["password"]:
        print(
            f"[AUTH] OTP for {email}: {code} (valid 5 minutes) -- SMTP not configured, falling back to console log."
        )
        return

    msg = EmailMessage()
    msg["Subject"] = "Your AssetFlow OTP Code"
    msg["From"] = SMTP_CONFIG["from_email"]
    msg["To"] = email
    msg.set_content(
        f"Hello,\n\nYour verification code for AssetFlow is {code}. "
        "This code expires in 5 minutes.\n\nIf you did not request this, you can ignore this email.\n\nThanks,\nAssetFlow"
    )

    try:
        with smtplib.SMTP(SMTP_CONFIG["host"], SMTP_CONFIG["port"]) as server:
            if SMTP_CONFIG["use_tls"]:
                server.starttls()
            server.login(SMTP_CONFIG["user"], SMTP_CONFIG["password"])
            server.send_message(msg)
        print(f"[AUTH] OTP email sent to {email}")
    except Exception as exc:
        print(f"[AUTH] Failed to send OTP email to {email}: {exc}")
        print(f"[AUTH] OTP for {email}: {code} (valid 5 minutes)")


def create_metadata(user_email):
    return {
        "id": str(uuid.uuid4()),
        "created_date": datetime.now().isoformat(),
        "created_by": user_email,
    }


def get_user_from_request_header(req):
    user_email = (req.headers.get("X-User-Email") or "").strip().lower()
    if not user_email or user_email not in SESSIONS:
        return None
    return get_user_by_email(user_email)


def validate_collection(collection_name):
    if collection_name not in COLLECTIONS:
        return False
    return True


# --- Frontend Serving -----------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "API endpoint not found"}), 404

    if os.path.exists(FRONTEND_DIST_DIR):
        full_path = os.path.join(FRONTEND_DIST_DIR, path)
        if path and os.path.isfile(full_path):
            return send_from_directory(FRONTEND_DIST_DIR, path)
        return send_from_directory(FRONTEND_DIST_DIR, FRONTEND_ENTRY)

    if os.path.exists(LEGACY_FRONTEND):
        return send_from_directory(BASE_DIR, "appupdate.html")

    return jsonify({"error": "Frontend build not found"}), 404


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "Asset Management API is Running", "collections": COLLECTIONS}), 200


# --- API: Auth & Users ----------------------------------------------------
@app.route("/api/user/me", methods=["GET"])
def get_current_user():
    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(user), 200


@app.route("/api/auth/request_otp", methods=["POST"])
def request_otp():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email required"}), 400

    ensure_user(email)
    code = generate_otp()
    OTP_STORE[email] = {"code": code, "expires_at": datetime.now() + timedelta(minutes=5)}
    send_otp_email(email, code)
    return jsonify({"message": "OTP sent"}), 200


@app.route("/api/auth/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    record = OTP_STORE.get(email)

    print(f"[AUTH] Verify attempt for {email}: code={code}, stored={record['code'] if record else 'None'}")
    
    if not record:
        print(f"[AUTH] No OTP record found for {email}")
        return jsonify({"error": "Invalid or expired OTP"}), 400
    
    if record["code"] != code:
        print(f"[AUTH] Code mismatch: expected {record['code']}, got {code}")
        return jsonify({"error": "Invalid or expired OTP"}), 400
    
    if datetime.now() > record["expires_at"]:
        print(f"[AUTH] OTP expired for {email}")
        return jsonify({"error": "Invalid or expired OTP"}), 400

    user = ensure_user(email)
    SESSIONS.add(email)
    OTP_STORE.pop(email, None)
    print(f"[AUTH] Successfully authenticated {email}")
    return jsonify({"message": "Authenticated", "user": user}), 200


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    
    if not email:
        return jsonify({"error": "Email required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    # Check if user already exists
    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "User with this email already exists"}), 400
    
    password_hash = generate_password_hash(password)
    user = ensure_user(email, password_hash)
    
    if full_name:
        user["full_name"] = full_name
        db_update("users", user["id"], {"full_name": full_name})
        user = get_user_by_email(email)  # Refresh (already excludes password_hash)
    else:
        # Remove password_hash from response
        user.pop("password_hash", None)
    
    SESSIONS.add(email)
    print(f"[AUTH] New user signed up: {email}")
    return jsonify({"message": "Account created successfully", "user": user}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    user = get_user_by_email(email, include_password=True)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    
    password_hash = user.get("password_hash")
    if not password_hash:
        return jsonify({"error": "Password not set. Please use OTP login or reset password"}), 401
    
    if not check_password_hash(password_hash, password):
        print(f"[AUTH] Failed password attempt for {email}")
        return jsonify({"error": "Invalid email or password"}), 401
    
    SESSIONS.add(email)
    print(f"[AUTH] Successfully authenticated {email} via password")
    # Remove password_hash before returning user
    user.pop("password_hash", None)
    return jsonify({"message": "Authenticated", "user": user}), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    if email in SESSIONS:
        SESSIONS.remove(email)
    return jsonify({"message": "Logged out"}), 200


# --- Generic CRUD Endpoints ----------------------------------------------
@app.route("/api/<collection_name>", methods=["GET"])
def list_documents(collection_name):
    if not validate_collection(collection_name):
        return jsonify({"error": "Collection not found"}), 404

    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    docs = db_list(collection_name)

    if collection_name == "assets" and user["role"] != "admin":
        docs = [doc for doc in docs if doc.get("assigned_to_email") == user["email"]]

    if collection_name in {"loans", "maintenances", "procurements"} and user["role"] == "user":
        docs = [
            doc
            for doc in docs
            if doc.get("created_by") == user["email"] or doc.get("borrower_email") == user["email"]
        ]

    return jsonify(docs), 200


@app.route("/api/<collection_name>/<doc_id>", methods=["GET"])
def get_document(collection_name, doc_id):
    if not validate_collection(collection_name):
        return jsonify({"error": "Collection not found"}), 404

    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    document = db_get(collection_name, doc_id)
    if not document:
        return jsonify({"error": f"{collection_name[:-1].capitalize()} not found"}), 404

    return jsonify(document), 200


@app.route("/api/<collection_name>", methods=["POST"])
def create_document(collection_name):
    if not validate_collection(collection_name):
        return jsonify({"error": "Collection not found"}), 404

    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    metadata = create_metadata(user["email"])

    if collection_name in {"maintenances", "procurements"}:
        payload["created_by"] = user["email"]

    if collection_name == "users":
        payload.setdefault("full_name", user["full_name"])
        payload.setdefault("role", user["role"])

    if collection_name == "notifications":
        payload.setdefault("user_email", user["email"])
        payload["read"] = False

    if collection_name == "procurements":
        quantity = int(payload.get("quantity", 1) or 1)
        cost = float(payload.get("estimated_cost", 0) or 0)
        payload["total_cost"] = quantity * cost

    document = db_insert(collection_name, {**payload, **metadata})
    return jsonify(document), 201


@app.route("/api/<collection_name>/<doc_id>", methods=["PUT"])
def update_document(collection_name, doc_id):
    if not validate_collection(collection_name):
        return jsonify({"error": "Collection not found"}), 404

    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    payload.pop("id", None)
    payload.pop("created_date", None)
    payload.pop("created_by", None)

    if collection_name == "procurements" and (
        "quantity" in payload or "estimated_cost" in payload
    ):
        existing = db_get(collection_name, doc_id)
        if not existing:
            return jsonify({"error": "Procurement not found"}), 404
        quantity = int(payload.get("quantity", existing.get("quantity", 1)) or 1)
        cost = float(payload.get("estimated_cost", existing.get("estimated_cost", 0)) or 0)
        payload["total_cost"] = quantity * cost

    document = db_update(collection_name, doc_id, payload)
    if not document:
        return jsonify({"error": f"{collection_name[:-1].capitalize()} not found"}), 404
    return jsonify(document), 200


@app.route("/api/<collection_name>/<doc_id>", methods=["DELETE"])
def delete_document(collection_name, doc_id):
    if not validate_collection(collection_name):
        return jsonify({"error": "Collection not found"}), 404

    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    document = db_get(collection_name, doc_id)
    if not document:
        return jsonify({"error": f"{collection_name[:-1].capitalize()} not found"}), 404

    db_delete(collection_name, doc_id)
    return "", 204


# --- Custom Endpoints -----------------------------------------------------
@app.route("/api/notifications/mark_all_read", methods=["PUT"])
def mark_all_notifications_read():
    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    count = 0
    notifications = db_list("notifications")
    for notification in notifications:
        if notification.get("user_email") == user["email"] and not notification.get("read"):
            db_update("notifications", notification["id"], {"read": True})
            count += 1

    return jsonify({"message": f"{count} notifications marked as read."}), 200


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/upload/property-image", methods=["POST"])
def upload_property_image():
    """Upload a property image."""
    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to make filename unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        # Return relative URL path
        image_url = f"/api/uploads/properties/{unique_filename}"
        return jsonify({"url": image_url, "filename": unique_filename}), 200

    return jsonify({"error": "Invalid file type"}), 400


@app.route("/api/uploads/properties/<filename>")
def serve_property_image(filename):
    """Serve uploaded property images."""
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/api/reports/assets/csv", methods=["GET"])
def export_assets_csv():
    """Export assets as CSV."""
    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    assets = db_list("assets")
    # Filter assets based on user role
    if user["role"] != "admin":
        assets = [a for a in assets if a.get("assigned_to_email") == user["email"]]

    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Asset ID", "Name", "Category", "Status", "Purchase Date",
        "Purchase Value", "Current Value", "Serial Number", "Manufacturer",
        "Warranty Expiry", "Assigned To", "Owner", "Location", "Created Date"
    ])

    # Write data
    for asset in assets:
        writer.writerow([
            asset.get("asset_id", ""),
            asset.get("name", ""),
            asset.get("category", ""),
            asset.get("status", ""),
            asset.get("purchase_date", ""),
            asset.get("purchase_value", ""),
            asset.get("current_value", ""),
            asset.get("serial_number", ""),
            asset.get("manufacturer", ""),
            asset.get("warranty_expiry", ""),
            asset.get("assigned_to_email", ""),
            asset.get("owner_email", ""),
            asset.get("location", ""),
            asset.get("created_date", ""),
        ])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets_report.csv"}
    )


@app.route("/api/reports/assets/pdf", methods=["GET"])
def export_assets_pdf():
    """Export assets and properties as PDF."""
    user = get_user_from_request_header(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from io import BytesIO

        assets = db_list("assets")
        if user["role"] != "admin":
            assets = [a for a in assets if a.get("assigned_to_email") == user["email"]]
        
        properties = db_list("properties")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title = Paragraph("Asset & Property Management Report", styles["Title"])
        elements.append(title)
        elements.append(Spacer(1, 12))

        # Report info
        total_asset_value = sum(float(a.get("current_value", 0) or 0) for a in assets)
        total_property_value = sum(float(p.get("price") or p.get("monthly_cost") or 0) for p in properties)
        
        info_text = f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>"
        info_text += f"Total Assets: {len(assets)} | Total Properties: {len(properties)}<br/>"
        info_text += f"Total Asset Value: ₹{total_asset_value:,.0f} | Total Property Value: ₹{total_property_value:,.0f}<br/>"
        info_text += f"Report for: {user.get('full_name', user.get('email', 'User'))}"
        info = Paragraph(info_text, styles["Normal"])
        elements.append(info)
        elements.append(Spacer(1, 20))

        # Assets Table
        if assets:
            assets_title = Paragraph("<b>Assets</b>", styles["Heading2"])
            elements.append(assets_title)
            elements.append(Spacer(1, 10))
            
            assets_data = [["Asset ID", "Name", "Category", "Status", "Value"]]
            for asset in assets:
                assets_data.append([
                    asset.get("asset_id", "")[:15],
                    asset.get("name", "")[:25],  # Truncate long names
                    asset.get("category", "")[:15],
                    asset.get("status", "")[:12],
                    f"₹{asset.get('current_value', 0) or 0:,.0f}",
                ])

            assets_table = Table(assets_data)
            assets_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            elements.append(assets_table)
            elements.append(Spacer(1, 20))

        # Properties Table
        if properties:
            if assets:
                elements.append(PageBreak())
            
            properties_title = Paragraph("<b>Properties</b>", styles["Heading2"])
            elements.append(properties_title)
            elements.append(Spacer(1, 10))
            
            properties_data = [["Property Name", "Type", "Location", "Status", "Price/Monthly"]]
            for prop in properties:
                price_value = prop.get("price") or prop.get("monthly_cost") or 0
                price_display = f"₹{price_value:,.0f}"
                if prop.get("monthly_cost") and not prop.get("price"):
                    price_display += "/mo"
                
                properties_data.append([
                    prop.get("property_name", "")[:25],
                    prop.get("property_type", "")[:15],
                    f"{prop.get('city', '')}, {prop.get('state', '')}"[:20],
                    prop.get("status", "")[:12],
                    price_display,
                ])

            properties_table = Table(properties_data)
            properties_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            elements.append(properties_table)

        if not assets and not properties:
            no_data = Paragraph("No assets or properties to display.", styles["Normal"])
            elements.append(no_data)

        doc.build(elements)

        from flask import Response
        return Response(
            buffer.getvalue(),
            mimetype="application/pdf",
            headers={"Content-Disposition": "attachment; filename=assets_and_properties_report.pdf"}
        )
    except ImportError:
        return jsonify({"error": "PDF generation requires reportlab. Install with: pip install reportlab"}), 500


# --- Server Entrypoint ----------------------------------------------------
if __name__ == "__main__":
    print("Starting Flask Asset Management API on http://127.0.0.1:5000")
    print("Test users: admin@org.com, manager@org.com, user@org.com")
    app.run(debug=True)

