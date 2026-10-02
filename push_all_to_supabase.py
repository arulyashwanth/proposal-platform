"""
push_all_to_supabase.py — Push all local data (sample hardware sets, products,
suppliers, door forms, templates, demo projects & quotations) to Supabase PostgreSQL.
"""
import os
import json
import sqlite3
import psycopg2
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
if not SUPABASE_DB_URL:
    raise ValueError("SUPABASE_DB_URL not found in .env")

print(f"Connecting to Supabase PostgreSQL...")
pg_conn = psycopg2.connect(SUPABASE_DB_URL)
pg_conn.autocommit = False
pg_cur = pg_conn.cursor()

sq_conn = sqlite3.connect("mekatron.db")
sq_conn.row_factory = sqlite3.Row
sq_cur = sq_conn.cursor()

try:
    print("[1/6] Ensuring Supabase schema has all tables and columns...")

    # Ensure hardware_sets has components JSONB column
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS hardware_sets (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            door_type VARCHAR(100),
            specifications TEXT,
            category VARCHAR(100),
            components JSONB
        );
    """)
    pg_cur.execute("""
        ALTER TABLE hardware_sets ADD COLUMN IF NOT EXISTS components JSONB;
    """)

    # Ensure suppliers table
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            contact VARCHAR(255)
        );
    """)

    # Ensure products table
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            sku VARCHAR(100) UNIQUE,
            category VARCHAR(100),
            supplier_id INT,
            base_price DECIMAL(10, 2)
        );
    """)

    # Ensure supplier_price_list
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS supplier_price_list (
            id SERIAL PRIMARY KEY,
            supplier_id INT,
            product_id INT REFERENCES products(id),
            price DECIMAL(10, 2),
            effective_date DATE
        );
    """)

    # Ensure door_forms_library
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS door_forms_library (
            id SERIAL PRIMARY KEY,
            form_type VARCHAR(100),
            door_set_id INT,
            specifications TEXT,
            json_config JSONB
        );
    """)

    # Ensure project_types
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS project_types (
            id SERIAL PRIMARY KEY,
            type_name VARCHAR(100),
            default_hardware_grouping TEXT
        );
    """)

    # Ensure hardware_groupings
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS hardware_groupings (
            id SERIAL PRIMARY KEY,
            grouping_name VARCHAR(100),
            sets_included TEXT,
            default_selections TEXT
        );
    """)

    # Ensure requirements_templates
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS requirements_templates (
            id SERIAL PRIMARY KEY,
            project_type VARCHAR(100),
            required_fields TEXT,
            validation_rules JSONB
        );
    """)

    # Ensure projects & enquiries & quotations
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            type VARCHAR(50),
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS enquiries (
            id SERIAL PRIMARY KEY,
            project_id INT REFERENCES projects(id),
            stage VARCHAR(50),
            entry_point VARCHAR(50),
            status VARCHAR(50)
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS quotations (
            id SERIAL PRIMARY KEY,
            enquiry_id INT REFERENCES enquiries(id),
            draft_status VARCHAR(50),
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_approved BOOLEAN DEFAULT FALSE
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS quotation_items (
            id SERIAL PRIMARY KEY,
            quotation_id INT REFERENCES quotations(id),
            product_id INT REFERENCES products(id),
            quantity INT,
            unit_price DECIMAL(10, 2),
            margin DECIMAL(5, 2)
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS cost_summaries (
            id SERIAL PRIMARY KEY,
            quotation_id INT REFERENCES quotations(id),
            material_cost DECIMAL(12, 2),
            labor DECIMAL(12, 2),
            markup DECIMAL(12, 2),
            total_price DECIMAL(12, 2)
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            contact_info TEXT,
            project_history TEXT
        );
    """)

    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS contractors (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            projects TEXT,
            bidding_status VARCHAR(50)
        );
    """)

    print("[2/6] Cleaning outdated/mismatched data in Supabase...")
    # Clean dependent tables first
    pg_cur.execute("DELETE FROM cost_summaries;")
    pg_cur.execute("DELETE FROM quotation_items;")
    pg_cur.execute("DELETE FROM quotations;")
    pg_cur.execute("DELETE FROM enquiries;")
    pg_cur.execute("DELETE FROM projects;")
    pg_cur.execute("DELETE FROM supplier_price_list;")
    pg_cur.execute("DELETE FROM products;")
    pg_cur.execute("DELETE FROM suppliers;")
    pg_cur.execute("DELETE FROM hardware_sets;")
    pg_cur.execute("DELETE FROM door_forms_library;")
    pg_cur.execute("DELETE FROM requirements_templates;")
    pg_cur.execute("DELETE FROM project_types;")
    pg_cur.execute("DELETE FROM hardware_groupings;")
    pg_cur.execute("DELETE FROM customers;")
    pg_cur.execute("DELETE FROM contractors;")

    print("[3/6] Migrating suppliers from SQLite...")
    sq_cur.execute("SELECT * FROM suppliers ORDER BY id")
    suppliers = sq_cur.fetchall()
    for s in suppliers:
        pg_cur.execute(
            "INSERT INTO suppliers (id, name, contact) VALUES (%s, %s, %s)",
            (s['id'], s['name'], s['contact'])
        )
    print(f"  Pushed {len(suppliers)} suppliers.")

    print("[4/6] Migrating products & price lists from SQLite...")
    sq_cur.execute("SELECT * FROM products ORDER BY id")
    products = sq_cur.fetchall()
    for p in products:
        pg_cur.execute(
            """INSERT INTO products (id, name, sku, category, supplier_id, base_price)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (p['id'], p['name'], p['sku'], p['category'], p['supplier_id'], p['base_price'])
        )
    print(f"  Pushed {len(products)} products.")

    sq_cur.execute("SELECT * FROM supplier_price_list ORDER BY id")
    price_lists = sq_cur.fetchall()
    for pl in price_lists:
        pg_cur.execute(
            """INSERT INTO supplier_price_list (id, supplier_id, product_id, price, effective_date)
               VALUES (%s, %s, %s, %s, %s)""",
            (pl['id'], pl['supplier_id'], pl['product_id'], pl['price'], pl['effective_date'])
        )
    print(f"  Pushed {len(price_lists)} supplier price list items.")

    print("[5/6] Migrating hardware sets with components from SQLite...")
    sq_cur.execute("SELECT * FROM hardware_sets ORDER BY id")
    hw_sets = sq_cur.fetchall()
    for h in hw_sets:
        components_val = h['components']
        # If it's a string, ensure it's valid JSON
        if components_val and isinstance(components_val, str):
            components_json = components_val
        elif components_val:
            components_json = json.dumps(components_val)
        else:
            components_json = json.dumps([])

        pg_cur.execute(
            """INSERT INTO hardware_sets (id, name, door_type, specifications, category, components)
               VALUES (%s, %s, %s, %s, %s, %s::jsonb)""",
            (h['id'], h['name'], h['door_type'], h['specifications'], h['category'], components_json)
        )
        print(f"  Pushed Hardware Set #{h['id']}: {h['name']} ({h['category']}) with {len(json.loads(components_json))} components.")

    print("[6/6] Migrating door forms, templates, projects, quotations...")
    sq_cur.execute("SELECT * FROM door_forms_library ORDER BY id")
    for df in sq_cur.fetchall():
        cfg = df['json_config']
        cfg_json = json.dumps(cfg) if not isinstance(cfg, str) else cfg
        pg_cur.execute(
            """INSERT INTO door_forms_library (id, form_type, door_set_id, specifications, json_config)
               VALUES (%s, %s, %s, %s, %s::jsonb)""",
            (df['id'], df['form_type'], df['door_set_id'], df['specifications'], cfg_json)
        )

    sq_cur.execute("SELECT * FROM project_types ORDER BY id")
    for pt in sq_cur.fetchall():
        pg_cur.execute(
            "INSERT INTO project_types (id, type_name, default_hardware_grouping) VALUES (%s, %s, %s)",
            (pt['id'], pt['type_name'], pt['default_hardware_grouping'])
        )

    sq_cur.execute("SELECT * FROM requirements_templates ORDER BY id")
    for rt in sq_cur.fetchall():
        vr = rt['validation_rules']
        vr_json = json.dumps(vr) if not isinstance(vr, str) else vr
        pg_cur.execute(
            """INSERT INTO requirements_templates (id, project_type, required_fields, validation_rules)
               VALUES (%s, %s, %s, %s::jsonb)""",
            (rt['id'], rt['project_type'], rt['required_fields'], vr_json)
        )

    sq_cur.execute("SELECT * FROM projects ORDER BY id")
    for pr in sq_cur.fetchall():
        pg_cur.execute(
            "INSERT INTO projects (id, name, type, status, created_at) VALUES (%s, %s, %s, %s, %s)",
            (pr['id'], pr['name'], pr['type'], pr['status'], pr['created_at'])
        )

    sq_cur.execute("SELECT * FROM enquiries ORDER BY id")
    for en in sq_cur.fetchall():
        pg_cur.execute(
            "INSERT INTO enquiries (id, project_id, stage, entry_point, status) VALUES (%s, %s, %s, %s, %s)",
            (en['id'], en['project_id'], en['stage'], en['entry_point'], en['status'])
        )

    sq_cur.execute("SELECT * FROM quotations ORDER BY id")
    for q in sq_cur.fetchall():
        pg_cur.execute(
            "INSERT INTO quotations (id, enquiry_id, draft_status, generated_at, user_approved) VALUES (%s, %s, %s, %s, %s)",
            (q['id'], q['enquiry_id'], q['draft_status'], q['generated_at'], bool(q['user_approved']))
        )

    sq_cur.execute("SELECT * FROM quotation_items ORDER BY id")
    for qi in sq_cur.fetchall():
        pg_cur.execute(
            """INSERT INTO quotation_items (id, quotation_id, product_id, quantity, unit_price, margin)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (qi['id'], qi['quotation_id'], qi['product_id'], qi['quantity'], qi['unit_price'], qi['margin'])
        )

    sq_cur.execute("SELECT * FROM cost_summaries ORDER BY id")
    for cs in sq_cur.fetchall():
        pg_cur.execute(
            """INSERT INTO cost_summaries (id, quotation_id, material_cost, labor, markup, total_price)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (cs['id'], cs['quotation_id'], cs['material_cost'], cs['labor'], cs['markup'], cs['total_price'])
        )

    # Reset all PostgreSQL auto-increment serial sequences so new inserts don't collide
    all_serial_tables = [
        'suppliers', 'products', 'supplier_price_list', 'hardware_sets',
        'door_forms_library', 'project_types', 'requirements_templates',
        'projects', 'enquiries', 'quotations', 'quotation_items', 'cost_summaries'
    ]
    for tbl in all_serial_tables:
        pg_cur.execute(f"""
            SELECT setval(
                pg_get_serial_sequence('{tbl}', 'id'),
                COALESCE((SELECT MAX(id) FROM {tbl}), 1)
            );
        """)

    # Ensure RLS policies and permissions are granted
    for tbl in all_serial_tables:
        pg_cur.execute(f'ALTER TABLE "{tbl}" ENABLE ROW LEVEL SECURITY;')
        pg_cur.execute(f'DROP POLICY IF EXISTS "Public full access" ON "{tbl}";')
        pg_cur.execute(f'CREATE POLICY "Public full access" ON "{tbl}" FOR ALL USING (true) WITH CHECK (true);')
        pg_cur.execute(f'GRANT ALL ON "{tbl}" TO anon, authenticated, service_role;')

    pg_conn.commit()
    print("\nSUCCESS! All local data pushed and verified in Supabase PostgreSQL.")

except Exception as e:
    pg_conn.rollback()
    print(f"\nERROR during push to Supabase: {e}")
    raise
finally:
    pg_cur.close()
    pg_conn.close()
    sq_conn.close()
