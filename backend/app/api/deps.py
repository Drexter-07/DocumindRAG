from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User


# ---------------------------
# Auth: current user
# ---------------------------
def get_current_user(
    x_test_email: str = Header(..., alias="X-Test-Email"),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.email == x_test_email).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found. Are you using a valid X-Test-Email?",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return user


# ---------------------------
# Role guards
# ---------------------------
def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required",
        )
    return user


def require_admin_or_senior(user: User = Depends(get_current_user)) -> User:
    if not (user.is_admin or user.is_senior):
        raise HTTPException(
            status_code=403,
            detail="Admin or Senior privileges required",
        )
    return user
