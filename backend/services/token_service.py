from datetime import datetime, timedelta, timezone
import os
import requests


class TokenRefreshError(Exception):
    pass


def _as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def refresh_access_token(onedrive_user, db) -> str:
    now_utc = datetime.now(timezone.utc)
    token_expiry_utc = _as_utc(onedrive_user.token_expiry)
    access_token = (onedrive_user.access_token or "").strip()
    if token_expiry_utc and token_expiry_utc > now_utc and access_token:
        return access_token

    refresh_token = (onedrive_user.refresh_token or "").strip()
    if not refresh_token:
        raise TokenRefreshError("No refresh token — user must reconnect OneDrive.")

    authority = os.getenv("ONEDRIVE_AUTHORITY_URL", "https://login.microsoftonline.com")
    tenant = os.getenv("ONEDRIVE_TENANT_ID", "common")
    url = f"{authority}/{tenant}/oauth2/v2.0/token"

    data = {
        "client_id": os.getenv("ONEDRIVE_CLIENT_ID", ""),
        "client_secret": os.getenv("ONEDRIVE_CLIENT_SECRET", ""),
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": "Files.ReadWrite.All User.Read offline_access",
    }

    resp = requests.post(url, data=data, timeout=15)
    if not resp.ok:
        raise TokenRefreshError(f"Failed to refresh OneDrive access token: {resp.text}")

    token_data = resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise TokenRefreshError("Token refresh did not return an access token.")

    expires_in = int(token_data.get("expires_in", 3600))
    onedrive_user.access_token = access_token
    onedrive_user.refresh_token = token_data.get("refresh_token") or onedrive_user.refresh_token
    onedrive_user.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    db.commit()
    db.refresh(onedrive_user)
    return access_token
