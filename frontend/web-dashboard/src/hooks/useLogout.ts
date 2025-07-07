import { logoutUser } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

/**
 * Hook personalizado para manejar el logout
 */
export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutUser();
      
      // Limpiar cualquier estado local si es necesario
      // localStorage.clear(); // opcional
      
      // Redirigir al login
      router.push('/login');
    } catch (error) {
      console.error('Error durante el logout:', error);
      // Aún así redirigir al login en caso de error
      router.push('/login');
    }
  };

  return { handleLogout };
}
