from fastapi import APIRouter

from .health import router as health_router
from .login import router as login_router
from .logout import router as logout_router
from .users import router as users_router
from .alerts import router as alerts_router
from .cameras import router as cameras_router
from .zones import router as zones_router
from .escalations import router as escalations_router


router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(login_router)
router.include_router(logout_router)
router.include_router(users_router)
router.include_router(alerts_router, prefix="/alerts")
router.include_router(cameras_router)
router.include_router(zones_router)
router.include_router(escalations_router)
