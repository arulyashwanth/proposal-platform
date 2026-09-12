"""
chains.py — LangChain AI chains for Mekatron.
All LLM calls are wrapped in graceful degradation so the server
never crashes when Anthropic/OpenAI credits are unavailable.
"""
import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


# ─── Structured Output Model ──────────────────────────────────────────────────

class QuotationOutput(BaseModel):
    product_selection: List[Dict[str, Any]] = Field(
        description="List of selected products and quantities"
    )
    pricing: Dict[str, float] = Field(
        description="Pricing breakdown (material, labor, total)"
    )
    quotation_draft: str = Field(
        description="A professional text summary of the quotation"
    )


# ─── AI Status Helper ─────────────────────────────────────────────────────────

AI_UNAVAILABLE_RESPONSE = {
    "ai_status": "unavailable",
    "message": (
        "AI quotation generation is temporarily unavailable — "
        "Anthropic API credits have been exhausted. "
        "Please add credits at https://console.anthropic.com and retry. "
        "You can still manually create a quotation via POST /api/quotations/{id}/items."
    ),
    "product_selection": [],
    "pricing": {"material": 0.0, "labor": 0.0, "total": 0.0},
    "quotation_draft": "",
}


def is_anthropic_available() -> bool:
    """Check if we have an Anthropic key configured (not whether it has credits)."""
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def is_openai_available() -> bool:
    """Check if we have an OpenAI key configured."""
    return bool(os.getenv("OPENAI_API_KEY"))


# ─── Quotation Generation Chain ───────────────────────────────────────────────

def get_quotation_chain():
    """
    Returns a LangChain chain: PromptTemplate | Claude | JsonOutputParser.
    Raises ImportError-safe failure if langchain_anthropic is broken.
    """
    from langchain_anthropic import ChatAnthropic
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import JsonOutputParser

    llm = ChatAnthropic(
        model_name="claude-sonnet-4-6",
        temperature=0.3,
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    )

    parser = JsonOutputParser(pydantic_object=QuotationOutput)

    template = """
    You are an AI Proposal Preparation Assistant for Mekatron.
    Generate a detailed quotation draft based on the following requirements.

    Project Type: {project_type}
    Hardware Requirements: {hardware_requirements}
    Customer Specs: {customer_specs}
    Available Products: {available_products}

    {format_instructions}
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=["project_type", "hardware_requirements", "customer_specs", "available_products"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    return prompt | llm | parser


def generate_quotation_draft(
    project_type: str,
    hardware_requirements: dict,
    customer_specs: dict,
    available_products: list = None,
) -> dict:
    """
    Invoke Claude to generate a quotation draft.
    Returns AI_UNAVAILABLE_RESPONSE gracefully if credits are exhausted or key is missing.
    """
    if not is_anthropic_available():
        return {**AI_UNAVAILABLE_RESPONSE, "reason": "ANTHROPIC_API_KEY not configured"}

    try:
        chain = get_quotation_chain()
        result = chain.invoke({
            "project_type": project_type,
            "hardware_requirements": str(hardware_requirements),
            "customer_specs": str(customer_specs),
            "available_products": str(available_products or []),
        })
        return {**result, "ai_status": "success"}

    except Exception as e:
        error_str = str(e).lower()

        # Credit exhaustion (Anthropic)
        if "credit" in error_str or "quota" in error_str or "billing" in error_str or "402" in error_str:
            return {**AI_UNAVAILABLE_RESPONSE, "reason": "credit_exhausted", "raw_error": str(e)}

        # Auth error
        if "authentication" in error_str or "401" in error_str or "403" in error_str:
            return {**AI_UNAVAILABLE_RESPONSE, "reason": "authentication_failed", "raw_error": str(e)}

        # Model not found — bad model name or not available on this account tier
        if "not_found" in error_str or "404" in error_str or "model" in error_str:
            return {
                **AI_UNAVAILABLE_RESPONSE,
                "reason": "model_not_found",
                "raw_error": str(e),
                "message": (
                    "The configured Anthropic model is not available on this account. "
                    "Check chains.py model_name against your account's available models."
                ),
            }

        # Unknown — re-raise so it surfaces properly in logs
        raise



# ─── Embedding Helper (OpenAI, with fallback flag) ────────────────────────────

def get_openai_embeddings():
    """
    Returns an OpenAIEmbeddings instance, or None if credits/key are unavailable.
    Callers should check for None before using.
    """
    if not is_openai_available():
        return None
    try:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=os.getenv("OPENAI_API_KEY"),
        )
    except Exception:
        return None
