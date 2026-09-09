"""
tools.py — LangChain tools for Mekatron.
All tools are backed by real Supabase DB queries.
These tools are wired into LangChain agents when AI credits become available.
Until then, the underlying functions are called directly from API endpoints.
"""
from langchain_core.tools import tool
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import models
from database import SessionLocal
from decimal import Decimal
import datetime


# ─── DB Session helper (for use outside FastAPI request context) ──────────────

def get_db_session() -> Session:
    return SessionLocal()


# ─── Tool: Fetch Supplier Pricing ─────────────────────────────────────────────

@tool
def fetch_supplier_pricing(supplier_id: int, product_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """
    Fetch the latest pricing for specific products from a supplier.
    Queries the supplier_price_list table (Redis cache TTL: 24h, fallback: PostgreSQL).
    """
    db = get_db_session()
    try:
        result = {}
        for pid in product_ids:
            price_entry = (
                db.query(models.SupplierPriceList)
                .filter(
                    models.SupplierPriceList.supplier_id == supplier_id,
                    models.SupplierPriceList.product_id == pid,
                )
                .order_by(models.SupplierPriceList.effective_date.desc())
                .first()
            )
            if price_entry:
                result[pid] = {
                    "price": float(price_entry.price),
                    "currency": "USD",
                    "effective_date": str(price_entry.effective_date),
                    "source": "supplier_price_list",
                }
            else:
                # Fallback to base_price
                product = db.query(models.Product).filter(models.Product.id == pid).first()
                result[pid] = {
                    "price": float(product.base_price) if product and product.base_price else 0.0,
                    "currency": "USD",
                    "effective_date": None,
                    "source": "base_price_fallback",
                }
        return result
    finally:
        db.close()


# ─── Tool: Search Vector DB ───────────────────────────────────────────────────
# This tool will be upgraded to real Pinecone search once OpenAI credits are live.
# For now it does a SQL ILIKE keyword search as fallback.

@tool
def search_vector_db(query: str, namespace: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Semantic search against Pinecone vector store (namespace: products, specifications, etc).
    Currently falls back to SQL keyword search until OpenAI embeddings are available.
    """
    db = get_db_session()
    try:
        products = (
            db.query(models.Product)
            .filter(
                models.Product.name.ilike(f"%{query}%") |
                models.Product.category.ilike(f"%{query}%") |
                models.Product.sku.ilike(f"%{query}%")
            )
            .limit(top_k)
            .all()
        )
        return [
            {
                "id": p.id,
                "score": 0.70,  # Placeholder score (SQL match has no relevance score)
                "metadata": {
                    "name": p.name,
                    "sku": p.sku,
                    "category": p.category,
                    "base_price": float(p.base_price) if p.base_price else 0.0,
                    "source": "sql_keyword_fallback",
                },
            }
            for p in products
        ]
    finally:
        db.close()


# ─── Tool: Validate Hardware Compatibility ────────────────────────────────────

@tool
def validate_hardware_compatibility(
    hardware_set_ids: List[int],
    project_specs: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Rule engine: checks that the selected hardware sets are compatible
    with the project specifications (door_type, fire_rating, etc.).
    """
    db = get_db_session()
    try:
        conflicts = []
        recommendations = []

        for hs_id in hardware_set_ids:
            hw = db.query(models.HardwareSet).filter(models.HardwareSet.id == hs_id).first()
            if not hw:
                conflicts.append(f"Hardware set ID {hs_id} not found.")
                continue

            # Rule 1: Door type mismatch
            req_door_type = project_specs.get("door_type")
            if req_door_type and hw.door_type and hw.door_type.lower() != req_door_type.lower():
                conflicts.append(
                    f"Hardware set '{hw.name}' is for '{hw.door_type}' doors, "
                    f"but project requires '{req_door_type}'."
                )

            # Rule 2: Category mismatch (commercial vs residential)
            project_type = project_specs.get("project_type", "").lower()
            if project_type and hw.category and project_type not in hw.category.lower():
                recommendations.append(
                    f"Hardware set '{hw.name}' (category: {hw.category}) may not be "
                    f"optimal for a {project_type} project."
                )

        return {
            "compatible": len(conflicts) == 0,
            "conflicts": conflicts,
            "recommendations": recommendations,
        }
    finally:
        db.close()


# ─── Tool: Calculate Costs ────────────────────────────────────────────────────

@tool
def calculate_costs(
    product_ids: List[int],
    quantities: List[int],
    supplier_id: int,
) -> Dict[str, Any]:
    """
    Fetch supplier pricing, apply volume discounts, and calculate total costs
    (material + labor + overhead). Uses the pricing engine.
    """
    from pricing_engine import optimize_pricing

    db = get_db_session()
    try:
        items = [
            {"product_id": pid, "quantity": qty, "supplier_id": supplier_id}
            for pid, qty in zip(product_ids, quantities)
        ]
        result = optimize_pricing(db, items, margin_target=0.20)
        return {
            "itemized_costs": result["itemized_costs"],
            "total": result["cost_breakdown"]["total_cost"],
            "margin_available": result["pricing"]["actual_margin_pct"],
            "cost_breakdown": result["cost_breakdown"],
        }
    finally:
        db.close()


# ─── Tool: Check Inventory Availability ──────────────────────────────────────

@tool
def check_inventory_availability(
    product_ids: List[int],
    delivery_timeline: str,
) -> Dict[str, Any]:
    """
    Query product availability and lead times from the database.
    (Production: would call supplier APIs. Currently queries DB for known products.)
    """
    db = get_db_session()
    try:
        available_items = []
        unavailable_items = []
        lead_times = {}
        alternatives = {}

        for pid in product_ids:
            product = db.query(models.Product).filter(models.Product.id == pid).first()
            if product:
                available_items.append(pid)
                # Determine lead time by category
                category = (product.category or "").lower()
                if "lock" in category or "mortise" in category:
                    lead_times[pid] = "2-3 weeks"
                elif "hinge" in category:
                    lead_times[pid] = "1 week"
                elif "closer" in category:
                    lead_times[pid] = "3-4 weeks"
                else:
                    lead_times[pid] = "2 weeks"
            else:
                unavailable_items.append(pid)

        return {
            "available_items": available_items,
            "unavailable_items": unavailable_items,
            "lead_times": lead_times,
            "alternatives": alternatives,
            "delivery_feasible": len(unavailable_items) == 0,
        }
    finally:
        db.close()


# ─── Tool: Generate Quotation Document ───────────────────────────────────────

@tool
def generate_quotation_document(quotation_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Renders a professional HTML quotation document using Jinja2 template engine.
    The output can be printed to PDF from any browser.
    """
    from document_generator import generate_quotation_html

    return generate_quotation_html(
        quotation_id=quotation_data.get("quotation_id", 0),
        project_name=quotation_data.get("project_name", "Unnamed Project"),
        client_name=quotation_data.get("client_name", "Valued Client"),
        items=quotation_data.get("items", []),
        cost_summary=quotation_data.get("cost_summary", {
            "material_cost": 0, "labor": 0, "markup": 0, "total_price": 0
        }),
        prepared_by=quotation_data.get("prepared_by", "Mekatron System"),
        notes=quotation_data.get("notes"),
    )


# ─── Export all tools for LangChain agent ────────────────────────────────────

mekatron_tools = [
    fetch_supplier_pricing,
    search_vector_db,
    validate_hardware_compatibility,
    calculate_costs,
    check_inventory_availability,
    generate_quotation_document,
]
