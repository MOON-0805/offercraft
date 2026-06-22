"""
db_sync.py - SQLite 数据库持久化到 TOS 对象存储

策略：
- 启动时从 TOS 拉取最新 DB（如远端不存在则保留本地）
- 每次写操作后立即同步上传（不做防抖，确保数据不丢）
- 每 60 秒心跳兜底上传
- 直接使用 boto3 + coze-workload-identity，避免 coze-coding-dev-sdk 的 100+ 传递依赖
"""

import os
import json
import time
import logging
import threading
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger("db_sync")

# ── 常量 ──────────────────────────────────────────

DB_FILE_NAME = "offercraft.db"
KEY_FILE_NAME = "offercraft_db_key.json"  # 存储 TOS 实际 key

IS_PROD = os.getenv("COZE_PROJECT_ENV", "DEV") == "PROD"


def _get_db_path() -> str:
    if IS_PROD:
        return os.path.join("/tmp/offercraft/data", DB_FILE_NAME)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "data", DB_FILE_NAME)


DB_PATH = _get_db_path()
KEY_FILE_PATH = os.path.join(os.path.dirname(DB_PATH), KEY_FILE_NAME)


# ── S3 客户端（boto3 + coze-workload-identity） ────────

_s3_client = None
_s3_lock = threading.Lock()
_bucket_name = None


def _get_access_token() -> str | None:
    """通过 coze_workload_identity 获取 access token"""
    try:
        from coze_workload_identity import Client
        client = Client()
        try:
            token = client.get_access_token()
            return token
        finally:
            try:
                client.close()
            except Exception:
                pass
    except Exception as e:
        logger.error(f"[db_sync] Failed to get access token: {e}")
        return None


def _get_s3_client():
    """懒初始化 boto3 S3 客户端，注入 x-storage-token 认证"""
    global _s3_client, _bucket_name
    if _s3_client is not None:
        return _s3_client, _bucket_name

    with _s3_lock:
        if _s3_client is not None:
            return _s3_client, _bucket_name

        endpoint = os.getenv("COZE_BUCKET_ENDPOINT_URL")
        bucket = os.getenv("COZE_BUCKET_NAME")
        logger.info(f"[db_sync] Initializing boto3 S3 client: endpoint={endpoint}, bucket={bucket}")

        if not endpoint or not bucket:
            logger.error(f"[db_sync] Missing env vars: COZE_BUCKET_ENDPOINT_URL={endpoint}, COZE_BUCKET_NAME={bucket}")
            return None, None

        try:
            client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id="",
                aws_secret_access_key="",
                region_name="cn-beijing",
            )

            # 注册 before-call 钩子，注入 x-storage-token 头
            def _inject_token_header(params, **kwargs):
                token = _get_access_token()
                if token:
                    headers = params.get("headers", {})
                    headers["x-storage-token"] = token
                    params["headers"] = headers
                else:
                    logger.warning("[db_sync] No access token available for S3 request")

            client.meta.events.register("before-call.s3", _inject_token_header)

            _s3_client = client
            _bucket_name = bucket
            logger.info("[db_sync] boto3 S3 client initialized successfully")
            return _s3_client, _bucket_name

        except Exception as e:
            logger.error(f"[db_sync] Failed to init boto3 S3 client: {e}")
            return None, None


# ── S3 操作封装 ────────────────────────────────────────

def _s3_upload(data: bytes, object_key: str) -> bool:
    """上传数据到 S3"""
    client, bucket = _get_s3_client()
    if client is None:
        return False
    try:
        client.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=data,
            ContentType="application/x-sqlite3",
        )
        return True
    except Exception as e:
        logger.error(f"[db_sync] S3 upload failed: {e}")
        return False


def _s3_download(object_key: str) -> bytes | None:
    """从 S3 下载数据"""
    client, bucket = _get_s3_client()
    if client is None:
        return None
    try:
        resp = client.get_object(Bucket=bucket, Key=object_key)
        body = resp.get("Body")
        if body is None:
            return None
        try:
            return body.read()
        finally:
            try:
                body.close()
            except Exception:
                pass
    except ClientError as e:
        code = (e.response or {}).get("Error", {}).get("Code", "")
        if code in {"404", "NoSuchKey", "NotFound"}:
            return None
        logger.error(f"[db_sync] S3 download failed: {e}")
        return None
    except Exception as e:
        logger.error(f"[db_sync] S3 download failed: {e}")
        return None


def _s3_list_keys(prefix: str) -> list[str]:
    """列出 S3 中指定前缀的所有 key"""
    client, bucket = _get_s3_client()
    if client is None:
        return []
    try:
        resp = client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=50)
        contents = resp.get("Contents", []) or []
        return [item.get("Key") for item in contents if isinstance(item, dict) and item.get("Key")]
    except Exception as e:
        logger.error(f"[db_sync] S3 list failed: {e}")
        return []


# ── Key 持久化 ──────────────────────────────────────

def _save_key(key: str):
    """将 TOS 实际 key 写入本地 key 文件"""
    try:
        os.makedirs(os.path.dirname(KEY_FILE_PATH), exist_ok=True)
        with open(KEY_FILE_PATH, "w") as f:
            json.dump({"key": key, "updated_at": time.time()}, f)
        logger.info(f"[db_sync] Saved TOS key to local: {key[:60]}...")
    except Exception as e:
        logger.error(f"[db_sync] Failed to save key file: {e}")


def _load_key() -> str | None:
    """从本地 key 文件读取 TOS 实际 key"""
    try:
        if os.path.exists(KEY_FILE_PATH):
            with open(KEY_FILE_PATH, "r") as f:
                data = json.load(f)
            key = data.get("key")
            if key:
                logger.info(f"[db_sync] Loaded TOS key from local: {key[:60]}...")
                return key
    except Exception as e:
        logger.warning(f"[db_sync] Failed to load key file: {e}")
    return None


def _generate_object_key() -> str:
    """生成唯一的 S3 object key"""
    uniq = uuid4().hex[:8]
    return f"offercraft_{uniq}.db"


def _find_db_key_in_tos() -> str | None:
    """在 TOS 中搜索 DB 文件的 key"""
    keys = _s3_list_keys(prefix="offercraft")
    for k in sorted(keys, reverse=True):
        if DB_FILE_NAME.replace(".db", "") in k and k.endswith(".db"):
            logger.info(f"[db_sync] Found DB key in TOS: {k[:80]}...")
            return k
    return None


# ── 拉取（启动时） ────────────────────────────────────

def pull_db_from_remote(db_path: str = None) -> bool:
    """从 TOS 拉取最新 DB 到本地。如远端不存在则跳过（保留本地空 DB）。"""
    if not IS_PROD:
        logger.info("[db_sync] Dev environment, skip pull")
        return True

    db_path = db_path or DB_PATH

    client_ok, _ = _get_s3_client()
    if client_ok is None:
        logger.warning("[db_sync] No S3 client, skip pull")
        return False

    try:
        # 1. 尝试从本地 key 文件获取 key
        key = _load_key()

        # 2. 如果没有本地 key，搜索 TOS
        if not key:
            key = _find_db_key_in_tos()

        if not key:
            logger.info("[db_sync] No remote DB found in TOS, will upload local DB later")
            return True  # 远端不存在，不报错，启动后心跳会上传本地 DB

        # 3. 下载 DB
        logger.info(f"[db_sync] Downloading DB from TOS: {key[:80]}...")
        data = _s3_download(key)

        if data is None:
            logger.error("[db_sync] DB download returned None")
            return False

        # 4. 写入本地
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        with open(db_path, "wb") as f:
            f.write(data)

        logger.info(f"[db_sync] DB downloaded successfully ({len(data)} bytes)")

        # 5. 保存 key 到本地
        _save_key(key)
        return True

    except Exception as e:
        logger.error(f"[db_sync] Failed to pull DB from TOS: {e}")
        return False


# ── 推送（写操作后 + 心跳） ───────────────────────────

def _do_upload(db_path: str = None):
    """将本地 DB 上传到 TOS"""
    if not IS_PROD:
        return

    db_path = db_path or DB_PATH

    if not os.path.exists(db_path):
        logger.warning(f"[db_sync] DB file not found: {db_path}, skip upload")
        return

    client_ok, _ = _get_s3_client()
    if client_ok is None:
        logger.error("[db_sync] No S3 client available, cannot upload DB")
        return

    try:
        # 读取本地 DB 文件
        with open(db_path, "rb") as f:
            db_data = f.read()

        # 生成 object key 并上传
        object_key = _generate_object_key()
        logger.info(f"[db_sync] Uploading DB to TOS ({len(db_data)} bytes), key: {object_key}")

        success = _s3_upload(db_data, object_key)

        if success:
            logger.info(f"[db_sync] DB uploaded successfully, key: {object_key}")
            # 保存实际 key
            _save_key(object_key)
        else:
            logger.error("[db_sync] DB upload failed")

    except Exception as e:
        error_str = str(e)
        if "missing token" in error_str:
            logger.error(f"[db_sync] Upload failed: S3 auth token missing. Ensure coze-workload-identity is installed. Error: {e}")
        else:
            logger.error(f"[db_sync] Failed to upload DB to TOS: {e}")


# ── 调度：立即 + 延迟去重 ─────────────────────────────

_last_upload_time = 0.0
_upload_lock = threading.Lock()
_pending_timer = None


def schedule_db_upload(db_path: str = None):
    """写操作后调用：先立即上传，再设 3 秒延迟去重兜底"""
    if not IS_PROD:
        return

    global _last_upload_time, _pending_timer

    # 立即上传（同步，确保数据不丢）
    try:
        _do_upload(db_path)
    except Exception as e:
        logger.error(f"[db_sync] Immediate upload failed: {e}")

    # 额外设一个 3 秒延迟兜底（防止连续快速写入时漏掉后续改动）
    with _upload_lock:
        if _pending_timer is not None:
            _pending_timer.cancel()
        _pending_timer = threading.Timer(3.0, _do_upload, kwargs={"db_path": db_path})
        _pending_timer.daemon = True
        _pending_timer.start()


# ── 心跳上传 ──────────────────────────────────────────

_heartbeat_thread = None


def _heartbeat_loop(db_path: str):
    """每 60 秒上传一次，兜底保证数据不丢"""
    while True:
        try:
            time.sleep(60)
            if IS_PROD and os.path.exists(db_path):
                logger.info("[db_sync] Heartbeat upload")
                _do_upload(db_path)
        except Exception as e:
            logger.error(f"[db_sync] Heartbeat error: {e}")


def start_heartbeat(db_path: str = None):
    """启动心跳上传线程"""
    if not IS_PROD:
        return
    db_path = db_path or DB_PATH
    global _heartbeat_thread
    if _heartbeat_thread is not None:
        return
    _heartbeat_thread = threading.Thread(
        target=_heartbeat_loop, args=(db_path,), daemon=True
    )
    _heartbeat_thread.start()
    logger.info("[db_sync] Heartbeat started (60s interval)")
