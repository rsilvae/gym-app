import { EmptyState } from '@/components/empty-state';

/** Pestaña "Perfil": en la Fase 6 tendrá tu cuenta y el botón de cerrar sesión. */
export default function ProfileScreen() {
  return (
    <EmptyState
      title="Perfil"
      message="Aquí verás tu cuenta cuando agreguemos el inicio de sesión."
    />
  );
}
