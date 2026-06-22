import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

from backend.database import engine, get_db
from backend import models
from backend.routers import resumes, jd, rewrite, interview, pipeline, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: sync DB from TOS (production), then create tables
    from backend.database import sync_db_on_startup
    sync_db_on_startup()
    models.Base.metadata.create_all(bind=engine)
    # Initialize API key from env if not in DB
    db = next(get_db())
    env_key = os.getenv("DEEPSEEK_API_KEY", "")
    if env_key:
        s = db.query(models.Setting).filter(models.Setting.key == "DEEPSEEK_API_KEY").first()
        if not s:
            db.add(models.Setting(key="DEEPSEEK_API_KEY", value=env_key))
            db.commit()
    db.close()
    yield


app = FastAPI(title="OfferCraft API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(resumes.router)
app.include_router(jd.router)
app.include_router(rewrite.router)
app.include_router(interview.router)
app.include_router(pipeline.router)
app.include_router(settings.router)

# Serve frontend static files (production)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
