import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import InventoryPage from './pages/staff/inventory/InventoryPage';
import CreateInventoryItemPage from './pages/staff/inventory/CreateInventoryItemPage';
import EditInventoryItemPage from './pages/staff/inventory/EditInventoryItemPage';
import LockersPage from './pages/staff/lockers/LockersPage';
import OrdersPage from './pages/staff/orders/OrdersPage';
import CreateOrderPage from './pages/staff/orders/CreateOrderPage';
import EditOrderPage from './pages/staff/orders/EditOrderPage';
import UsersPage from './pages/staff/users/UsersPage';
import CreateUserPage from './pages/staff/users/CreateUserPage';
import EditUserPage from './pages/staff/users/EditUserPage';
import StaffSettingsPage from './pages/manager/StaffSettingsPage';
import AddStaffPage from './pages/manager/AddStaffPage';
import EditStaffPage from './pages/manager/EditStaffPage';
import PantryOrderPage from './pages/student/PantryOrderPage';
import StudentOrderHistoryPage from './pages/student/StudentOrderHistoryPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<ProtectedRoute requiredPermission="inventory"><InventoryPage /></ProtectedRoute>} />
              <Route path="inventory/new" element={<ProtectedRoute requiredPermission="inventory"><CreateInventoryItemPage /></ProtectedRoute>} />
              <Route path="inventory/:id/edit" element={<ProtectedRoute requiredPermission="inventory"><EditInventoryItemPage /></ProtectedRoute>} />
              <Route path="lockers" element={<ProtectedRoute requiredPermission="lockers"><LockersPage /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute requiredPermission="orders"><OrdersPage /></ProtectedRoute>} />
              <Route path="orders/new" element={<ProtectedRoute requiredPermission="orders"><CreateOrderPage /></ProtectedRoute>} />
              <Route path="orders/:id/edit" element={<ProtectedRoute requiredPermission="orders"><EditOrderPage /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute requiredPermission="users"><UsersPage /></ProtectedRoute>} />
              <Route path="users/new" element={<ProtectedRoute requiredPermission="users"><CreateUserPage /></ProtectedRoute>} />
              <Route path="users/:id/edit" element={<ProtectedRoute requiredPermission="users"><EditUserPage /></ProtectedRoute>} />
              <Route path="settings/staff" element={<ProtectedRoute managerOnly><StaffSettingsPage /></ProtectedRoute>} />
              <Route path="settings/staff/new" element={<ProtectedRoute managerOnly><AddStaffPage /></ProtectedRoute>} />
              <Route path="settings/staff/:id/edit" element={<ProtectedRoute managerOnly><EditStaffPage /></ProtectedRoute>} />
              <Route path="pantry" element={<ProtectedRoute><PantryOrderPage /></ProtectedRoute>} />
              <Route path="my-orders" element={<ProtectedRoute><StudentOrderHistoryPage /></ProtectedRoute>} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
