import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.db_sync import schedule_db_upload
from backend.schemas import SettingUpdate, SettingOut

router = APIRouter(prefix="/api/settings", tags=["settings"])

_IS_PROD = os.getenv("COZE_PROJECT_ENV", "DEV") == "PROD"
if _IS_PROD:
    ENV_PATH = os.path.join("/tmp", "offercraft", ".env")
else:
    ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")


@router.get("", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    return db.query(models.Setting).all()


@router.get("/api-key")
def get_api_key_status(db: Session = Depends(get_db)):
    s = db.query(models.Setting).filter(models.Setting.key == "DEEPSEEK_API_KEY").first()
    key = s.value if s else os.getenv("DEEPSEEK_API_KEY", "")
    has_key = bool(key and key.startswith("sk-"))
    masked = key[:6] + "..." + key[-4:] if len(key) > 10 else ("***" if key else "")
    return {"configured": has_key, "masked_key": masked}


@router.put("/api-key")
def set_api_key(body: SettingUpdate, db: Session = Depends(get_db)):
    if body.key != "DEEPSEEK_API_KEY":
        raise HTTPException(400, "仅支持设置 DEEPSEEK_API_KEY")

    key = body.value.strip()
    s = db.query(models.Setting).filter(models.Setting.key == "DEEPSEEK_API_KEY").first()
    if s:
        s.value = key
    else:
        s = models.Setting(key="DEEPSEEK_API_KEY", value=key)
        db.add(s)
    db.commit()
    schedule_db_upload()

    # Also write to .env file
    os.makedirs(os.path.dirname(ENV_PATH), exist_ok=True)
    lines = []
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            lines = f.readlines()
    found = False
    new_lines = []
    for line in lines:
        if line.startswith("DEEPSEEK_API_KEY="):
            new_lines.append(f"DEEPSEEK_API_KEY={key}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"DEEPSEEK_API_KEY={key}\n")
    with open(ENV_PATH, "w") as f:
        f.writelines(new_lines)

    # Update current process env
    os.environ["DEEPSEEK_API_KEY"] = key

    masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
    return {"ok": True, "masked_key": masked}
