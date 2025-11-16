from rest_framework import serializers
from .models import (
    Categoria, Coleccion, Producto, 
    Venta, DetalleVenta, MovimientoInventario, 
    Cliente, Empleado
)
# Para manejar el User de Django en el Serializer de Empleado
from django.contrib.auth.models import User

# --- SERIALIZERS DE CATÁLOGOS ---
# Usamos ModelSerializer para mapeo directo y rápido

class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer para Categoria (CRUD básico)"""
    class Meta:
        model = Categoria
        fields = '__all__' # Incluye todos los campos del modelo


class ColeccionSerializer(serializers.ModelSerializer):
    """Serializer para Coleccion (CRUD básico)"""
    class Meta:
        model = Coleccion
        fields = '__all__'


# --- SERIALIZER DE PRODUCTO ---

class ProductoSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para mostrar los nombres de las FK en lugar de IDs
    # El Frontend recibirá el ID para POST/PUT, pero para GET, recibirá el nombre también.
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    coleccion_nombre = serializers.CharField(source='coleccion.nombre', read_only=True)
    
    # Campos @property del modelo que queremos exponer en la API
    stock_bajo = serializers.BooleanField(read_only=True)
    sin_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id', 'nombre', 'categoria', 'categoria_nombre', 'coleccion', 
            'coleccion_nombre', 'tallas', 'descripcion', 'imagen', 
            'precio_unitario', 'stock_actual', 'stock_minimo', 
            'fecha_creacion', 'fecha_actualizacion', 'activo',
            'stock_bajo', 'sin_stock' # Incluimos las propiedades de alerta
        )
        read_only_fields = ('stock_actual', 'fecha_creacion', 'fecha_actualizacion')
        # NOTA: stock_actual se maneja mediante movimientos/ventas, no por edición directa en la API.

# --- SERIALIZERS DE PERSONAS ---

class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para Cliente (CRUD básico)"""
    class Meta:
        model = Cliente
        fields = '__all__'

# Serializer anidado para el User de Django
class UserSerializer(serializers.ModelSerializer):
    """Muestra solo los campos importantes del User de Django"""
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email')
        
class EmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para Empleado, incluyendo los detalles del User"""
    user = UserSerializer(read_only=True) # Serializer anidado
    
    # Campo para construir el nombre completo
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Empleado
        fields = ('id', 'user', 'telefono', 'fecha_contratacion', 'activo', 'nombre_completo')
        
    def get_nombre_completo(self, obj):
        """Método para obtener el nombre completo del empleado"""
        return f"{obj.user.first_name} {obj.user.last_name}"
    

class MovimientoInventarioSerializer(serializers.ModelSerializer):
    """Serializer para registrar movimientos de inventario (Entradas/Ajustes)"""
    
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.user.get_full_name', read_only=True)
    
    class Meta:
        model = MovimientoInventario
        fields = '__all__'
        read_only_fields = ('fecha',)


#Este es el serializer de los productos dentro de una venta
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
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.user.get_full_name', read_only=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'fecha', 'canal_venta', 'cliente', 'cliente_nombre',
            'empleado', 'empleado_nombre',
            'subtotal', 'descuento', 'total',
            'notas', 'detalles'
        ]


#Serializer especial para crear una venta
class CrearVentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)

    class Meta:
        model = Venta
        fields = [
            'canal_venta', 'cliente', 'empleado',
            'subtotal', 'descuento', 'total',
            'notas', 'detalles'
        ]

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        venta = Venta.objects.create(**validated_data)
        for detalle_data in detalles_data:
            DetalleVenta.objects.create(venta=venta, **detalle_data)
        return venta

