from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import F
from datetime import date
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


# ==================== AUTENTICACIÓN PERSONALIZADA ====================
class CustomTokenObtainPairSerializer(serializers.Serializer):
    """Serializer personalizado que verifica si el empleado está activo"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError("Credenciales inválidas")
        
        # Verificar si el usuario tiene un Empleado asociado y si está activo
        try:
            empleado = user.empleado
            if not empleado.activo:
                raise serializers.ValidationError("Tu cuenta ha sido desactivada")
        except Empleado.DoesNotExist:
            # Si no tiene empleado, solo el superusuario puede entrar
            if not user.is_superuser:
                raise serializers.ValidationError("No tienes permisos para acceder")
        
        refresh = RefreshToken.for_user(user)
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class CustomTokenObtainPairView(TokenObtainPairView):
    """Vista personalizada que usa el serializer de validación"""
    serializer_class = CustomTokenObtainPairSerializer


# ==================== VIEWSETS ====================
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
            return queryset.filter(stock_actual__lte=F('stock_minimo'))
        
        return queryset


class ClienteViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de clientes (mayoristas/internacionales)."""
    queryset = Cliente.objects.filter(activo=True).order_by('nombre')
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]


class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar empleados.
    Permite crear, listar, actualizar y eliminar empleados.
    """
    # ✅ CAMBIO: Mostrar todos los empleados (activos e inactivos)
    queryset = Empleado.objects.all().order_by('user__first_name')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Override para crear un User primero, luego el Empleado.
        """
        user_data = request.data.get('user', {})
        empleado_data = request.data.copy()
        
        if not user_data.get('username') or not user_data.get('password'):
            return Response(
                {"error": "Se requiere username y password"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if User.objects.filter(username=user_data['username']).exists():
                return Response(
                    {"error": "El username ya existe"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = User.objects.create_user(
                username=user_data['username'],
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                password=user_data['password'],
                is_staff=False
            )
            
            empleado = Empleado.objects.create(
                user=user,
                telefono=empleado_data.get('telefono', ''),
                fecha_contratacion=date.today()
            )
            
            serializer = self.get_serializer(empleado)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        """
        Override para permitir actualizar nombre, apellido, teléfono, rol (is_staff) y estado (activo).
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Actualizar datos del User
        if 'user' in request.data:
            user_data = request.data['user']
            if 'first_name' in user_data:
                instance.user.first_name = user_data['first_name']
            if 'last_name' in user_data:
                instance.user.last_name = user_data['last_name']
            instance.user.save()
        
        # Actualizar teléfono
        if 'telefono' in request.data:
            instance.telefono = request.data['telefono']
        
        # Actualizar rol (is_staff)
        if 'is_staff' in request.data:
            instance.user.is_staff = request.data['is_staff']
            instance.user.save()
        
        # Actualizar estado (activo)
        if 'activo' in request.data:
            instance.activo = request.data['activo']
        
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Override para eliminar también el User asociado cuando se elimina un Empleado.
        """
        instance = self.get_object()
        user = instance.user
        
        instance.delete()
        user.delete()
        
        return Response(
            {"detail": "Empleado y usuario eliminados correctamente"},
            status=status.HTTP_204_NO_CONTENT
        )


class VentaViewSet(viewsets.ModelViewSet):
    """
    Permite el CRUD de ventas.
    """
    queryset = Venta.objects.all().order_by('-fecha')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action in ['update', 'partial_update']:
            return CrearVentaSerializer
        return VentaSerializer


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """
    Permite registrar entradas de stock, ajustes y devoluciones.
    """
    queryset = MovimientoInventario.objects.all().order_by('-fecha')
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAuthenticated]