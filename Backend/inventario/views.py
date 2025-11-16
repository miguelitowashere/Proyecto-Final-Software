from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .filters import ProductoFilter
from .models import (
    Categoria, Coleccion, Producto, 
    Venta, DetalleVenta, MovimientoInventario, 
    Cliente, Empleado
)
from .serializers import (
    CategoriaSerializer, ColeccionSerializer, ProductoSerializer, 
    VentaSerializer, CrearVentaSerializer, DetalleVentaSerializer, 
    MovimientoInventarioSerializer, ClienteSerializer, EmpleadoSerializer
)

class CategoriaViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de las categorías de productos."""
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]


class ColeccionViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de las colecciones."""
    queryset = Coleccion.objects.all()
    serializer_class = ColeccionSerializer
    permission_classes = [IsAuthenticated]


class ProductoViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de los productos y filtros para stock bajo."""
    queryset = Producto.objects.filter(activo=True).order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]

    filterset_class = ProductoFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        
        if self.request.query_params.get('stock_bajo') in ['true', 'True']:
            from django.db.models import F
            return queryset.filter(stock_actual__lte=F('stock_minimo'))
        
        return queryset


class ClienteViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de clientes (mayoristas/internacionales)."""
    queryset = Cliente.objects.filter(activo=True).order_by('nombre')
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]  # ✅ Debe tener IsAuthenticated


class EmpleadoViewSet(viewsets.ModelViewSet):
    """Permite ver y gestionar los empleados."""
    queryset = Empleado.objects.filter(activo=True).order_by('user__first_name')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]  # ✅ Debe tener IsAuthenticated


class VentaViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de ventas."""
    queryset = Venta.objects.all().order_by('-fecha')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action in ['update', 'partial_update']:
            return CrearVentaSerializer
        return VentaSerializer


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """Permite registrar entradas de stock, ajustes y devoluciones."""
    queryset = MovimientoInventario.objects.all().order_by('-fecha')
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAuthenticated]