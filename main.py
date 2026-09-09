"""
main.py — Mekatron FastAPI Application
AI-Assisted Proposal Preparation System
"""
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from database import engine, get_db
import models
from pricing_engine import optimize_pricing, validate_requirements_against_template
from chains import generate_quotation_draft, get_openai_embeddings

# Ensure all tables exist on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mekatron — AI-Assisted Proposal Preparation System",
    version="1.0.0",
    description=(
        "Backend API for Mekatron. "
        "AI endpoints (quotation/generate, products/search via Pinecone) "
        "return graceful 'ai_status: unavailable' responses when credits are exhausted."
    ),
)


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class EnquiryCreate(BaseModel):
    project_type: str
    stage: str
    requirements: Dict[str, Any] = {}
    client_name: Optional[str] = None

class QuotationGenerate(BaseModel):
    enquiry_id: int
    generate_type: str = "full"

class QuotationItemAdd(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    margin: float = 0.0

class PricingOptimize(BaseModel):
    items: List[Dict[str, Any]]   # [{product_id, quantity, supplier_id?}]
    margin_target: float = 0.20

class RequirementsValidate(BaseModel):
    project_type: str
    specifications: Dict[str, Any]

class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None

class SupplierPricingUpdate(BaseModel):
    supplier_id: int
    price_list_data: List[Dict[str, Any]]   # [{product_id, price, effective_date?}]

class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    supplier_id: Optional[int] = None
    base_price: float = 0.00

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    base_price: Optional[float] = None

class HardwareSetCreate(BaseModel):
    name: str
    door_type: str
    specifications: Optional[str] = None
    category: str

class DoorFormCreate(BaseModel):
    form_type: str
    door_set_id: Optional[int] = None
    specifications: Optional[str] = None
    json_config: Optional[Dict[str, Any]] = None


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Mekatron API",
        "version": "1.0.0",
        "status": "running",
        "ai_status": {
            "anthropic": "requires_credits",
            "openai_embeddings": "requires_credits",
            "pinecone_search": "sql_keyword_fallback_active",
        },
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENQUIRIES
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/enquiries/create", tags=["Enquiries"])
async def create_enquiry(enquiry: EnquiryCreate, db: Session = Depends(get_db)):
    """Create a new project + enquiry record in Supabase."""
    new_project = models.Project(
        name=f"{enquiry.client_name or 'New'} — {enquiry.project_type} Project",
        type=enquiry.project_type,
        status="draft",
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    new_enquiry = models.Enquiry(
        project_id=new_project.id,
        stage=enquiry.stage,
        entry_point="API",
        status="processing",
    )
    db.add(new_enquiry)
    db.commit()
    db.refresh(new_enquiry)

    return {
        "project_id": new_project.id,
        "enquiry_id": new_enquiry.id,
        "project_name": new_project.name,
        "processing_status": "saved_to_supabase",
    }


@app.get("/api/enquiries", tags=["Enquiries"])
async def list_enquiries(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all enquiries, optionally filtered by status."""
    query = db.query(models.Enquiry)
    if status:
        query = query.filter(models.Enquiry.status == status)
    enquiries = query.order_by(models.Enquiry.id.desc()).all()
    return [
        {
            "id": e.id,
            "project_id": e.project_id,
            "project_name": e.project.name if e.project else None,
            "stage": e.stage,
            "entry_point": e.entry_point,
            "status": e.status,
        }
        for e in enquiries
    ]


@app.get("/api/enquiries/{enquiry_id}", tags=["Enquiries"])
async def get_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    """Get a single enquiry by ID."""
    enquiry = db.query(models.Enquiry).filter(models.Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {
        "id": enquiry.id,
        "project_id": enquiry.project_id,
        "project_name": enquiry.project.name if enquiry.project else None,
        "stage": enquiry.stage,
        "status": enquiry.status,
        "quotations": [{"id": q.id, "draft_status": q.draft_status} for q in enquiry.quotations],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# QUOTATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/quotations/generate", tags=["Quotations"])
async def generate_quotation(req: QuotationGenerate, db: Session = Depends(get_db)):
    """
    AI-powered quotation draft generation via Claude (Anthropic).
    Returns graceful 'ai_status: unavailable' if credits are exhausted.
    A quotation record is always created in the DB regardless.
    """
    enquiry = db.query(models.Enquiry).filter(models.Enquiry.id == req.enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    # Always create a quotation record
    new_quotation = models.Quotation(enquiry_id=req.enquiry_id, draft_status="ai_pending")
    db.add(new_quotation)
    db.commit()
    db.refresh(new_quotation)

    # Attempt AI generation (gracefully handles credit errors)
    project_type = enquiry.project.type if enquiry.project else "General"
    ai_result = generate_quotation_draft(
        project_type=project_type,
        hardware_requirements={"door_type": "Main Entry"},
        customer_specs={"budget": "standard"},
    )

    status = "ai_draft" if ai_result.get("ai_status") == "success" else "manual_required"
    new_quotation.draft_status = status
    db.commit()

    return {
        "quotation_id": new_quotation.id,
        "enquiry_id": req.enquiry_id,
        "draft_status": status,
        "quotation_draft": ai_result,
        "editable_fields": ["margin", "quantities", "unit_price"],
        "next_step": (
            f"POST /api/quotations/{new_quotation.id}/items to add line items manually"
            if status == "manual_required" else
            "Review AI draft, then POST /api/quotations/{id}/items to confirm"
        ),
    }


@app.get("/api/quotations/{quotation_id}", tags=["Quotations"])
async def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Retrieve a quotation with its line items and cost summary."""
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    items = []
    for item in q.items:
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else None,
            "sku": item.product.sku if item.product else None,
            "category": item.product.category if item.product else None,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price) if item.unit_price else 0.0,
            "margin": float(item.margin) if item.margin else 0.0,
            "subtotal": float(item.unit_price or 0) * (item.quantity or 0),
        })

    summary = None
    if q.cost_summary:
        cs = q.cost_summary
        summary = {
            "material_cost": float(cs.material_cost or 0),
            "labor": float(cs.labor or 0),
            "markup": float(cs.markup or 0),
            "total_price": float(cs.total_price or 0),
        }

    return {
        "id": q.id,
        "enquiry_id": q.enquiry_id,
        "draft_status": q.draft_status,
        "generated_at": str(q.generated_at),
        "user_approved": q.user_approved,
        "items": items,
        "cost_summary": summary,
    }


@app.post("/api/quotations/{quotation_id}/items", tags=["Quotations"])
async def add_quotation_item(
    quotation_id: int,
    item: QuotationItemAdd,
    db: Session = Depends(get_db),
):
    """Add a line item to an existing quotation."""
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

    new_item = models.QuotationItem(
        quotation_id=quotation_id,
        product_id=item.product_id,
        quantity=item.quantity,
        unit_price=item.unit_price,
        margin=item.margin,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Recalculate cost summary
    _recalculate_cost_summary(db, quotation_id)

    return {
        "item_id": new_item.id,
        "quotation_id": quotation_id,
        "product_name": product.name,
        "sku": product.sku,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "subtotal": item.unit_price * item.quantity,
    }


@app.get("/api/quotations/{quotation_id}/preview", tags=["Quotations"])
async def preview_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Generate and serve the HTML quotation document."""
    from document_generator import generate_quotation_html

    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    project_name = q.enquiry.project.name if q.enquiry and q.enquiry.project else "Unnamed Project"

    items = []
    for it in q.items:
        items.append({
            "product_name": it.product.name if it.product else f"Product #{it.product_id}",
            "sku": it.product.sku if it.product else "",
            "category": it.product.category if it.product else "",
            "quantity": it.quantity or 0,
            "unit_price": float(it.unit_price or 0),
            "margin": float(it.margin or 0),
            "subtotal": float(it.unit_price or 0) * (it.quantity or 0),
        })

    cs = q.cost_summary
    cost_summary = {
        "material_cost": float(cs.material_cost or 0) if cs else 0,
        "labor":         float(cs.labor or 0) if cs else 0,
        "markup":        float(cs.markup or 0) if cs else 0,
        "total_price":   float(cs.total_price or 0) if cs else 0,
    }

    doc = generate_quotation_html(
        quotation_id=quotation_id,
        project_name=project_name,
        client_name="Valued Client",
        items=items,
        cost_summary=cost_summary,
    )

    return FileResponse(
        path=doc["document_path"],
        media_type="text/html",
        filename=doc["filename"],
    )


@app.post("/api/quotations/optimize-pricing", tags=["Quotations"])
async def optimize_pricing_endpoint(req: PricingOptimize, db: Session = Depends(get_db)):
    """
    Pure-math pricing optimizer — no AI needed.
    Given a list of items and a target margin, returns optimized sell prices and cost breakdown.
    """
    result = optimize_pricing(db, req.items, req.margin_target)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/products", tags=["Products"])
async def list_products(
    category: Optional[str] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """List all products with optional filters."""
    query = db.query(models.Product)
    if category:
        query = query.filter(models.Product.category.ilike(f"%{category}%"))
    if supplier_id:
        query = query.filter(models.Product.supplier_id == supplier_id)
    products = query.order_by(models.Product.id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else None,
            "base_price": float(p.base_price) if p.base_price else 0.0,
        }
        for p in products
    ]


@app.post("/api/products", tags=["Products"])
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    existing = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Product with SKU '{product.sku}' already exists (id={existing.id})")

    new_product = models.Product(
        name=product.name,
        sku=product.sku,
        category=product.category,
        supplier_id=product.supplier_id,
        base_price=product.base_price,
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {"id": new_product.id, "name": new_product.name, "sku": new_product.sku}


@app.get("/api/products/search", tags=["Products"])
async def search_products(
    query: str,
    project_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Semantic product search.
    Uses Pinecone + OpenAI embeddings when credits available.
    Falls back to SQL keyword search automatically.
    """
    embeddings = get_openai_embeddings()

    if embeddings is not None:
        # ── AI PATH: Pinecone semantic search ──
        try:
            from langchain_pinecone import PineconeVectorStore
            vectorstore = PineconeVectorStore(
                index_name="products",
                embedding=embeddings,
                namespace="products",
            )
            filter_dict = {"type": project_type} if project_type else None
            results = vectorstore.similarity_search(query, k=5, filter=filter_dict)
            matched_products = [
                {"content": doc.page_content, "metadata": doc.metadata, "source": "pinecone"}
                for doc in results
            ]
            return {"matched_products": matched_products, "search_mode": "semantic_pinecone", "status": "success"}
        except Exception:
            pass  # Fall through to SQL fallback

    # ── FALLBACK PATH: SQL keyword search ──
    sql_query = db.query(models.Product).filter(
        models.Product.name.ilike(f"%{query}%") |
        models.Product.category.ilike(f"%{query}%") |
        models.Product.sku.ilike(f"%{query}%")
    )
    if project_type:
        sql_query = sql_query.filter(models.Product.category.ilike(f"%{project_type}%"))

    products = sql_query.limit(5).all()
    matched_products = [
        {
            "content": f"{p.name} — {p.category} (SKU: {p.sku})",
            "metadata": {
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "base_price": float(p.base_price) if p.base_price else 0.0,
                "supplier_id": p.supplier_id,
            },
            "source": "sql_keyword_fallback",
        }
        for p in products
    ]
    return {
        "matched_products": matched_products,
        "search_mode": "sql_keyword_fallback",
        "status": "success",
        "note": "Semantic search unavailable -- OpenAI credits exhausted. Using keyword search.",
    }


@app.get("/api/products/{product_id}", tags=["Products"])
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a single product by ID."""
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "category": p.category,
        "supplier_id": p.supplier_id,
        "supplier_name": p.supplier.name if p.supplier else None,
        "base_price": float(p.base_price) if p.base_price else 0.0,
        "price_history": [
            {
                "supplier_id": pl.supplier_id,
                "price": float(pl.price),
                "effective_date": str(pl.effective_date),
            }
            for pl in p.price_lists
        ],
    }


@app.put("/api/products/{product_id}", tags=["Products"])
async def update_product(product_id: int, update: ProductUpdate, db: Session = Depends(get_db)):
    """Update product fields."""
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    if update.name is not None:
        p.name = update.name
    if update.category is not None:
        p.category = update.category
    if update.base_price is not None:
        p.base_price = update.base_price
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "category": p.category, "base_price": float(p.base_price or 0)}




# ═══════════════════════════════════════════════════════════════════════════════
# SUPPLIERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/suppliers", tags=["Suppliers"])
async def list_suppliers(db: Session = Depends(get_db)):
    """List all suppliers."""
    suppliers = db.query(models.Supplier).order_by(models.Supplier.id).all()
    return [
        {"id": s.id, "name": s.name, "contact": s.contact, "product_count": len(s.products)}
        for s in suppliers
    ]


@app.post("/api/suppliers", tags=["Suppliers"])
async def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create a new supplier."""
    new_supplier = models.Supplier(name=supplier.name, contact=supplier.contact)
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)
    return {"id": new_supplier.id, "name": new_supplier.name}


@app.post("/api/libraries/supplier-pricing/update", tags=["Suppliers"])
async def update_supplier_pricing(req: SupplierPricingUpdate, db: Session = Depends(get_db)):
    """
    Upsert supplier price list entries.
    Each entry in price_list_data: {product_id, price, effective_date (optional)}.
    """
    import datetime as dt

    upserted = 0
    errors = []

    for entry in req.price_list_data:
        product_id = entry.get("product_id")
        price = entry.get("price")
        effective_date_str = entry.get("effective_date")

        if product_id is None or price is None:
            errors.append(f"Skipped entry — missing product_id or price: {entry}")
            continue

        effective_date = (
            dt.date.fromisoformat(effective_date_str)
            if effective_date_str
            else dt.date.today()
        )

        # Check for existing entry on same date
        existing = (
            db.query(models.SupplierPriceList)
            .filter(
                models.SupplierPriceList.supplier_id == req.supplier_id,
                models.SupplierPriceList.product_id == product_id,
                models.SupplierPriceList.effective_date == effective_date,
            )
            .first()
        )
        if existing:
            existing.price = price
        else:
            db.add(models.SupplierPriceList(
                supplier_id=req.supplier_id,
                product_id=product_id,
                price=price,
                effective_date=effective_date,
            ))
        upserted += 1

    db.commit()
    return {
        "update_status": "success",
        "affected_rows": upserted,
        "errors": errors,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HARDWARE SETS & DOOR FORMS LIBRARY
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/hardware-sets", tags=["Hardware Library"])
async def list_hardware_sets(
    category: Optional[str] = None,
    door_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all hardware sets."""
    query = db.query(models.HardwareSet)
    if category:
        query = query.filter(models.HardwareSet.category.ilike(f"%{category}%"))
    if door_type:
        query = query.filter(models.HardwareSet.door_type.ilike(f"%{door_type}%"))
    hw_sets = query.order_by(models.HardwareSet.id).all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "door_type": h.door_type,
            "category": h.category,
            "specifications": h.specifications,
        }
        for h in hw_sets
    ]


@app.post("/api/hardware-sets", tags=["Hardware Library"])
async def create_hardware_set(hw: HardwareSetCreate, db: Session = Depends(get_db)):
    """Create a new hardware set."""
    new_hw = models.HardwareSet(
        name=hw.name,
        door_type=hw.door_type,
        specifications=hw.specifications,
        category=hw.category,
    )
    db.add(new_hw)
    db.commit()
    db.refresh(new_hw)
    return {"id": new_hw.id, "name": new_hw.name}


@app.get("/api/libraries/door-sets", tags=["Hardware Library"])
async def get_door_sets(
    filter_type: Optional[str] = None,
    project_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve door form configurations from the library."""
    query = db.query(models.DoorFormsLibrary)
    if filter_type:
        query = query.filter(models.DoorFormsLibrary.form_type.ilike(f"%{filter_type}%"))
    forms = query.order_by(models.DoorFormsLibrary.id).all()
    return {
        "door_forms": [
            {
                "id": f.id,
                "form_type": f.form_type,
                "door_set_id": f.door_set_id,
                "specifications": f.specifications,
                "json_config": f.json_config,
            }
            for f in forms
        ],
        "count": len(forms),
    }


@app.post("/api/libraries/door-sets", tags=["Hardware Library"])
async def create_door_form(form: DoorFormCreate, db: Session = Depends(get_db)):
    """Add a new door form to the library."""
    new_form = models.DoorFormsLibrary(
        form_type=form.form_type,
        door_set_id=form.door_set_id,
        specifications=form.specifications,
        json_config=form.json_config,
    )
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    return {"id": new_form.id, "form_type": new_form.form_type}


# ═══════════════════════════════════════════════════════════════════════════════
# REQUIREMENTS VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/requirements/validate", tags=["Requirements"])
async def validate_requirements(req: RequirementsValidate, db: Session = Depends(get_db)):
    """
    Rule-based requirements validator.
    Checks specifications against the requirements_templates table. No AI needed.
    """
    result = validate_requirements_against_template(db, req.project_type, req.specifications)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _recalculate_cost_summary(db: Session, quotation_id: int):
    """Recalculate and upsert cost_summary for a quotation after items change."""
    items = (
        db.query(models.QuotationItem)
        .filter(models.QuotationItem.quotation_id == quotation_id)
        .all()
    )
    total_material = sum((float(i.unit_price or 0) * (i.quantity or 0)) for i in items)
    total_qty = sum(i.quantity or 0 for i in items)
    labor = total_qty * 15.0       # $15 labor per unit
    overhead = total_material * 0.05
    avg_margin = (
        sum(float(i.margin or 0) for i in items) / len(items) if items else 0.0
    )
    total = total_material + labor + overhead

    cs = (
        db.query(models.CostSummary)
        .filter(models.CostSummary.quotation_id == quotation_id)
        .first()
    )
    if cs:
        cs.material_cost = total_material
        cs.labor = labor
        cs.markup = avg_margin
        cs.total_price = total
    else:
        db.add(models.CostSummary(
            quotation_id=quotation_id,
            material_cost=total_material,
            labor=labor,
            markup=avg_margin,
            total_price=total,
        ))
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
