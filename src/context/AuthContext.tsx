import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface AuthUser {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    impact_level: string;
    points: number;
    completed_quests: number;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, fullName?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:8000';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token and user from localStorage on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken) {
                setToken(storedToken);
                await fetchCurrentUser(storedToken);
            } else {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const fetchCurrentUser = async (authToken: string) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            setUser(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            // Token might be invalid or expired
            localStorage.removeItem('auth_token');
            setToken(null);
            setUser(null);
            setLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string, fullName?: string) => {
        try {
            await axios.post(`${API_BASE_URL}/api/auth/register`, {
                username,
                email,
                password,
                full_name: fullName || null
            });

            // Auto-login after registration
            await login(username, password);
        } catch (error: any) {
            const message = error.response?.data?.detail || 'Registration failed';
            throw new Error(message);
        }
    };

    const login = async (username: string, password: string) => {
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { access_token } = response.data;

            setToken(access_token);
            localStorage.setItem('auth_token', access_token);

            await fetchCurrentUser(access_token);
        } catch (error: any) {
            const message = error.response?.data?.detail || 'Login failed';
            throw new Error(message);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    const refreshUser = async () => {
        if (token) {
            await fetchCurrentUser(token);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token && !!user,
                loading,
                login,
                register,
                logout,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Axios instance with authentication
export const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// Add token to all requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration and 401 errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('auth_token');
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
