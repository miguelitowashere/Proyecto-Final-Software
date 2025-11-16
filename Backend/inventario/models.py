from django.db import models

# Create your models here.

#Modelo para las categorias de los productos. Esto permite que la
# administradora pueda camiar estas categorias en el futuro si lo desea
class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    
    def __str__(self):
        return self.nombre
    
    class Meta:
        verbose_name_plural = "Categorías"

#Modelo para las colecciones de productos. Esto permite agrupar productos
class Coleccion(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    temporada = models.CharField(max_length=50, blank=True)  # Ej: "Invierno 2024"
    
    def __str__(self):
        return self.nombre
    
    class Meta:
        verbose_name_plural = "Colecciones"

#Modelo para los productos en el inventario
class Producto(models.Model):
    # Información básica
    nombre = models.CharField(max_length=200)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    coleccion = models.ForeignKey(Coleccion, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Detalles
    tallas = models.CharField(max_length=100, help_text="Ej: S,M,L,XL")
    descripcion = models.TextField(blank=True)
    imagen = models.ImageField(upload_to='productos/', null=True, blank=True)
    
    # Precios e inventario
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=5, help_text="Alerta cuando esté por debajo")
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    def __str__(self):
        return self.nombre
    
    @property
    def stock_bajo(self):
        """Retorna True si el stock está por debajo del mínimo"""
        return self.stock_actual <= self.stock_minimo
    
    @property
    def sin_stock(self):
        """Retorna True si no hay stock"""
        return self.stock_actual == 0
    
    class Meta:
        ordering = ['nombre']


#Informacion para las ventas realizadas
class Venta(models.Model):
    CANAL_CHOICES = [
        ('nequi', 'Nequi'),
        ('daviplata', 'Daviplata'),
        ('bancolombia', 'Bancolombia'),
        ('presencial', 'Presencial (Efectivo)'),
        ('tarjeta', 'Tarjeta'),
    ]
    
    # Información de la venta
    fecha = models.DateTimeField(auto_now_add=True)
    canal_venta = models.CharField(max_length=20, choices=CANAL_CHOICES)
    
    # Cliente opcional (solo para clientes frecuentes/mayoristas) Por el momento no los vamos a usar
    #cliente = models.ForeignKey('Cliente', on_delete=models.SET_NULL, null=True, blank=True)
    #Empleado que registró la venta.
    empleado = models.ForeignKey('Empleado', on_delete=models.PROTECT)
    
    # Totales
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Notas adicionales
    notas = models.TextField(blank=True)
    
    def __str__(self):
        return f"Venta #{self.id} - {self.fecha.strftime('%d/%m/%Y')}"
    
    class Meta:
        ordering = ['-fecha']


class DetalleVenta(models.Model):
    """Cada producto vendido en una venta (línea de la factura)"""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    def save(self, *args, **kwargs):
        # Calcula el subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_unitario
        
        # Descuenta del inventario
        if not self.pk:  # Solo al crear (no al editar)
            self.producto.stock_actual -= self.cantidad
            self.producto.save()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.producto.nombre} x{self.cantidad}"
    

from django.db import models
from django.utils import timezone

class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('entrada', 'Entrada (Compra/Reposición)'),
        ('salida', 'Salida (Venta o Retiro)'),
        ('ajuste', 'Ajuste de Inventario'),
        ('devolucion', 'Devolución'),
    ]
    
    producto = models.ForeignKey(
        'Producto',
        on_delete=models.PROTECT,
        related_name='movimientos'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cantidad = models.PositiveIntegerField()
    fecha = models.DateTimeField(default=timezone.now)
    empleado = models.ForeignKey(
        'Empleado',
        on_delete=models.PROTECT,
        null=True, blank=True
    )
    motivo = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # Solo actualizar el stock si el movimiento es nuevo
        if not self.pk:
            if self.tipo == 'entrada':
                self.producto.stock_actual += self.cantidad
            elif self.tipo == 'salida':
                self.producto.stock_actual -= self.cantidad
            elif self.tipo == 'devolucion':
                self.producto.stock_actual += self.cantidad
            elif self.tipo == 'ajuste':
                # En un ajuste, el admin puede ingresar positivo o negativo
                self.producto.stock_actual += self.cantidad

            # Asegurar que no quede negativo
            if self.producto.stock_actual < 0:
                self.producto.stock_actual = 0

            self.producto.save()
        
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.tipo} - {self.producto.nombre} ({self.cantidad})"



class Cliente(models.Model):
    TIPO_CHOICES = [
        ('minorista', 'Cliente Minorista'),
        ('mayorista', 'Cliente Mayorista'),
        ('internacional', 'Cliente Internacional'),
    ]
    
    nombre = models.CharField(max_length=200)
    tipo_cliente = models.CharField(max_length=20, choices=TIPO_CHOICES, default='minorista')
    
    # Contacto
    correo = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20)
    direccion = models.TextField(blank=True)
    
    # Redes sociales
    instagram = models.CharField(max_length=100, blank=True)
    
    # Info del negocio (para mayoristas)
    nombre_negocio = models.CharField(max_length=200, blank=True)
    nit_rut = models.CharField(max_length=50, blank=True)
    
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    def __str__(self):
        return self.nombre

from django.contrib.auth.models import User

class Empleado(models.Model):
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    telefono = models.CharField(max_length=20, blank=True)
    fecha_contratacion = models.DateField()
    activo = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"