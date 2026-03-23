import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const authClient = axios.create({ baseURL: '' });

export function useAuth() {
    const { data: user, isLoading, isError } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => {
            const { data } = await authClient.get('/auth/me');
            return data;
        },
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) return false;
            return failureCount < 2;
        },
        staleTime: 60_000,
    });

    return {
        user: user || null,
        isLoading,
        isAuthenticated: !!user && !isError,
        isAdmin: user?.role === 'admin',
    };
}
