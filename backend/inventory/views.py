from rest_framework import generics, permissions
from .models import InventoryItem
from .serializers import InventoryItemSerializer
from authentication.permissions import IsManager
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .barcode import lookup_barcode


class InventoryListCreateView(generics.ListCreateAPIView):
    serializer_class = InventoryItemSerializer

    def get_permissions(self):
        return []

    def get_queryset(self):
        queryset = InventoryItem.objects.all().order_by('name')

        # Filter by availability
        is_available = self.request.query_params.get('available')
        if is_available:
            queryset = queryset.filter(is_available=True)

        # Filter by temperature category
        temp_category = self.request.query_params.get('temperature')
        if temp_category:
            queryset = queryset.filter(temperature_category=temp_category)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventoryItemSerializer
    queryset = InventoryItem.objects.all()

    def get_permissions(self):
        return []

class BarcodeLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, barcode):
        # Look up product by barcode
        result = lookup_barcode(barcode)

        if not result['found']:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

        # Check if item already exists in inventory
        existing_item = InventoryItem.objects.filter(barcode=barcode).first()
        if existing_item:
            result['existing_item'] = InventoryItemSerializer(existing_item).data
            result['message'] = 'Item already exists in inventory'
        else:
            result['message'] = 'New item found - ready to add to inventory'

        return Response(result, status=status.HTTP_200_OK)


class BarcodeUpdateInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        barcode = request.data.get('barcode')
        quantity_to_add = request.data.get('quantity', 1)

        if not barcode:
            return Response(
                {'error': 'Barcode is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if item exists in inventory
        existing_item = InventoryItem.objects.filter(barcode=barcode).first()

        if existing_item:
            # Update quantity
            existing_item.quantity += int(quantity_to_add)
            existing_item.save()
            return Response({
                'message': f'Updated {existing_item.name} quantity to {existing_item.quantity}',
                'item': InventoryItemSerializer(existing_item).data
            })
        else:
            # Look up barcode and create new item
            result = lookup_barcode(barcode)
            if not result['found']:
                return Response(
                    {'error': 'Product not found. Please add manually.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Create new inventory item
            new_item = InventoryItem.objects.create(
                name=result['name'],
                barcode=barcode,
                quantity=int(quantity_to_add),
                is_available=True
            )
            return Response({
                'message': f'Added {new_item.name} to inventory',
                'item': InventoryItemSerializer(new_item).data
            }, status=status.HTTP_201_CREATED)


def get_permissions(self):
    return []