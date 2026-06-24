from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import database
from services.onedrive_graph_service import OneDriveGraphService
from services.token_service import TokenRefreshError, refresh_access_token

router = APIRouter(tags=["onedrive"])

_AUTHORITY = os.getenv("ONEDRIVE_AUTHORITY_URL", "https://login.microsoftonline.com")
_TENANT = os.getenv("ONEDRIVE_TENANT_ID", "common")
_CLIENT_ID = lambda: os.getenv("ONEDRIVE_CLIENT_ID", "")
_CLIENT_SECRET = lambda: os.getenv("ONEDRIVE_CLIENT_SECRET", "")
_REDIRECT_URI = lambda: os.getenv("ONEDRIVE_REDIRECT_URI", "http://localhost:8000/onedrive/callback/")
_SCOPE = "Files.ReadWrite.All User.Read offline_access"


def _auth_url(redirect_uri: str, state: str = "") -> str:
    params = {
        "client_id": _CLIENT_ID(),
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": _SCOPE,
        "state": state,
    }
    return f"{_AUTHORITY}/{_TENANT}/oauth2/v2.0/authorize?{urlencode(params)}"


def _exchange_code(code: str, redirect_uri: str) -> dict:
    import requests as _req
    url = f"{_AUTHORITY}/{_TENANT}/oauth2/v2.0/token"
    data = {
        "client_id": _CLIENT_ID(),
        "client_secret": _CLIENT_SECRET(),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "scope": _SCOPE,
    }
    resp = _req.post(url, data=data, timeout=15)
    return resp.json()


@router.get("/check_onedrive_authenticated")
@router.get("/check_onedrive_authenticated/")
def check_onedrive_authenticated(email: str, db: Session = Depends(database.get_db)):
    u = db.query(models.OneDriveUser).filter(models.OneDriveUser.user_email == email).first()
    if not u:
        return {"status": False, "connected": False, "email": email}
    connected = bool(u.access_token and u.refresh_token)
    if connected:
        try:
            refresh_access_token(u, db)
        except Exception:
            connected = False
    return {
        "status": connected,
        "connected": connected,
        "email": u.user_email,
        "input_folder_id": u.input_folder_id,
        "token_expiry": u.token_expiry.isoformat() if u.token_expiry else None,
    }


@router.get("/onedrive/connect")
@router.get("/onedrive/connect/")
def connect_onedrive(email: str = ""):
    redirect_uri = _REDIRECT_URI().strip()
    return RedirectResponse(_auth_url(redirect_uri, state=email))


@router.get("/onedrive/callback", name="onedrive_callback")
@router.get("/onedrive/callback/")
def onedrive_callback(
    request: Request,
    code: str = None,
    state: str = "",
    error_description: str = None,
    db: Session = Depends(database.get_db),
):
    if not code:
        return HTMLResponse(_error_html(error_description or "Unknown error"))

    redirect_uri = _REDIRECT_URI().strip()
    token_data = _exchange_code(code, redirect_uri)
    access_token = token_data.get("access_token")
    if not access_token:
        return HTMLResponse(_error_html(token_data.get("error_description", "Token exchange failed")))

    try:
        profile = OneDriveGraphService.get_user_profile(access_token)
        user_email = profile.get("mail") or profile.get("userPrincipalName")
    except Exception:
        user_email = None

    user_email = user_email or state
    if not user_email:
        return HTMLResponse(_error_html("Could not determine user email"))

    expiry = datetime.now(timezone.utc) + timedelta(seconds=int(token_data.get("expires_in", 3600)))

    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        import bcrypt as _bc
        user = models.User(
            email=user_email,
            hashed_password=_bc.hashpw(b"onedrive-stub", _bc.gensalt()).decode(),
        )
        db.add(user)
        db.flush()

    od_user = db.query(models.OneDriveUser).filter(models.OneDriveUser.user_email == user_email).first()
    if od_user:
        od_user.access_token = access_token
        od_user.refresh_token = token_data.get("refresh_token")
        od_user.token_expiry = expiry
    else:
        od_user = models.OneDriveUser(
            user_id=user.id,
            user_email=user_email,
            access_token=access_token,
            refresh_token=token_data.get("refresh_token"),
            token_expiry=expiry,
        )
        db.add(od_user)
    db.commit()
    return HTMLResponse(_success_html())


@router.get("/folders")
@router.get("/folders/")
def list_folders(email: str, db: Session = Depends(database.get_db)):
    u = db.query(models.OneDriveUser).filter(models.OneDriveUser.user_email == email).first()
    if not u:
        raise HTTPException(status_code=404, detail="OneDrive user not found")
    try:
        access_token = refresh_access_token(u, db)
    except TokenRefreshError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    folders = OneDriveGraphService.list_folders(access_token)
    return {"folders": folders}


@router.get("/onedrive-folder-files")
@router.get("/onedrive-folder-files/")
def list_folder_files(email: str, folder_id: str, db: Session = Depends(database.get_db)):
    u = db.query(models.OneDriveUser).filter(models.OneDriveUser.user_email == email).first()
    if not u:
        raise HTTPException(status_code=404, detail="OneDrive user not found")
    try:
        access_token = refresh_access_token(u, db)
    except TokenRefreshError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    all_items = OneDriveGraphService.list_files_in_folder(access_token, folder_id)
    files = [
        {"id": item["id"], "name": item["name"], "size": item.get("size", 0)}
        for item in all_items
        if "file" in item and item.get("name", "").lower().endswith((".pdf", ".docx", ".doc"))
    ]
    return {"files": files, "total": len(files)}


class SaveFolderBody(BaseModel):
    email: str
    input_folder_id: str


@router.post("/save-onedrive-folder")
@router.post("/save-onedrive-folder/")
def save_folder(body: SaveFolderBody, db: Session = Depends(database.get_db)):
    u = db.query(models.OneDriveUser).filter(models.OneDriveUser.user_email == body.email).first()
    if not u:
        raise HTTPException(status_code=404, detail="OneDrive user not found")
    if u.input_folder_id != body.input_folder_id:
        u.delta_link = None
    u.input_folder_id = body.input_folder_id
    db.commit()
    return {"message": "Folder saved"}


def _error_html(msg: str) -> str:
    return f"""<html><body style='background:#0d1929;color:#fff;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>
<div style='padding:32px;border:1px solid #ef4444;border-radius:12px;text-align:center'>
<h2 style='color:#ef4444'>Authentication Failed</h2><p>{msg}</p>
<script>try{{window.opener&&window.opener.postMessage('onedrive_auth_failed','*')}}catch(e){{}}
setTimeout(function(){{window.close()}},4000)</script></div></body></html>"""


def _success_html() -> str:
    return """<html><body style='background:#0d1929;color:#fff;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>
<div style='padding:32px;border:1px solid #22c55e;border-radius:12px;text-align:center'>
<div style='font-size:48px'>&#10003;</div>
<h2 style='color:#22c55e'>Connected!</h2><p style='color:#8899aa'>Close this window.</p>
<script>try{{window.opener&&window.opener.postMessage('onedrive_auth_success','*')}}catch(e){{}}
setTimeout(function(){{window.close()}},1500)</script></div></body></html>"""
