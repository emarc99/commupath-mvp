import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthUser {
    id: string;
    username: string;
    email: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (username: string, email: string) => void;
    logout: () => void;
    signup: (username: string, email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('commupath_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = (username: string, email: string) => {
        const newUser: AuthUser = {
            id: Date.now().toString(),
            username,
            email,
        };
        setUser(newUser);
        localStorage.setItem('commupath_user', JSON.stringify(newUser));
    };

    const signup = (username: string, email: string) => {
        // For now, signup is the same as login (no backend yet)
        login(username, email);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('commupath_user');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                login,
                logout,
                signup,
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
