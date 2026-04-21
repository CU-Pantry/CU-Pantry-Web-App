import hmac
import hashlib
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from orders.models import Order
from notifications.utils import (
    send_order_ready_email,
    send_order_ready_sms,
)
from orders.utils import assign_qr_and_pin


class BellHowellWebhookView(APIView):
    """
    Receives order status updates from Bell & Howell IQ Cloud.
    Bell & Howell pushes events to this endpoint using bearer token auth.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Verify bearer token
        auth_header = request.headers.get('Authorization', '')
        expected_token = f"Bearer {settings.BELL_HOWELL_WEBHOOK_TOKEN}"

        if auth_header != expected_token:
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Parse webhook payload
        payload = request.data
        event_type = payload.get('event_type')
        order_reference = payload.get('order_reference')
        delivery_code = payload.get('delivery_code')
        locker_number = payload.get('locker_number')

        if not order_reference:
            return Response(
                {'error': 'order_reference is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find our order
        try:
            order = Order.objects.get(id=order_reference)
        except Order.DoesNotExist:
            return Response(
                {'error': f'Order {order_reference} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Handle different event types
        if event_type == 'order_loaded':
            # Order has been loaded into locker by staff
            # Bell & Howell changes status to "ready for customer pickup"
            order.status = 'ready'

            # Store delivery code (PIN) from Bell & Howell
            if delivery_code:
                order.pin_code = delivery_code

            order.save()

            # Generate QR code and send notifications
            assign_qr_and_pin(order)
            try:
                send_order_ready_email(order)
                send_order_ready_sms(order)
            except Exception as e:
                print(f"Notification error: {e}")

            return Response({
                'message': f'Order #{order.id} marked as ready',
                'status': order.status
            })

        elif event_type == 'order_picked_up':
            # Customer has picked up their order
            order.status = 'picked_up'
            order.save()

            return Response({
                'message': f'Order #{order.id} marked as picked up',
                'status': order.status
            })

        elif event_type == 'order_expired':
            # Order was not picked up in time
            order.status = 'expired'
            order.save()

            return Response({
                'message': f'Order #{order.id} marked as expired',
                'status': order.status
            })

        else:
            return Response(
                {'error': f'Unknown event type: {event_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )