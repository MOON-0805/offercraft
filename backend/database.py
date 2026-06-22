import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

logger = logging.getLogger("database")

# Production (veFaaS) has a read-only filesystem; only /tmp is writable.
# Development uses a local data/ directory for convenience.
_IS_PROD = os.getenv("COZE_PROJECT_ENV", "DEV") == "PROD"
if _IS_PROD:
    DATA_DIR = os.path.join("/tmp", "offercraft", "data")
else:
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "offercraft.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def schedule_db_upload():
    """在写操作后立即触发 DB 文件上传到 TOS"""
    try:
        from backend.db_sync import schedule_db_upload as _upload
        _upload(DB_PATH)
    except Exception as e:
        logger.debug(f"[database] schedule_db_upload skipped: {e}")


def sync_db_on_startup():
    """启动时从 TOS 拉取最新 DB，然后启动心跳上传"""
    try:
        from backend.db_sync import pull_db_from_remote, start_heartbeat
        logger.info("[database] Syncing DB from TOS on startup...")
        pull_db_from_remote(DB_PATH)
        logger.info("[database] DB sync complete, starting heartbeat...")
        start_heartbeat(DB_PATH)
        logger.info("[database] Heartbeat started")
    except Exception as e:
        logger.warning(f"[database] sync_db_on_startup failed: {e}")
