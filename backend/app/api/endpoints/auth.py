from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.db.session import get_master_db
from app.models.master import Tenant
from fastapi.security import OAuth2PasswordBearer
from app.auth.security import verify_password, get_password_hash, create_access_token, verify_token
from datetime import timedelta
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

@router.get("/tenant-info")
def get_tenant_info(s: str = None, slug: str = None, db: Session = Depends(get_master_db)):
    target_slug = s or slug
    if not target_slug:
        raise HTTPException(status_code=400, detail="Slug do tenant não informado")
    tenant = db.query(Tenant).filter(Tenant.slug == target_slug.lower().strip(), Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Unidade não encontrada ou inativa")
    return {
        "slug": tenant.slug,
        "name": tenant.name,
        "description": tenant.description
    }


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    username = verify_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de autenticação inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: schemas.LoginForm, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/requester-login")
def requester_login(data: schemas.RequesterLoginRequest, db: Session = Depends(get_db)):
    """
    Autenticação rápida e simplificada sem senha para o perfil Solicitante.
    Se o usuário já existe na base da unidade, valida se está ativo.
    Se não existe, auto-registra com papel 'solicitante' para máxima agilidade.
    """
    clean_username = data.username.strip().lower()
    if not clean_username or len(clean_username) < 2:
        raise HTTPException(status_code=400, detail="Nome de usuário deve ter pelo menos 2 caracteres.")

    user = db.query(models.User).filter(models.User.username == clean_username).first()
    if not user:
        # Auto-registro transparente de solicitante
        default_email = f"{clean_username}@solicitante.local"
        user = models.User(
            username=clean_username,
            full_name=data.full_name.strip() if data.full_name else clean_username.title(),
            sector=data.sector.strip() if data.sector else None,
            phone_extension=data.contact.strip() if data.contact else None,
            email=default_email,
            hashed_password=get_password_hash("solicitante_auto_pwd"),
            role="solicitante",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Este usuário está inativo nesta unidade.")
        # Se veio informações adicionais no login, atualiza
        updated = False
        if data.full_name and not user.full_name:
            user.full_name = data.full_name.strip()
            updated = True
        if data.sector and not user.sector:
            user.sector = data.sector.strip()
            updated = True
        if data.contact and not user.phone_extension:
            user.phone_extension = data.contact.strip()
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name or user.username,
            "email": user.email,
            "role": user.role,
            "sector": user.sector or data.sector,
            "phone_extension": user.phone_extension or data.contact,
            "contact": user.phone_extension or data.contact
        }
    }



@router.post("/change-password")
def change_password(
    data: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    if not data.new_password or len(data.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 4 caracteres")
    
    # Hash and update new password
    current_user.hashed_password = get_password_hash(data.new_password.strip())
    db.commit()
    return {"message": "Senha alterada com sucesso!"}

@router.post("/register", response_model=schemas.User)

def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Nome de usuário já cadastrado")
    
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user