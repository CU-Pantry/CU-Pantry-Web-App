from django.shortcuts import render

# Create your views here.
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions


class CSRFTokenView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        login(request, user)

        # Get user role from groups
        role = 'student'
        if user.is_superuser:
            role = 'admin'
        elif user.groups.filter(name='Admin').exists():
            role = 'admin'
        elif user.groups.filter(name='Manager').exists():
            role = 'manager'
        elif user.groups.filter(name='Volunteer').exists():
            role = 'volunteer'

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'is_staff': user.is_staff,
        })


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        role = 'student'
        if user.is_superuser:
            role = 'admin'
        elif user.groups.filter(name='Admin').exists():
            role = 'admin'
        elif user.groups.filter(name='Manager').exists():
            role = 'manager'
        elif user.groups.filter(name='Volunteer').exists():
            role = 'volunteer'

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'is_staff': user.is_staff,
        })


from django.contrib.auth.models import User, Group


class UserListView(APIView):
    permission_classes = []

    def get(self, request):
        users = User.objects.all().order_by('username')
        data = []
        for user in users:
            groups = user.groups.values_list('name', flat=True)
            role = 'student'
            if user.is_superuser:
                role = 'admin'
            elif 'Admin' in groups:
                role = 'admin'
            elif 'Manager' in groups:
                role = 'manager'
            elif 'Volunteer' in groups:
                role = 'volunteer'

            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': role,
                'is_active': user.is_active,
            })
        return Response(data)