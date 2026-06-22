from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.schemas import PipelineCreate, PipelineUpdate, PipelineOut
from backend.db_sync import schedule_db_upload

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

PIPELINE_STATUSES = ["applied", "written_test", "round_1", "round_2", "round_3", "offer", "rejected"]


@router.get("", response_model=list[PipelineOut])
def list_pipelines(db: Session = Depends(get_db)):
    return db.query(models.Pipeline).order_by(models.Pipeline.updated_at.desc()).all()


@router.get("/{pipeline_id}", response_model=PipelineOut)
def get_pipeline(pipeline_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(404, "投递记录不存在")
    return p


@router.post("", response_model=PipelineOut)
def create_pipeline(body: PipelineCreate, db: Session = Depends(get_db)):
    if body.status not in PIPELINE_STATUSES:
        raise HTTPException(400, f"无效状态，可选: {PIPELINE_STATUSES}")
    p = models.Pipeline(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    schedule_db_upload()
    return p


@router.put("/{pipeline_id}", response_model=PipelineOut)
def update_pipeline(pipeline_id: int, body: PipelineUpdate, db: Session = Depends(get_db)):
    p = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(404, "投递记录不存在")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in PIPELINE_STATUSES:
        raise HTTPException(400, f"无效状态，可选: {PIPELINE_STATUSES}")
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    schedule_db_upload()
    return p


@router.delete("/{pipeline_id}")
def delete_pipeline(pipeline_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(404, "投递记录不存在")
    db.delete(p)
    db.commit()
    schedule_db_upload()
    return {"ok": True}


@router.get("/statuses/list")
def list_statuses():
    return {"statuses": PIPELINE_STATUSES}
