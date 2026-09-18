from sqlalchemy import (
    Column, Integer, String, TIMESTAMP, ForeignKey,
    Numeric, Boolean, Date, Text, JSON
)
from sqlalchemy.orm import relationship
from database import Base
import datetime


# ─── Core Tables ────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    type = Column(String(50))
    status = Column(String(50), default="draft")
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    enquiries = relationship("Enquiry", back_populates="project")


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    stage = Column(String(50))
    entry_point = Column(String(50))
    status = Column(String(50), default="new")

    project = relationship("Project", back_populates="enquiries")
    quotations = relationship("Quotation", back_populates="enquiry")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    contact_info = Column(Text)
    project_history = Column(Text)


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    projects = Column(Text)
    bidding_status = Column(String(50))


# ─── Supplier & Product Catalog ─────────────────────────────────────────────

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    contact = Column(String(255))

    products = relationship("Product", back_populates="supplier")
    price_lists = relationship("SupplierPriceList", back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    sku = Column(String(100), unique=True)
    category = Column(String(100))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    base_price = Column(Numeric(10, 2), default=0.00)

    supplier = relationship("Supplier", back_populates="products")
    price_lists = relationship("SupplierPriceList", back_populates="product")
    quotation_items = relationship("QuotationItem", back_populates="product")


class SupplierPriceList(Base):
    __tablename__ = "supplier_price_list"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price = Column(Numeric(10, 2))
    effective_date = Column(Date)

    supplier = relationship("Supplier", back_populates="price_lists")
    product = relationship("Product", back_populates="price_lists")


class HardwareSet(Base):
    __tablename__ = "hardware_sets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    door_type = Column(String(100))
    specifications = Column(Text)
    category = Column(String(100))


class DoorFormsLibrary(Base):
    __tablename__ = "door_forms_library"

    id = Column(Integer, primary_key=True, index=True)
    form_type = Column(String(100))
    door_set_id = Column(Integer)
    specifications = Column(Text)
    json_config = Column(JSON)


# ─── Quotation & Costing ─────────────────────────────────────────────────────

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id"))
    draft_status = Column(String(50), default="draft")
    generated_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    user_approved = Column(Boolean, default=False)

    enquiry = relationship("Enquiry", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation")
    cost_summary = relationship("CostSummary", back_populates="quotation", uselist=False)


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    unit_price = Column(Numeric(10, 2))
    margin = Column(Numeric(5, 2))

    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product", back_populates="quotation_items")


class CostSummary(Base):
    __tablename__ = "cost_summaries"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    material_cost = Column(Numeric(12, 2))
    labor = Column(Numeric(12, 2))
    markup = Column(Numeric(12, 2))
    total_price = Column(Numeric(12, 2))

    quotation = relationship("Quotation", back_populates="cost_summary")


# ─── Configuration Tables ─────────────────────────────────────────────────────

class ProjectType(Base):
    __tablename__ = "project_types"

    id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(100))
    default_hardware_grouping = Column(Text)


class HardwareGrouping(Base):
    __tablename__ = "hardware_groupings"

    id = Column(Integer, primary_key=True, index=True)
    grouping_name = Column(String(100))
    sets_included = Column(Text)
    default_selections = Column(Text)


class RequirementsTemplate(Base):
    __tablename__ = "requirements_templates"

    id = Column(Integer, primary_key=True, index=True)
    project_type = Column(String(100))
    required_fields = Column(Text)
    validation_rules = Column(JSON)
