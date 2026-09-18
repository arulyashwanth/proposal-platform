"""
seed_mock_data.py — Expanded seed data for Mekatron development.
Populates all tables with realistic hardware/door product data.
Run once after setup_db.py.
"""
import psycopg2
import os
import datetime
from dotenv import load_dotenv

def seed_data():
    load_dotenv()

    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url or "your_project_ref" in db_url:
        print("Please configure SUPABASE_DB_URL in the .env file.")
        return

    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("\n[1/8] Seeding suppliers...")
        cursor.execute("""
            INSERT INTO suppliers (name, contact) VALUES
            ('Allegion (Schlage)', 'orders@allegion.com'),
            ('ASSA ABLOY', 'sales@assaabloy.com')
            ON CONFLICT DO NOTHING;
        """)

        print("[2/8] Seeding products (10 items)...")
        products = [
            ("Schlage B60N Deadbolt", "SCH-B60N-619", "Deadbolts", 1, 89.50),
            ("Schlage ND Series Lever", "SCH-ND80-619", "Levers", 1, 145.00),
            ("Schlage L Series Mortise Lock", "SCH-L9453-619", "Mortise Locks", 1, 385.00),
            ("Schlage AD-300 Electronic Lock", "SCH-AD300-ACC", "Electronic Locks", 1, 720.00),
            ("ASSA ABLOY DC400 Door Closer", "AA-DC400-BC", "Door Closers", 2, 210.00),
            ("ASSA ABLOY Cam Motion Hinge", "AA-HG-BB1279", "Hinges", 2, 24.50),
            ("ASSA ABLOY Floor Spring Closer", "AA-FS-700", "Floor Springs", 2, 540.00),
            ("ASSA ABLOY Panic Bar (36\")", "AA-PB3600", "Panic Hardware", 2, 295.00),
            ("Standard Ball Bearing Hinge 4x4", "GEN-BBH-4X4", "Hinges", 1, 12.00),
            ("Heavy Duty Surface Bolt", "GEN-SB-HVY", "Bolts", 1, 18.00),
        ]
        for name, sku, category, supplier_id, base_price in products:
            cursor.execute("""
                INSERT INTO products (name, sku, category, supplier_id, base_price)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (sku) DO NOTHING;
            """, (name, sku, category, supplier_id, base_price))

        print("[3/8] Seeding supplier price list...")
        today = datetime.date.today().isoformat()
        # Fetch product IDs
        cursor.execute("SELECT id, sku FROM products;")
        product_rows = cursor.fetchall()
        sku_to_id = {sku: pid for pid, sku in product_rows}

        price_list = [
            # (sku, supplier_id, price)
            ("SCH-B60N-619",   1, 79.00),
            ("SCH-ND80-619",   1, 130.00),
            ("SCH-L9453-619",  1, 360.00),
            ("SCH-AD300-ACC",  1, 695.00),
            ("AA-DC400-BC",    2, 195.00),
            ("AA-HG-BB1279",   2, 22.00),
            ("AA-FS-700",      2, 510.00),
            ("AA-PB3600",      2, 275.00),
            ("GEN-BBH-4X4",    1, 10.50),
            ("GEN-SB-HVY",     1, 16.00),
        ]
        for sku, supplier_id, price in price_list:
            pid = sku_to_id.get(sku)
            if pid:
                cursor.execute("""
                    INSERT INTO supplier_price_list (supplier_id, product_id, price, effective_date)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING;
                """, (supplier_id, pid, price, today))

        print("[4/8] Seeding hardware sets...")
        hardware_sets = [
            ("HS-Commercial-MainEntry", "Main Entry", "Commercial Main Entry — mortise lock, closer, 3 hinges, panic bar", "Commercial"),
            ("HS-Commercial-Interior",  "Interior",   "Commercial Interior — lever set, 2 hinges, surface bolt", "Commercial"),
            ("HS-Residential-FrontDoor","Front Door",  "Residential Front Door — deadbolt, lever, 3 hinges", "Residential"),
            ("HS-Residential-Interior", "Interior",   "Residential Interior — lever, 2 hinges", "Residential"),
        ]
        for name, door_type, specs, category in hardware_sets:
            cursor.execute("""
                INSERT INTO hardware_sets (name, door_type, specifications, category)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (name, door_type, specs, category))

        print("[5/8] Seeding door forms library...")
        import json
        door_forms = [
            ("Single Leaf Swing", 1, "900mm x 2100mm standard single leaf",
             {"leaf_count": 1, "width_mm": 900, "height_mm": 2100, "swing": "right", "fire_rating": "60min"}),
            ("Double Leaf Swing", 2, "2 x 900mm leaves, meeting stile with flush bolts",
             {"leaf_count": 2, "width_mm": 1800, "height_mm": 2100, "swing": "both", "fire_rating": "90min"}),
            ("Sliding Glass Door",  3, "Frameless glass sliding, floor spring closer",
             {"leaf_count": 1, "width_mm": 1200, "height_mm": 2400, "type": "sliding", "fire_rating": "none"}),
        ]
        for form_type, door_set_id, specs, config in door_forms:
            cursor.execute("""
                INSERT INTO door_forms_library (form_type, door_set_id, specifications, json_config)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (form_type, door_set_id, specs, json.dumps(config)))

        print("[6/8] Seeding project types...")
        project_types = [
            ("Commercial", "HS-Commercial-MainEntry,HS-Commercial-Interior"),
            ("Residential", "HS-Residential-FrontDoor,HS-Residential-Interior"),
        ]
        for type_name, grouping in project_types:
            cursor.execute("""
                INSERT INTO project_types (type_name, default_hardware_grouping)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING;
            """, (type_name, grouping))

        print("[7/8] Seeding requirements templates...")
        import json
        templates = [
            (
                "Commercial",
                "door_type,door_width_mm,door_height_mm,fire_rating,project_type",
                json.dumps([
                    {"field": "door_width_mm", "operator": "gte", "value": 800, "message": "Commercial doors must be at least 800mm wide.", "severity": "error"},
                    {"field": "door_height_mm", "operator": "gte", "value": 2000, "message": "Commercial doors must be at least 2000mm tall.", "severity": "error"},
                    {"field": "fire_rating",    "operator": "in",  "value": ["60min", "90min", "120min"], "message": "Commercial doors require a fire rating of 60min or above.", "severity": "warning"},
                ])
            ),
            (
                "Residential",
                "door_type,door_width_mm,door_height_mm",
                json.dumps([
                    {"field": "door_width_mm", "operator": "gte", "value": 700, "message": "Residential doors must be at least 700mm wide.", "severity": "error"},
                    {"field": "door_height_mm", "operator": "gte", "value": 1980, "message": "Standard residential door height is 1980mm+.", "severity": "warning"},
                ])
            ),
        ]
        for project_type, required_fields, validation_rules in templates:
            cursor.execute("""
                INSERT INTO requirements_templates (project_type, required_fields, validation_rules)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (project_type, required_fields, validation_rules))

        print("[8/8] Seeding sample projects and enquiries...")
        cursor.execute("""
            INSERT INTO projects (name, type, status) VALUES
            ('City Centre Office Tower', 'Commercial', 'active'),
            ('Green Valley Residences',  'Residential', 'draft')
            ON CONFLICT DO NOTHING;
        """)

        print("\nSeed data complete! All tables populated.")

    except Exception as e:
        print(f"\nSeeding error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    seed_data()
