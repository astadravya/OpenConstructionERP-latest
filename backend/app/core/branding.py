"""Organization branding for server-generated output (emails, PDFs, exports).

The web UI takes its brand from ``frontend/src/config/brand.ts``. Mail and
documents the server writes read the values below instead, set in
``backend/.env`` (or the process environment)::

    OE_BRAND_NAME="Acme Constructions ERP"
    OE_BRAND_LOGO_URL="https://erp.acme.example/brand/logo-128.png"
    OE_BRAND_WEBSITE="https://acme.example"
    OE_BRAND_SOURCE_CODE_URL="https://github.com/acme/erp"

Unset, everything keeps the upstream defaults, so tests and stock installs
behave exactly as before. ``source_code_url`` is what ``GET /api/source``
offers to users: AGPL-3.0 s.13 asks a modified, network-served version to
offer *its own* source, so point it at your fork.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.config import _find_env_file

UPSTREAM_NAME = "OpenConstructionERP"
UPSTREAM_LOGO_URL = "https://openconstructionerp.com/logo-128.png"
UPSTREAM_SOURCE_URL = "https://github.com/datadrivenconstruction/OpenConstructionERP"


class BrandSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OE_BRAND_",
        env_file=_find_env_file() or ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    name: str = UPSTREAM_NAME
    logo_url: str = ""
    website: str = ""
    source_code_url: str = UPSTREAM_SOURCE_URL

    @property
    def is_custom(self) -> bool:
        return self.name.strip() not in ("", UPSTREAM_NAME)

    @property
    def email_logo_url(self) -> str:
        """Logo for email headers: the configured one, the upstream one for a
        stock install, and none for a rebranded install without a logo."""
        if self.logo_url:
            return self.logo_url
        return "" if self.is_custom else UPSTREAM_LOGO_URL


BRAND = BrandSettings()


def brand_text(value: str) -> str:
    """Swap the upstream product name for the configured brand."""
    if not BRAND.is_custom or UPSTREAM_NAME not in value:
        return value
    return value.replace(UPSTREAM_NAME, BRAND.name)
