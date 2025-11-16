import django_filters
from .models import Producto

class ProductoFilter(django_filters.FilterSet):
    """
    Filtros personalizados para el modelo Producto.
    """
    # 1. Filtro por nombre (búsqueda parcial):
    # 'icontains' permite buscar una subcadena sin distinguir mayúsculas/minúsculas.
    nombre = django_filters.CharFilter(
        field_name='nombre', 
        lookup_expr='icontains' 
    )

    # 2. Filtro por Categoría y Colección (filtrado por ID de la ForeignKey):
    # El Frontend enviará el ID de la categoría o colección seleccionada.
    categoria = django_filters.NumberFilter(
        field_name='categoria_id'
    )
    
    coleccion = django_filters.NumberFilter(
        field_name='coleccion_id'
    )
    
    class Meta:
        model = Producto
        # Define los campos que se pueden usar para filtrar en la URL
        fields = ['nombre', 'categoria', 'coleccion']