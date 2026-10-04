#!/usr/bin/env python3
"""
Script to initialize the database with sample data and default admin user
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.session import Base
from app.models.user import User
from app.models.equipment import Equipment
from app.models.maintenance import Maintenance
from app.models.inventory import InventoryItem
from app.auth.security import get_password_hash

def init_db():
    engine = create_engine(settings.DATABASE_URL)
    
    # Auto-migrate missing columns for existing equipment & maintenance tables
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS anvisa_register VARCHAR(100);"))
        conn.execute(text("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100);"))
        conn.execute(text("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("UPDATE equipment SET is_deleted = FALSE WHERE is_deleted IS NULL;"))
        conn.execute(text("UPDATE equipment SET equipment_type = 'Diagnóstico por Imagem' WHERE equipment_type IS NULL AND name LIKE '%Tomógrafo%';"))
        conn.execute(text("UPDATE equipment SET equipment_type = 'Monitorização Paciente' WHERE equipment_type IS NULL AND name LIKE '%Monitor%';"))
        conn.execute(text("UPDATE equipment SET equipment_type = 'Suporte à Vida' WHERE equipment_type IS NULL AND name LIKE '%Respirador%';"))
        conn.execute(text("UPDATE equipment SET equipment_type = 'Emergência / Desfibrilação' WHERE equipment_type IS NULL AND name LIKE '%Desfibrilador%';"))
        
        # Maintenance table columns
        conn.execute(text("ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS opening_report TEXT;"))
        conn.execute(text("ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;"))
        conn.execute(text("ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS completion_time TIMESTAMP;"))
        conn.execute(text("ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS downtime_start TIMESTAMP;"))
        conn.execute(text("ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS downtime_end TIMESTAMP;"))
        conn.commit()

    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Create default admin user if not exists (check by username or email)
        admin = db.query(User).filter((User.username == "admin") | (User.email == "admin@flowcmms.com")).first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@flowcmms.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✓ Admin user created (username: admin, password: admin123)")

        # Create sample equipment if empty
        if db.query(Equipment).count() == 0:
            equipments = [
                Equipment(
                    name="Tomógrafo Computadorizado Optima 660",
                    description="Tomógrafo de 64 cortes para diagnósticos de alta precisão",
                    serial_number="TC-GE-2023-001",
                    anvisa_register="80023450012",
                    equipment_type="Diagnóstico por Imagem",
                    category_id=1,
                    status="active",
                    purchase_date=datetime.now() - timedelta(days=365),
                    warranty_end=datetime.now() + timedelta(days=365),
                    location="Radiologia - Sala 02",
                    manufacturer="GE Healthcare",
                    model="Optima 660",
                    specifications="64 cortes, 0.35s rotação, canal duplo",
                    is_deleted=False
                ),
                Equipment(
                    name="Monitor Multiparamétrico Lifevue 12",
                    description="Monitor de sinais vitais para UTI de alta complexidade",
                    serial_number="MON-PHIL-2022-044",
                    anvisa_register="10214560099",
                    equipment_type="Monitorização Paciente",
                    category_id=2,
                    status="active",
                    purchase_date=datetime.now() - timedelta(days=500),
                    warranty_end=datetime.now() + timedelta(days=100),
                    location="UTI Geral - Leito 05",
                    manufacturer="Philips",
                    model="Efficia CM120",
                    specifications="ECG, SpO2, PNI, Temp, 2x Pressão Invasiva",
                    is_deleted=False
                ),
                Equipment(
                    name="VentiMed Respirador de UTI",
                    description="Ventilador mecânico pulmonar avançado",
                    serial_number="VENT-DR-2021-089",
                    anvisa_register="80123990045",
                    equipment_type="Suporte à Vida",
                    category_id=3,
                    status="maintenance",
                    purchase_date=datetime.now() - timedelta(days=700),
                    warranty_end=datetime.now() - timedelta(days=100),
                    location="Oficina Biomédica",
                    manufacturer="Dräger",
                    model="Evita V500",
                    specifications="Modos invasivos e não-invasivos, capnografia integrada",
                    is_deleted=False
                ),
                Equipment(
                    name="Desfibrilador Externo Automático HeartPlus",
                    description="Desfibrilador bifásico para emergências médicas",
                    serial_number="DEF-ZOLL-2023-012",
                    anvisa_register="80034110078",
                    equipment_type="Emergência / Desfibrilação",
                    category_id=4,
                    status="active",
                    purchase_date=datetime.now() - timedelta(days=200),
                    warranty_end=datetime.now() + timedelta(days=500),
                    location="Pronto Socorro - Sala de Emergência",
                    manufacturer="Zoll Medical",
                    model="AED Plus",
                    specifications="Bifásico 200J, feedback de RCP em tempo real",
                    is_deleted=False
                )
            ]
            db.add_all(equipments)
            db.commit()
            print("✓ Sample equipment created")

        # Create sample maintenance records if empty
        if db.query(Maintenance).count() == 0:
            first_eq = db.query(Equipment).first()
            if first_eq:
                m1 = Maintenance(
                    equipment_id=first_eq.id,
                    type="preventive",
                    description="Calibração semestral de detectores e verificação de tubos",
                    opening_report="Solicitação de rotina para calibração semestral preventiva da radiologia.",
                    scheduled_date=datetime.now() - timedelta(days=5),
                    actual_date=datetime.now() - timedelta(days=5),
                    start_time=datetime.now() - timedelta(days=5, hours=8),
                    completion_time=datetime.now() - timedelta(days=5, hours=2),
                    downtime_start=datetime.now() - timedelta(days=5, hours=8),
                    downtime_end=datetime.now() - timedelta(days=5, hours=2),
                    status="completed",
                    technician="Eng. Biomédico Carlos Silva",
                    cost=1200.0,
                    notes="Sistema operando dentro dos parâmetros de calibração recomendados"
                )
                m2 = Maintenance(
                    equipment_id=first_eq.id,
                    type="corrective",
                    description="Substituição da lâmpada de sinalização e cabo de força",
                    opening_report="Equipamento apresentando oscilação na lâmpada indicadora e mau contato no cabo de energia.",
                    scheduled_date=datetime.now() - timedelta(hours=12),
                    actual_date=None,
                    start_time=datetime.now() - timedelta(hours=10),
                    completion_time=None,
                    downtime_start=datetime.now() - timedelta(hours=10),
                    downtime_end=None,
                    status="in_progress",
                    technician="Técnico Marcos Rocha",
                    cost=450.0,
                    notes="Aguardando teste final após troca do cabo."
                )
                db.add_all([m1, m2])
                db.commit()

                # Add sample entries for m1 and m2
                from app.models.maintenance import MaintenanceEntry
                entry1 = MaintenanceEntry(
                    maintenance_id=m1.id,
                    entry_type="technical_assessment",
                    notes="Avaliação inicial: Tensão do gerador estável. Detectores apresentaram desvio de +1.2% dentro da tolerância.",
                    registered_by="Eng. Carlos Silva",
                    created_at=datetime.now() - timedelta(days=5, hours=7)
                )
                entry2 = MaintenanceEntry(
                    maintenance_id=m1.id,
                    entry_type="technical_solution",
                    notes="Executada calibração fina do ganho do detector e limpeza dos conectores de fibra óptica.",
                    registered_by="Eng. Carlos Silva",
                    created_at=datetime.now() - timedelta(days=5, hours=3)
                )
                entry3 = MaintenanceEntry(
                    maintenance_id=m2.id,
                    entry_type="parts_used",
                    notes="Peças utilizadas: 1x Cabo de Força Tripolar Hospitalar (Código: CAB-PWR-01), 1x Lâmpada LED Sinalizadora 24V.",
                    registered_by="Técnico Marcos Rocha",
                    created_at=datetime.now() - timedelta(hours=8)
                )
                db.add_all([entry1, entry2, entry3])
                db.commit()
                print("✓ Sample maintenance records and entries created")

        # Create sample inventory items if empty
        if db.query(InventoryItem).count() == 0:
            items = [
                InventoryItem(
                    name="Sensor de SpO2 Adulto Reutilizável",
                    description="Sensor de oximetria de pulso universal de silicone",
                    part_number="SENS-SPO2-01",
                    quantity=15,
                    min_quantity=5,
                    max_quantity=30,
                    unit_price=280.0,
                    total_value=4200.0,
                    supplier="MedParts Distribuidora",
                    category="Acessórios de Monitorização",
                    location="Prateleira A2"
                ),
                InventoryItem(
                    name="Filtro HMEF para Ventilador Mecânico",
                    description="Filtro trocador de calor e umidade bacteriano/viral",
                    part_number="FILT-HMEF-100",
                    quantity=3,
                    min_quantity=10,
                    max_quantity=50,
                    unit_price=45.0,
                    total_value=135.0,
                    supplier="Hospinova Materiais Hospitalares",
                    category="Consumíveis de Ventilação",
                    location="Prateleira B1"
                ),
                InventoryItem(
                    name="Cabo de ECG 5 Vias Padrão Dino",
                    description="Cabo de monitorização cardíaca compatível com Philips/GE",
                    part_number="CAB-ECG-5V",
                    quantity=8,
                    min_quantity=4,
                    max_quantity=20,
                    unit_price=190.0,
                    total_value=1520.0,
                    supplier="MedParts Distribuidora",
                    category="Cabos e Sensores",
                    location="Prateleira A3"
                )
            ]
            db.add_all(items)
            db.commit()
            print("✓ Sample inventory items created")

        print("Database initialized successfully with sample data!")
    finally:
        db.close()
    
    return engine

if __name__ == "__main__":
    init_db()