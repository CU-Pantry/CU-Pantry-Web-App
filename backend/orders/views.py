from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Order
from .serializers import OrderSerializer
from .utils import assign_qr_and_pin
from authentication.permissions import IsStudent, IsVolunteer, IsManager
from notifications.utils import (
    send_order_ready_email,
    send_order_ready_sms,
    send_order_compromised_email_student,
    send_compromised_sms,
)


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = []

    def get_queryset(self):
        user = self.request.user

        # Students only see their own orders
        if user.groups.filter(name='Student').exists():
            return Order.objects.filter(student=user).order_by('-created_at')

        # Volunteers, Managers and Admins see all orders
        if user.groups.filter(name__in=['Volunteer', 'Manager', 'Admin']).exists() or user.is_superuser:
            return Order.objects.all().order_by('-created_at')

        return Order.objects.none()

    def create(self, request, *args, **kwargs):
        # Only students can place orders
        if not request.user.groups.filter(name='Student').exists() and not request.user.is_superuser:
            return Response(
                {'error': 'Only students can place orders.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer
    permission_classes = []

    def get_queryset(self):
        user = self.request.user

        # Students can only see their own orders
        if user.groups.filter(name='Student').exists():
            return Order.objects.filter(student=user)

        # Volunteers, Managers and Admins can see all orders
        if user.groups.filter(name__in=['Volunteer', 'Manager', 'Admin']).exists() or user.is_superuser:
            return Order.objects.all()

        return Order.objects.none()

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get('status')

        # Only volunteers and above can update order status
        if not request.user.groups.filter(
            name__in=['Volunteer', 'Manager', 'Admin']
        ).exists() and not request.user.is_superuser:
            return Response(
                {'error': 'You do not have permission to update order status.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate status transition
        valid_transitions = {
            'submitted': ['approved'],
            'approved': ['locker_assigned'],
            'locker_assigned': ['ready'],
            'ready': ['picked_up', 'expired', 'compromised'],
        }

        current_status = order.status
        allowed = valid_transitions.get(current_status, [])

        if new_status not in allowed:
            return Response(
                {'error': f'Cannot transition from {current_status} to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        order.save()

        # Trigger notifications based on new status
        if new_status == 'ready':
            assign_qr_and_pin(order)
            try:
                send_order_ready_email(order)
                send_order_ready_sms(order)
            except Exception as e:
                print(f"Notification error: {e}")

        elif new_status == 'compromised':
            try:
                send_order_compromised_email_student(order)
                send_compromised_sms(order)
            except Exception as e:
                print(f"Notification error: {e}")

        return Response(OrderSerializer(order).data)
