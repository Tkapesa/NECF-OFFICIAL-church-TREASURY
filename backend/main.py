"""
FastAPI backend for Church Treasury System
"""
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import bcrypt
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
import os
import re
from typing import Optional
from fastapi.responses import FileResponse

from database import get_db, init_db
from models import Receipt, Admin
from ocr_utils import extract_receipt_data

# JWT Configuration
class Settings(BaseModel):
    authjwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production-please")
    authjwt_token_location: set = {"headers"}
    authjwt_access_token_expires: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) * 60

# Receipt Update Model
class ReceiptUpdate(BaseModel):
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    item_bought: Optional[str] = None
    approved_by: Optional[str] = None
    ocr_price: Optional[float] = None
    ocr_date: Optional[str] = None
    ocr_time: Optional[str] = None
    
    class Config:
        # Allow extra fields and don't validate None values
        extra = "ignore"

@AuthJWT.load_config
def get_config():
    return Settings()

# Password hashing using bcrypt directly (avoids passlib backend issues)
def hash_password(password: str) -> str:
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(plain_password, str):
        plain_bytes = plain_password.encode('utf-8')
    else:
        plain_bytes = plain_password
    if isinstance(hashed_password, str):
        hash_bytes = hashed_password.encode('utf-8')
    else:
        hash_bytes = hashed_password
    try:
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except ValueError:
        return False

# Initialize FastAPI app
app = FastAPI(title="Church Treasury System")

FRONTEND_DIST = os.getenv(
    "FRONTEND_DIST",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
)
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "0") == "1"

# CORS middleware for React frontend
# CORS origins (comma-separated list or "*")
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    if cors_origins_env == "*":
        allow_origins = ["*"]
    else:
        allow_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    allow_origins = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",  # Vite alternate port
        "http://localhost:5175",  # Vite alternate port
        "https://necftreausry.com",  # Production domain (HTTPS)
        "http://necftreausry.com",   # Production domain (HTTP fallback)
        "https://www.necftreausry.com",  # Production with www
        "http://www.necftreausry.com",   # Production with www (HTTP fallback)
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads folder if not exists (MUST be before mount)
os.makedirs("uploads", exist_ok=True)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    # Create default superuser admin (username: admin, password: admin123)
    db = next(get_db())
    existing_admin = db.query(Admin).filter(Admin.username == "admin").first()
    if not existing_admin:
        admin = Admin(
            username="admin",
            hashed_password=hash_password("admin123"),
            is_superuser=True  # Make default admin a superuser
        )
        db.add(admin)
        db.commit()
        print("✅ Default SUPERUSER admin created: username=admin, password=admin123")
    elif not existing_admin.is_superuser:
        # Upgrade existing admin to superuser
        existing_admin.is_superuser = True
        db.commit()
        print("✅ Existing admin upgraded to SUPERUSER")
    
    # ADD PRODUCTION VERIFICATION LOGS:
    import sys
    print("\n" + "="*60)
    print("🚀 NECF TREASURY SYSTEM - PRODUCTION STARTUP")
    print("="*60)
    
    # 1. Python version
    print(f"✓ Python version: {sys.version.split()[0]}")
    
    # 2. Tesseract verification
    try:
        import subprocess
        tesseract_bin = os.getenv(
            "TESSERACT_CMD",
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        )
        if not os.path.exists(tesseract_bin):
            tesseract_bin = "tesseract"
        result = subprocess.run([tesseract_bin, '--version'], 
                              capture_output=True, text=True, timeout=5, shell=False)
        version_line = (result.stdout or result.stderr).split('\n')[0]
        print(f"✓ Tesseract OCR: {version_line}")
    except Exception as e:
        print(f"⚠️  Tesseract OCR: NOT FOUND - {str(e)}")
        print("   OCR functionality will not work!")
    
    # 3. Database verification
    db_url = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./treasury.db"
    if db_url.startswith("postgres"):
        print(f"✓ Database: PostgreSQL (persistent)")
        db = None
        try:
            db = next(get_db())
            db.execute(text("SELECT 1"))
            print(f"✓ Database connection: VERIFIED")
            receipt_count = db.query(Receipt).count()
            admin_count = db.query(Admin).count()
            with_images = db.query(Receipt).filter(Receipt.image_data.isnot(None)).count()
            print(f"✓ Current data: {receipt_count} receipts ({with_images} with DB-stored images), {admin_count} admins")
        except Exception as e:
            print(f"⚠️  Database connection: FAILED - {str(e)}")
        finally:
            if db:
                db.close()
    else:
        print(f"⚠️  Database: SQLite (ephemeral on Render — data is lost on restart!)")
        print(f"   Set DATABASE_URL to Neon PostgreSQL for production persistence.")
    
    # 4. Uploads directory verification
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir) and os.path.isdir(uploads_dir):
        file_count = sum(1 for f in os.listdir(uploads_dir) if os.path.isfile(os.path.join(uploads_dir, f)))
        print(f"✓ Uploads directory: EXISTS ({file_count} files) — used as OCR temp cache")
        print(f"  Path: {os.path.abspath(uploads_dir)}")
    else:
        print(f"⚠️  Uploads directory: NOT FOUND")
    
    # 5. Environment check
    env_mode = "PRODUCTION" if (os.getenv("DATABASE_URL") or os.getenv("RENDER")) else "DEVELOPMENT"
    print(f"✓ Environment: {env_mode}")
    print(f"✓ Image storage: database (image_data) + local uploads cache")
    
    # 6. CORS origins
    cors_origins = os.getenv("CORS_ORIGINS", "localhost")
    print(f"✓ CORS origins: {cors_origins}")
    
    print("="*60)
    print("✅ Startup complete - System ready")
    print("="*60 + "\n")


# ============ AUTH UTILITIES ============

    


def validate_strong_password(password: str) -> bool:
    """
    Validate password strength:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long"
        )
    
    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter"
        )
    
    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter"
        )
    
    if not re.search(r'[0-9]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number"
        )
    
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?]', password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character (!@#$%^&*...)"
        )
    
    return True


# ============ API ROUTES ============

@app.get("/")
def root():
    """Serve the SPA when bundled, otherwise API health."""
    index = os.path.join(FRONTEND_DIST, "index.html")
    if SERVE_FRONTEND and os.path.isfile(index):
        return FileResponse(index)
    return {"message": "Church Treasury System API", "status": "running"}


@app.get("/api")
def api_health():
    """API health check for deployment probes"""
    return {"message": "Church Treasury System API", "status": "running"}


@app.post("/api/login")
def login(username: str = Form(...), password: str = Form(...), 
          db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    """Admin login endpoint"""
    print(f"🔐 Login attempt - Username: '{username}', Password length: {len(password)}")
    
    admin = db.query(Admin).filter(Admin.username == username).first()
    
    if not admin:
        print(f"❌ Admin user '{username}' not found in database")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"✅ Admin user found: {admin.username}")
    print(f"🔑 Stored hash: {admin.hashed_password[:20]}...")
    
    password_valid = verify_password(password, admin.hashed_password)
    print(f"🔓 Password verification result: {password_valid}")
    
    if not password_valid:
        print(f"❌ Password verification failed for user '{username}'")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token with additional user info
    access_token = Authorize.create_access_token(
        subject=admin.username,
        user_claims={"is_superuser": admin.is_superuser, "admin_id": admin.id}
    )
    print(f"✅ Login successful for user '{username}' (Superuser: {admin.is_superuser})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_superuser": admin.is_superuser,
        "username": admin.username
    }


# ============ ADMIN MANAGEMENT ROUTES (SUPERUSER ONLY) ============

@app.get("/api/admins")
def get_admins(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    """Superuser endpoint to get all admins"""
    
    try:
        # Verify token
        Authorize.jwt_required()
        current_username = Authorize.get_jwt_subject()
        claims = Authorize.get_raw_jwt()
        
        print(f"👤 User '{current_username}' requesting admin list (Superuser: {claims.get('is_superuser', False)})")
        
        # Check if superuser
        if not claims.get("is_superuser", False):
            print(f"❌ Access denied: User '{current_username}' is not a superuser")
            raise HTTPException(status_code=403, detail="Superuser access required")
        
        admins = db.query(Admin).order_by(Admin.created_at.desc()).all()
        
        print(f"✅ Returning {len(admins)} admin accounts")
        
        return {
            "admins": [
                {
                    "id": a.id,
                    "username": a.username,
                    "is_superuser": a.is_superuser,
                    "created_at": a.created_at.isoformat()
                }
                for a in admins
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching admins: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch admins: {str(e)}")


@app.post("/api/admins")
def create_admin(
    username: str = Form(...),
    password: str = Form(...),
    is_superuser: bool = Form(False),
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    """Superuser endpoint to create new admin"""
    
    # Verify token
    Authorize.jwt_required()
    current_username = Authorize.get_jwt_subject()
    claims = Authorize.get_raw_jwt()
    
    # Check if superuser
    if not claims.get("is_superuser", False):
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    # Check if username already exists
    existing_admin = db.query(Admin).filter(Admin.username == username).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate strong password
    validate_strong_password(password)
    
    # Create new admin
    new_admin = Admin(
        username=username,
        hashed_password=hash_password(password),
        is_superuser=is_superuser
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    print(f"✅ New admin created by {current_username}: {username} (Superuser: {is_superuser})")
    
    return {
        "message": "Admin created successfully",
        "admin": {
            "id": new_admin.id,
            "username": new_admin.username,
            "is_superuser": new_admin.is_superuser,
            "created_at": new_admin.created_at.isoformat()
        }
    }


@app.delete("/api/admins/{admin_id}")
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    """Superuser endpoint to delete an admin"""
    
    # Verify token
    Authorize.jwt_required()
    current_username = Authorize.get_jwt_subject()
    claims = Authorize.get_raw_jwt()
    
    # Check if superuser
    if not claims.get("is_superuser", False):
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    # Prevent deleting self
    if claims.get("admin_id") == admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Prevent deleting the last superuser
    if admin.is_superuser:
        superuser_count = db.query(Admin).filter(Admin.is_superuser == True).count()
        if superuser_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last superuser")
    
    username_deleted = admin.username
    db.delete(admin)
    db.commit()
    
    print(f"✅ Admin deleted by {current_username}: {username_deleted}")
    
    return {
        "message": "Admin deleted successfully",
        "username": username_deleted
    }


# ============ RECEIPT ROUTES ============

def _public_base_url(request: Request) -> str:
    """Prefer proxy headers so image URLs use https://api.domain.com behind Render."""
    proto = request.headers.get("x-forwarded-proto")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if proto and host:
        return f"{proto}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def _receipt_image_url(request: Request, receipt_id: int) -> str:
    return f"{_public_base_url(request)}/api/receipts/{receipt_id}/image"


@app.post("/api/receipts/upload")
async def upload_receipt(
    image: UploadFile = File(...),
    user_name: str = Form(...),
    user_phone: str = Form(...),
    item_bought: str = Form(...),
    approved_by: str = Form(...),
    db: Session = Depends(get_db)
):
    """User endpoint to upload receipt"""
    
    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    
    # Read bytes once — persist in DB + write temp file for OCR
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    os.makedirs("uploads", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = os.path.basename(image.filename or "receipt.jpg")
    filename = f"{timestamp}_{safe_name}"
    file_path = f"uploads/{filename}"

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)

        ocr_data = extract_receipt_data(file_path)

        receipt = Receipt(
            user_name=user_name,
            user_phone=user_phone,
            item_bought=item_bought,
            approved_by=approved_by,
            image_path=file_path,
            image_data=image_bytes,
            image_content_type=image.content_type or "image/jpeg",
            **ocr_data
        )

        db.add(receipt)
        db.commit()
        db.refresh(receipt)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        print(f"❌ Upload failed for {user_name}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save receipt: {str(e)}")

    print(
        f"✅ Receipt #{receipt.id} saved "
        f"(user={user_name}, bytes={len(image_bytes)})"
    )
    
    return {
        "message": "Receipt uploaded successfully",
        "receipt_id": receipt.id,
        "ocr_data": ocr_data
    }


@app.get("/api/receipts/{receipt_id}/image")
def get_receipt_image(receipt_id: int, db: Session = Depends(get_db)):
    """Serve receipt image from database (preferred) or local uploads fallback."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.image_data:
        return Response(
            content=bytes(receipt.image_data),
            media_type=receipt.image_content_type or "image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    if receipt.image_path and os.path.exists(receipt.image_path):
        with open(receipt.image_path, "rb") as f:
            content = f.read()
        return Response(
            content=content,
            media_type=receipt.image_content_type or "image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    raise HTTPException(status_code=404, detail="Receipt image not found")


@app.get("/api/receipts")
def get_receipts(request: Request, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    """Admin endpoint to get all receipts"""
    
    try:
        # Verify admin token
        print(f"🔐 Verifying JWT token for /api/receipts endpoint")
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()
        print(f"✅ JWT verified for user: {current_user}")
        
        receipts = db.query(Receipt).order_by(Receipt.created_at.desc()).all()
        
        print(f"📋 Fetched {len(receipts)} receipts from database")
        
        return {
            "receipts": [
                {
                    "id": r.id,
                    "user_name": r.user_name,
                    "user_phone": r.user_phone,
                    "item_bought": r.item_bought,
                    "approved_by": r.approved_by,
                    "ocr_price": r.ocr_price,
                    "ocr_date": r.ocr_date,
                    "ocr_time": r.ocr_time,
                    "ocr_raw_text": r.ocr_raw_text,
                    # Stable API URL — works even when local uploads/ is wiped on Render
                    "image_path": _receipt_image_url(request, r.id),
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in receipts
            ]
        }
    except HTTPException as http_err:
        print(f"❌ HTTP Error in /api/receipts: {http_err.status_code} - {http_err.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error fetching receipts: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch receipts: {str(e)}")


@app.put("/api/receipts/{receipt_id}")
def update_receipt(
    receipt_id: int,
    update_data: ReceiptUpdate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    """Admin endpoint to update receipt fields"""
    
    # Verify admin token
    Authorize.jwt_required()
    
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Update user-submitted fields if provided and not empty
    if update_data.user_name is not None and update_data.user_name != "":
        receipt.user_name = update_data.user_name
    if update_data.user_phone is not None and update_data.user_phone != "":
        receipt.user_phone = update_data.user_phone
    if update_data.item_bought is not None and update_data.item_bought != "":
        receipt.item_bought = update_data.item_bought
    if update_data.approved_by is not None and update_data.approved_by != "":
        receipt.approved_by = update_data.approved_by
    
    # Update OCR fields if provided (allow empty for OCR fields)
    if update_data.ocr_price is not None:
        receipt.ocr_price = update_data.ocr_price
    if update_data.ocr_date is not None and update_data.ocr_date != "":
        receipt.ocr_date = update_data.ocr_date
    if update_data.ocr_time is not None and update_data.ocr_time != "":
        receipt.ocr_time = update_data.ocr_time
    
    # Update timestamp
    receipt.updated_at = datetime.now()
    
    db.commit()
    db.refresh(receipt)
    
    return {
        "message": "Receipt updated successfully",
        "receipt": {
            "id": receipt.id,
            "user_name": receipt.user_name,
            "user_phone": receipt.user_phone,
            "item_bought": receipt.item_bought,
            "approved_by": receipt.approved_by,
            "ocr_price": receipt.ocr_price,
            "ocr_date": receipt.ocr_date,
            "ocr_time": receipt.ocr_time,
            "updated_at": receipt.updated_at.isoformat()
        }
    }


@app.delete("/api/receipts/{receipt_id}")
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    """Admin endpoint to delete a single receipt"""
    
    # Verify admin token
    Authorize.jwt_required()
    
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Delete the image file if it exists
    if receipt.image_path and os.path.exists(receipt.image_path):
        try:
            os.remove(receipt.image_path)
        except Exception as e:
            print(f"Error deleting image file: {e}")
    
    # Delete from database
    db.delete(receipt)
    db.commit()
    
    return {
        "message": "Receipt deleted successfully",
        "id": receipt_id
    }


@app.post("/api/receipts/bulk-delete")
def bulk_delete_receipts(
    receipt_ids: list[int],
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    """Admin endpoint to delete multiple receipts"""
    
    # Verify admin token
    Authorize.jwt_required()
    
    if not receipt_ids:
        raise HTTPException(status_code=400, detail="No receipt IDs provided")
    
    deleted_count = 0
    errors = []
    
    for receipt_id in receipt_ids:
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        
        if receipt:
            # Delete the image file if it exists
            if receipt.image_path and os.path.exists(receipt.image_path):
                try:
                    os.remove(receipt.image_path)
                except Exception as e:
                    errors.append(f"Error deleting image for receipt {receipt_id}: {e}")
            
            # Delete from database
            db.delete(receipt)
            deleted_count += 1
        else:
            errors.append(f"Receipt {receipt_id} not found")
    
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} receipt(s) successfully",
        "deleted_count": deleted_count,
        "errors": errors if errors else None
    }


# ============ FRONTEND STATIC (OPTIONAL) ============

if SERVE_FRONTEND and os.path.isdir(FRONTEND_DIST):
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback so /admin and client routes serve index.html."""
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = os.path.normpath(os.path.join(FRONTEND_DIST, full_path))
        if not candidate.startswith(os.path.abspath(FRONTEND_DIST)):
            raise HTTPException(status_code=404, detail="Not found")
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
