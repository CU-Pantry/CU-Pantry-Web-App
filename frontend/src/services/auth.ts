const API_BASE_URL = 'http://localhost:8000';

export type LoginCredentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'volunteer' | 'manager' | 'admin';
  is_staff: boolean;
};

// Get CSRF token from Django
async function getCSRFToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.csrfToken;
}

export const authApi = {
  // Login with username and password
  login: async (credentials: LoginCredentials): Promise<AuthUser> => {
    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  // Logout
  logout: async (): Promise<void> => {
    const csrfToken = await getCSRFToken();

    await fetch(`${API_BASE_URL}/api/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    });
  },

  // Get current logged in user
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
      credentials: 'include',
    });

    if (!response.ok) return null;
    return response.json();
  },
};