from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import enum

class ReportCategory(str, enum.Enum):
    NOISE = "NOISE"
    TRASH = "TRASH"
    FACILITY = "FACILITY"
    TRAFFIC = "TRAFFIC"
    OTHER = "OTHER"

class ReportStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"