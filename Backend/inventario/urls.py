from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    CategoriaViewSet, ColeccionViewSet, ProductoViewSet,
    ClienteViewSet, EmpleadoViewSet,
    VentaViewSet, MovimientoInventarioViewSet
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'colecciones', ColeccionViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'empleados', EmpleadoViewSet)
router.register(r'ventas', VentaViewSet)
router.register(r'movimientos-inventario', MovimientoInventarioViewSet)

urlpatterns = router.urls

from .views import google_login

urlpatterns = [
    path("google-login/", google_login),    
]

urlpatterns += router.urls

