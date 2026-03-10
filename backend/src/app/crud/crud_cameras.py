from fastcrud import FastCRUD

from ..models.camera import Camera
from ..schemas.camera import (
    CameraCreateInternal,
    CameraRead,
    CameraUpdate,
    CameraUpdateInternal,
    CameraDelete,
)

CRUDCamera = FastCRUD[
    Camera, CameraCreateInternal, CameraUpdate, CameraUpdateInternal, CameraDelete, CameraRead
]
crud_cameras = CRUDCamera(Camera)
