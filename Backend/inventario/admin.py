from django.contrib import admin
from .models import Producto, Categoria, Empleado, MovimientoInventario, Cliente, Venta, Coleccion

# Register your models here.
admin.site.register(Producto)
admin.site.register(Categoria)
admin.site.register(Coleccion)

admin.site.register(Empleado)
admin.site.register(Cliente)

admin.site.register(MovimientoInventario)

admin.site.register(Venta)