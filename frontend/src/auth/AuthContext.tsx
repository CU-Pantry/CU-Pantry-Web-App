import { createContext, useMemo, useState, type ReactNode } from 'react';
import { createPermissions, usersSeed, type StaffPermissionKey, type StaffPermissions } from '../data/fakeData';
import { loadCollection, STORAGE_KEYS } from '../data/localStore';

export type AppUser = {
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'staff' | 'manager';
  permissions: StaffPermissions;
};

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  hasPermission: (permission: StaffPermissionKey) => boolean;
  login: (payload: { name: string; email: string }) => void;
  logout: () => void;
};

const STORAGE_KEY = 'pantry_auth_user';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

function getInitialUser(): AppUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AppUser;
    if (!parsed?.email || !parsed?.name) return null;
    if (!parsed.permissions) {
      return {
        ...parsed,
        permissions: createPermissions(parsed.role),
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(getInitialUser);

  const login = ({ name, email }: { name: string; email: string }) => {
    // try to find the user in local store to inherit their role
    const users = loadCollection(STORAGE_KEYS.users, usersSeed);
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    // Default to manager if email has manager or fehmi, otherwise staff for demo
    let role: AppUser['role'] = 'staff';
    if (existing) {
      role = existing.role;
    } else if (email.toLowerCase().includes('manager') || email.toLowerCase().includes('admin')) {
      role = 'manager';
    }

    const nextUser: AppUser = {
      name: name.trim() || 'User',
      email: email.trim(),
      role,
      permissions: existing?.permissions ?? createPermissions(role),
    };

    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      hasPermission: (permission: StaffPermissionKey) => {
        if (!user) return false;
        if (user.role === 'manager') return true;
        if (user.role !== 'staff') return false;
        return Boolean(user.permissions?.[permission]);
      },
      login,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
