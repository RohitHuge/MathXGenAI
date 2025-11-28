import { createContext, useContext, useState, useEffect } from 'react';
import { account, api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);
            api.setUser(currentUser);
        } catch (error) {
            setUser(null);
            api.setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            const currentUser = await account.get();
            setUser(currentUser);
            api.setUser(currentUser);

            // Sync to backend
            await syncUserToBackend(currentUser);
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            api.setUser(null);
        }
    };

    const syncUserToBackend = async (user) => {
        try {
            await api.request('/api/auth/sync', {
                method: 'POST',
                body: JSON.stringify({
                    appwriteUserId: user.$id,
                    email: user.email,
                    name: user.name,
                }),
            });
        } catch (error) {
            console.error('Failed to sync user to backend:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
