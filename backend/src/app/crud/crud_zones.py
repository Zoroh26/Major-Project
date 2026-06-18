from fastcrud import FastCRUD

from ..models.zone import Zone
from ..schemas.zone import (
    ZoneCreateInternal,
    ZoneRead,
    ZoneUpdate,
    ZoneUpdateInternal,
    ZoneDelete,
)

CRUDZone = FastCRUD[
    Zone, ZoneCreateInternal, ZoneUpdate, ZoneUpdateInternal, ZoneDelete, ZoneRead
]
crud_zones = CRUDZone(Zone)
