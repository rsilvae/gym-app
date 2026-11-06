import { EmptyState } from '@/components/empty-state';

/** Pestaña "Historial": en la Fase 7 mostrará tus entrenamientos pasados. */
export default function HistoryScreen() {
  return (
    <EmptyState
      title="Historial"
      message="Todavía no tienes entrenamientos. Cuando termines uno, aparecerá aquí."
    />
  );
}
