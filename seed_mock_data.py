"""
seed_mock_data.py — Universal seed data for Mekatron.
Populates all tables with realistic hardware/door product data using SQLAlchemy ORM.
Works seamlessly for both PostgreSQL (Supabase) and SQLite.
"""
import datetime
import json
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models


def seed_database(db: Session = None):
    close_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_session = True

    try:
        # Check if already seeded
        if db.query(models.Supplier).count() > 0:
            print("Database already contains supplier data. Skipping initial seeding.")
            return

        print("\n[1/7] Seeding suppliers...")
        s1 = models.Supplier(name="Allegion (Schlage)", contact="orders@allegion.com")
        s2 = models.Supplier(name="ASSA ABLOY", contact="sales@assaabloy.com")
        s3 = models.Supplier(name="DORMA Gulf", contact="support@dorma-gulf.ae")
        db.add_all([s1, s2, s3])
        db.commit()
        db.refresh(s1)
        db.refresh(s2)
        db.refresh(s3)

        print("[2/7] Seeding products...")
        products_data = [
            ("Schlage B60N Heavy Duty Deadbolt", "SCH-B60N-619", "Deadbolts", s1.id, 89.50),
            ("Schlage ND Series Commercial Lever", "SCH-ND80-619", "Levers", s1.id, 145.00),
            ("Schlage L Series High Security Mortise Lock", "SCH-L9453-619", "Mortise Locks", s1.id, 385.00),
            ("Schlage AD-300 Networked Electronic Lock", "SCH-AD300-ACC", "Electronic Locks", s1.id, 720.00),
            ("ASSA ABLOY DC400 Overhead Door Closer", "AA-DC400-BC", "Door Closers", s2.id, 210.00),
            ("ASSA ABLOY Cam Motion Concealed Hinge", "AA-HG-BB1279", "Hinges", s2.id, 24.50),
            ("ASSA ABLOY Floor Spring Heavy Duty Closer", "AA-FS-700", "Floor Springs", s2.id, 540.00),
            ("ASSA ABLOY Touch-Bar Panic Exit Device (36\")", "AA-PB3600", "Panic Hardware", s2.id, 295.00),
            ("Standard Stainless Steel Ball Bearing Hinge 4x4", "GEN-BBH-4X4", "Hinges", s1.id, 12.00),
            ("Heavy Duty Architectural Surface Bolt 8\"", "GEN-SB-HVY", "Bolts", s1.id, 18.00),
            ("DORMA TS93 Cam-Action Architectural Closer", "DOR-TS93-SIL", "Door Closers", s3.id, 235.00),
            ("DORMA PHA 2000 Panic Hardware System", "DOR-PHA-2000", "Panic Hardware", s3.id, 310.00),
        ]

        products = []
        for name, sku, category, sup_id, base_price in products_data:
            p = models.Product(name=name, sku=sku, category=category, supplier_id=sup_id, base_price=base_price)
            products.append(p)
            db.add(p)
        db.commit()

        for p in products:
            db.refresh(p)

        print("[3/7] Seeding supplier price list...")
        today = datetime.date.today()
        price_list_items = [
            (products[0].id, s1.id, 79.00),
            (products[1].id, s1.id, 130.00),
            (products[2].id, s1.id, 360.00),
            (products[3].id, s1.id, 695.00),
            (products[4].id, s2.id, 195.00),
            (products[5].id, s2.id, 22.00),
            (products[6].id, s2.id, 510.00),
            (products[7].id, s2.id, 275.00),
            (products[8].id, s1.id, 10.50),
            (products[9].id, s1.id, 16.00),
            (products[10].id, s3.id, 220.00),
            (products[11].id, s3.id, 290.00),
        ]
        for pid, sup_id, price in price_list_items:
            db.add(models.SupplierPriceList(supplier_id=sup_id, product_id=pid, price=price, effective_date=today))
        db.commit()

        print("[4/7] Seeding hardware sets...")
        hw_sets = [
            models.HardwareSet(
                name="HS-Commercial-MainEntry",
                door_type="Main Entry",
                specifications="Commercial Main Entry — mortise lock, closer, 3 hinges, panic bar",
                category="Commercial",
                components=[
                    {"product_id": products[2].id, "product_name": products[2].name, "sku": products[2].sku, "category": products[2].category, "quantity": 1, "unit_price": float(products[2].base_price or 385.0)},
                    {"product_id": products[4].id, "product_name": products[4].name, "sku": products[4].sku, "category": products[4].category, "quantity": 1, "unit_price": float(products[4].base_price or 210.0)},
                    {"product_id": products[5].id, "product_name": products[5].name, "sku": products[5].sku, "category": products[5].category, "quantity": 3, "unit_price": float(products[5].base_price or 24.50)},
                    {"product_id": products[7].id, "product_name": products[7].name, "sku": products[7].sku, "category": products[7].category, "quantity": 1, "unit_price": float(products[7].base_price or 295.0)},
                ],
            ),
            models.HardwareSet(
                name="HS-Commercial-Interior",
                door_type="Interior",
                specifications="Commercial Interior — lever set, 2 hinges, surface bolt",
                category="Commercial",
                components=[
                    {"product_id": products[1].id, "product_name": products[1].name, "sku": products[1].sku, "category": products[1].category, "quantity": 1, "unit_price": float(products[1].base_price or 145.0)},
                    {"product_id": products[5].id, "product_name": products[5].name, "sku": products[5].sku, "category": products[5].category, "quantity": 2, "unit_price": float(products[5].base_price or 24.50)},
                    {"product_id": products[9].id, "product_name": products[9].name, "sku": products[9].sku, "category": products[9].category, "quantity": 1, "unit_price": float(products[9].base_price or 18.0)},
                ],
            ),
            models.HardwareSet(
                name="HS-Residential-FrontDoor",
                door_type="Front Door",
                specifications="Residential Front Door — deadbolt, lever, 3 hinges",
                category="Residential",
                components=[
                    {"product_id": products[0].id, "product_name": products[0].name, "sku": products[0].sku, "category": products[0].category, "quantity": 1, "unit_price": float(products[0].base_price or 89.50)},
                    {"product_id": products[1].id, "product_name": products[1].name, "sku": products[1].sku, "category": products[1].category, "quantity": 1, "unit_price": float(products[1].base_price or 145.0)},
                    {"product_id": products[5].id, "product_name": products[5].name, "sku": products[5].sku, "category": products[5].category, "quantity": 3, "unit_price": float(products[5].base_price or 24.50)},
                ],
            ),
            models.HardwareSet(
                name="HS-Residential-Interior",
                door_type="Interior",
                specifications="Residential Interior — lever, 2 hinges",
                category="Residential",
                components=[
                    {"product_id": products[1].id, "product_name": products[1].name, "sku": products[1].sku, "category": products[1].category, "quantity": 1, "unit_price": float(products[1].base_price or 145.0)},
                    {"product_id": products[8].id, "product_name": products[8].name, "sku": products[8].sku, "category": products[8].category, "quantity": 2, "unit_price": float(products[8].base_price or 12.0)},
                ],
            ),
            models.HardwareSet(
                name="HS-Commercial-MainEntry (Custom Variant)",
                door_type="Main Entry",
                specifications="Customized hardware set for King's College Hospital Dubai Hills requirements.",
                category="Commercial",
                components=[
                    {"product_id": products[4].id, "product_name": products[4].name, "sku": products[4].sku, "category": products[4].category, "quantity": 1, "unit_price": float(products[4].base_price or 210.0)},
                    {"product_id": products[7].id, "product_name": products[7].name, "sku": products[7].sku, "category": products[7].category, "quantity": 1, "unit_price": float(products[7].base_price or 295.0)},
                    {"product_id": products[1].id, "product_name": products[1].name, "sku": products[1].sku, "category": products[1].category, "quantity": 1, "unit_price": float(products[1].base_price or 145.0)},
                ],
            ),
        ]
        db.add_all(hw_sets)
        db.commit()

        print("[5/7] Seeding door forms library...")
        door_forms = [
            models.DoorFormsLibrary(
                form_type="Single Leaf Swing",
                door_set_id=1,
                specifications="900mm x 2100mm standard single leaf commercial fire door",
                json_config={"leaf_count": 1, "width_mm": 900, "height_mm": 2100, "swing": "right", "fire_rating": "60min"},
            ),
            models.DoorFormsLibrary(
                form_type="Double Leaf Swing",
                door_set_id=2,
                specifications="2 x 900mm leaves, meeting stile with coordinator and flush bolts",
                json_config={"leaf_count": 2, "width_mm": 1800, "height_mm": 2100, "swing": "both", "fire_rating": "90min"},
            ),
            models.DoorFormsLibrary(
                form_type="Sliding Glass Door",
                door_set_id=3,
                specifications="Frameless architectural glass sliding, floor spring closer",
                json_config={"leaf_count": 1, "width_mm": 1200, "height_mm": 2400, "type": "sliding", "fire_rating": "none"},
            ),
        ]
        db.add_all(door_forms)
        db.commit()

        print("[6/7] Seeding project types & requirements templates...")
        pt1 = models.ProjectType(type_name="Commercial", default_hardware_grouping="HS-Commercial-MainEntry,HS-Commercial-Interior")
        pt2 = models.ProjectType(type_name="Residential", default_hardware_grouping="HS-Residential-FrontDoor,HS-Residential-Interior")
        db.add_all([pt1, pt2])

        req_templates = [
            models.RequirementsTemplate(
                project_type="Commercial",
                required_fields="fire_rating,security_level,finish,door_count",
                validation_rules={
                    "min_fire_rating": "60min",
                    "allowed_finishes": ["Satin Stainless Steel", "Matt Black", "Polished Chrome", "Brushed Brass"],
                    "mandatory_hardware": ["Door Closer", "Mortise Lock", "Hinges"],
                },
            ),
            models.RequirementsTemplate(
                project_type="Residential",
                required_fields="fire_rating,finish,door_count",
                validation_rules={
                    "min_fire_rating": "30min",
                    "allowed_finishes": ["Satin Nickel", "Matt Black", "Brushed Brass"],
                    "mandatory_hardware": ["Deadbolt", "Lever Handle"],
                },
            ),
        ]
        db.add_all(req_templates)
        db.commit()

        print("[7/7] Seeding sample demo project & enquiry...")
        demo_project = models.Project(
            name="Downtown Dubai Tower Phase 2",
            type="Commercial",
            status="Proposal Draft",
        )
        db.add(demo_project)
        db.commit()
        db.refresh(demo_project)

        demo_enquiry = models.Enquiry(
            project_id=demo_project.id,
            stage="Tender",
            entry_point="Portal",
            status="processing",
        )
        db.add(demo_enquiry)
        db.commit()
        db.refresh(demo_enquiry)

        demo_quotation = models.Quotation(
            enquiry_id=demo_enquiry.id,
            draft_status="ai_draft",
            user_approved=False,
        )
        db.add(demo_quotation)
        db.commit()
        db.refresh(demo_quotation)

        # Add line items in AED
        q_items = [
            models.QuotationItem(quotation_id=demo_quotation.id, product_id=products[2].id, quantity=48, unit_price=360.00, margin=0.20),
            models.QuotationItem(quotation_id=demo_quotation.id, product_id=products[4].id, quantity=48, unit_price=195.00, margin=0.20),
            models.QuotationItem(quotation_id=demo_quotation.id, product_id=products[5].id, quantity=144, unit_price=22.00, margin=0.20),
            models.QuotationItem(quotation_id=demo_quotation.id, product_id=products[7].id, quantity=48, unit_price=275.00, margin=0.20),
        ]
        db.add_all(q_items)

        mat_cost = 48 * 360.00 + 48 * 195.00 + 144 * 22.00 + 48 * 275.00 # 17280 + 9360 + 3168 + 13200 = 43008
        labor = (48 + 48 + 144 + 48) * 15.00 # 288 * 15 = 4320
        overhead = mat_cost * 0.05 # 2150.40
        total_price = mat_cost + labor + overhead

        cs = models.CostSummary(
            quotation_id=demo_quotation.id,
            material_cost=mat_cost,
            labor=labor,
            markup=0.20,
            total_price=total_price,
        )
        db.add(cs)
        db.commit()

        print("Database initialized and seeded successfully.")
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    seed_database()
