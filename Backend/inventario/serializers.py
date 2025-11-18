from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import (
    Categoria, Coleccion, Producto,
    Venta, DetalleVenta, MovimientoInventario,
    Cliente, Empleado
)
from django.contrib.auth.models import User


# ==========================================
# CATEGORÍAS, COLECCIONES, PRODUCTOS
# ==========================================
class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ColeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coleccion
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    coleccion_nombre = serializers.CharField(source='coleccion.nombre', read_only=True)
    
    stock_bajo = serializers.BooleanField(read_only=True)
    sin_stock = serializers.BooleanField(read_only=True)
    estado = serializers.CharField(read_only=True)
    
    # Campos adicionales para colores
    lista_colores = serializers.ListField(read_only=True)
    cantidad_colores = serializers.IntegerField(read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id', 'nombre', 'categoria', 'categoria_nombre', 'coleccion', 
            'coleccion_nombre', 'tallas', 'colores', 'lista_colores', 'cantidad_colores',
            'descripcion', 'imagen', 'precio_unitario', 'stock_actual', 'stock_minimo', 
            'fecha_creacion', 'fecha_actualizacion', 'activo',
            'stock_bajo', 'sin_stock', 'estado'
        )
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


# ==========================================
# CLIENTES Y EMPLEADOS
# ==========================================
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'is_staff', 'username')


class EmpleadoSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = ('id', 'user', 'telefono', 'fecha_contratacion', 'activo', 'nombre_completo')

    def get_nombre_completo(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


# ==========================================
# MOVIMIENTOS DE INVENTARIO
# ==========================================
class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.user.get_full_name', read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = '__all__'
        read_only_fields = ('fecha',)


# ==========================================
# DETALLES Y VENTAS
# ==========================================
class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetalleVenta
        fields = [
            'id', 'venta', 'producto', 'producto_nombre',
            'cantidad', 'precio_unitario', 'subtotal'
        ]


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.user.get_full_name', read_only=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'fecha', 'canal_venta',
            'empleado', 'empleado_nombre',
            'subtotal', 'descuento', 'total',
            'notas', 'detalles'
        ]


# ==========================================
# CREAR VENTA (incluye detalles)
# ==========================================
class CrearVentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'fecha',
            'canal_venta', 'empleado',
            'subtotal', 'descuento', 'total',
            'notas', 'detalles'
        ]
        read_only_fields = ('id', 'fecha')

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        with transaction.atomic():
            venta = Venta.objects.create(**validated_data)
            subtotal = Decimal('0')
            for detalle_data in detalles_data:
                cantidad = Decimal(detalle_data['cantidad'])
                precio_unitario = Decimal(str(detalle_data['precio_unitario']))
                subtotal += cantidad * precio_unitario
                DetalleVenta.objects.create(venta=venta, **detalle_data)

            venta.subtotal = subtotal
            venta.descuento = validated_data.get('descuento', Decimal('0')) or Decimal('0')
            venta.total = subtotal - venta.descuento
            venta.save()

        return venta
