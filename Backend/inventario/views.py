from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import F, Sum
from django.db.models.functions import TruncMonth
from datetime import date, timedelta
from django.utils import timezone
from .filters import ProductoFilter
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import jwt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

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
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer personalizado que incluye is_staff en el token"""
    
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
        
        # Llamar al validate original de TokenObtainPairSerializer
        data = super().validate(attrs)
        
        return data
    
    @classmethod
    def get_token(cls, user):
        """Personalizar el token para incluir is_staff"""
        token = super().get_token(user)
        
        # Agregar campos personalizados al token
        token['is_staff'] = user.is_staff
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    """Vista personalizada que usa el serializer de validación"""
    serializer_class = CustomTokenObtainPairSerializer


# ==================== PERMISOS PERSONALIZADOS ====================
class IsAdmin(IsAuthenticated):
    """Permiso solo para administradores"""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        try:
            empleado = request.user.empleado
            return empleado.user.is_staff
        except Empleado.DoesNotExist:
            return request.user.is_superuser


class IsEmpleado(IsAuthenticated):
    """Permiso solo para empleados (tanto admin como usuario)"""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        try:
            empleado = request.user.empleado
            return empleado.activo
        except Empleado.DoesNotExist:
            return request.user.is_superuser


# ==================== VIEWSETS ====================
class CategoriaViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de las categorías de productos."""
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdmin]  # Solo admin


class ColeccionViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de las colecciones."""
    queryset = Coleccion.objects.all()
    serializer_class = ColeccionSerializer
    permission_classes = [IsAdmin]  # Solo admin


class ProductoViewSet(viewsets.ModelViewSet):
    """Permite el CRUD de los productos y filtros para stock bajo."""
    queryset = Producto.objects.filter(activo=True).order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAdmin]  # Solo admin
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
    permission_classes = [IsAuthenticated]  # Cualquier usuario autenticado
    
    def get_permissions(self):
        """
        Permitir crear (POST), leer (GET) y eliminar (DELETE) a todos los empleados.
        Solo admin puede editar (PUT, PATCH).
        """
        if self.request.method in ['PUT', 'PATCH']:
            # Solo admin puede editar
            permission_classes = [IsAdmin]
        else:
            # Todos los empleados pueden crear, leer y eliminar
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]


class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar empleados.
    Solo admin puede ver, crear, editar y eliminar empleados.
    """
    queryset = Empleado.objects.all().order_by('user__first_name')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAdmin]  # Solo admin

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
                is_staff=empleado_data.get('is_staff', False)
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
    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsEmpleado])
    def me(self, request):
        """
        Devuelve el empleado asociado al usuario autenticado.
        """
        try:
            empleado = Empleado.objects.get(user=request.user)
        except Empleado.DoesNotExist:
            return Response(
                {'detail': 'No hay empleado asociado a este usuario'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(empleado)
        return Response(serializer.data)


class VentaViewSet(viewsets.ModelViewSet):
    """
    Permite el CRUD de ventas.
    Solo admin puede editar y eliminar, todos los empleados pueden crear.
    """
    queryset = Venta.objects.all().order_by('-fecha')
    permission_classes = [IsEmpleado]  # Todos los empleados
    
    def get_permissions(self):
        """
        Permitir crear (POST) a todos los empleados,
        pero solo admin puede editar (PUT, PATCH) y eliminar (DELETE)
        """
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsEmpleado]
        
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action in ['update', 'partial_update']:
            return CrearVentaSerializer
        return VentaSerializer

    @action(detail=False, methods=['get'], url_path='reportes/resumen', permission_classes=[IsAdmin])
    def reportes_resumen(self, request):
        """
        Reporte de ventas para admins con top productos y serie temporal.
        Periodos: 1m, 3m, 6m, 12m (dias aproximados).
        """
        period = request.query_params.get('periodo', '1m')
        delta_map = {'1m': 30, '3m': 90, '6m': 180, '12m': 365}
        days = delta_map.get(period, 30)
        ahora = timezone.now()
        inicio = ahora - timedelta(days=days)

        ventas_qs = self.get_queryset().filter(fecha__gte=inicio)
        totales = ventas_qs.aggregate(total_ingresos=Sum('total'), total_descuentos=Sum('descuento'))

        top_productos = (
            DetalleVenta.objects.filter(venta__fecha__gte=inicio)
            .values('producto__id', 'producto__nombre')
            .annotate(cantidad_vendida=Sum('cantidad'), ingresos=Sum('subtotal'))
            .order_by('-cantidad_vendida')[:5]
        )

        serie_temporal = (
            ventas_qs.annotate(mes=TruncMonth('fecha'))
            .values('mes')
            .annotate(total=Sum('total'))
            .order_by('mes')
        )

        return Response({
            "periodo": period,
            "rango_desde": inicio.date(),
            "rango_hasta": ahora.date(),
            "totales": {
                "ingresos": totales.get('total_ingresos') or 0,
                "descuentos": totales.get('total_descuentos') or 0,
            },
            "top_productos": list(top_productos),
            "serie_temporal": [
                {"mes": item["mes"].strftime("%Y-%m"), "total": item["total"]} for item in serie_temporal
            ],
        })

class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """
    Permite registrar entradas de stock, ajustes y devoluciones.
    Solo admin puede hacer esto.
    """
    queryset = MovimientoInventario.objects.all().order_by('-fecha')
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAdmin]  # Solo admin


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    credential = request.data.get("credential")

    if not credential:
        return Response({"error": "No se recibió token de Google"}, status=400)

    ADMIN_WHITELIST = {"alejandrofareloduarte@gmail.com"}
    verified = False
    email = None
    name = ""

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            "857285179730-h99ak9m8ve72m1ssj2g0u690kk89a03c.apps.googleusercontent.com"
        )
        email = idinfo.get("email")
        name = idinfo.get("name", "")
        verified = True
    except Exception as verify_err:
        # Intentamos decodificar sin verificar para extraer el correo
        try:
            payload = jwt.decode(credential, options={"verify_signature": False})
            email = payload.get("email")
            name = payload.get("name", "")
            print("Google token verify failed, used fallback decode")
        except Exception as decode_err:
            print("Google token parse error:", decode_err)
            return Response({"error": "Token inválido"}, status=400)

    if not email:
        return Response({"error": "Token sin correo"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        if email in ADMIN_WHITELIST:
            first_name, *last_parts = name.split(" ")
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=" ".join(last_parts),
                password=User.objects.make_random_password(),
            )
            user.is_staff = True
            user.save()
        else:
            return Response(
                {"error": "Solo administradores registrados pueden iniciar sesión."},
                status=403,
            )

    if email in ADMIN_WHITELIST and not user.is_staff:
        user.is_staff = True
        user.save()

    # Si no se verificó el token y no está en whitelist, bloqueamos
    if not verified and email not in ADMIN_WHITELIST:
        return Response({"error": "Token inválido"}, status=400)

    if not user.is_staff:
        return Response({"error": "No tienes permisos para acceder."}, status=403)

    from .models import Empleado
    empleado, created = Empleado.objects.get_or_create(
        user=user,
        defaults={
            "telefono": "000",
            "activo": True,
            "fecha_contratacion": timezone.now().date(),
        },
    )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "is_admin": user.is_staff,
            "name": user.first_name,
        }
    )
