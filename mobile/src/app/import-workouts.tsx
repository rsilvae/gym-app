import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useImportWorkouts } from '@/hooks/use-workouts';
import type { ImportResult } from '@/types';

/** El mismo límite que la API (5 MB de texto). */
const MAX_FILE_BYTES = 5_000_000;

/** Zona horaria del celular: las fechas del CSV vienen sin ella ("4 nov 2026, 13:56"). */
function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count.toLocaleString('es')} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Importar el historial de otra app (CSV con el formato de Hevy):
 *   1. Elegir el archivo  →  2. Vista previa (no guarda nada)  →  3. Importar.
 */
export default function ImportWorkoutsScreen() {
  const importWorkouts = useImportWorkouts();
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeZone = deviceTimeZone();

  async function pickFile() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled) return;

      const asset = picked.assets[0];
      if (!asset.name.toLowerCase().endsWith('.csv')) {
        setError('Elige un archivo .csv.');
        return;
      }
      if (asset.size && asset.size > MAX_FILE_BYTES) {
        setError('El archivo es demasiado grande (máximo 5 MB).');
        return;
      }

      const text = new File(asset.uri).textSync();
      setPreview(null);
      setCsv(text);
      setPreview(await importWorkouts.mutateAsync({ csv: text, timeZone, dryRun: true }));
    } catch (err) {
      setCsv(null);
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  async function confirmImport() {
    if (!csv) return;
    setError(null);
    try {
      setResult(await importWorkouts.mutateAsync({ csv, timeZone, dryRun: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar.');
    }
  }

  if (result) {
    return (
      <ThemedView style={[styles.container, styles.done]}>
        <ThemedText type="title" style={styles.center}>
          ✅
        </ThemedText>
        <ThemedText type="subtitle" style={styles.center}>
          ¡Historial importado!
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Se agregaron {plural(result.workouts, 'entrenamiento', 'entrenamientos')} con{' '}
          {plural(result.sets, 'serie', 'series')}. Ya aparecen en tu historial y en los gráficos de progreso.
        </ThemedText>
        <Button
          title="Ver historial"
          onPress={() => {
            router.back();
            router.navigate('/history');
          }}
        />
      </ThemedView>
    );
  }

  const isLoading = importWorkouts.isPending;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        {!preview && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Trae tu historial de otra app</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              En la app que usabas (por ejemplo Hevy), exporta tus entrenamientos como archivo CSV y guárdalo en
              Archivos. Después elígelo aquí: primero verás un resumen y nada se guarda hasta que confirmes.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              • Las series de calentamiento no se importan.{'\n'}• Si importas el mismo archivo dos veces, no se
              duplica nada.{'\n'}• Las horas se leen en tu zona horaria ({timeZone}).
            </ThemedText>
          </ThemedView>
        )}

        {preview && <PreviewCard preview={preview} />}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {preview && preview.workouts > 0 && (
          <Button
            title={
              isLoading ? 'Importando...' : `Importar ${plural(preview.workouts, 'entrenamiento', 'entrenamientos')}`
            }
            disabled={isLoading}
            onPress={() => void confirmImport()}
          />
        )}
        <Button
          title={isLoading && !preview ? 'Leyendo el archivo...' : preview ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
          variant={preview ? 'secondary' : 'primary'}
          disabled={isLoading}
          onPress={() => void pickFile()}
        />
      </ScrollView>
    </ThemedView>
  );
}

function PreviewCard({ preview }: { preview: ImportResult }) {
  if (preview.workouts === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">No hay entrenamientos nuevos para importar</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {preview.skippedDuplicates > 0
            ? `Los ${plural(preview.skippedDuplicates, 'entrenamiento', 'entrenamientos')} de este archivo ya están en tu historial.`
            : 'El archivo no tiene series para importar.'}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        Se van a importar
      </ThemedText>
      <ThemedText type="subtitle">{plural(preview.workouts, 'entrenamiento', 'entrenamientos')}</ThemedText>
      <ThemedText>
        {plural(preview.sets, 'serie', 'series')} · del {formatDate(preview.firstDate)} al{' '}
        {formatDate(preview.lastDate)}
      </ThemedText>

      <View style={styles.details}>
        <Detail text={`${plural(preview.matchedExercises, 'ejercicio', 'ejercicios')} del catálogo`} />
        {preview.skippedWarmups > 0 && (
          <Detail text={`${plural(preview.skippedWarmups, 'serie', 'series')} de calentamiento se omiten`} />
        )}
        {preview.skippedWithoutReps > 0 && (
          <Detail text={`${plural(preview.skippedWithoutReps, 'serie', 'series')} sin repeticiones se omiten`} />
        )}
        {preview.skippedDuplicates > 0 && (
          <Detail
            text={`${plural(preview.skippedDuplicates, 'entrenamiento ya estaba', 'entrenamientos ya estaban')} en tu historial`}
          />
        )}
      </View>

      {preview.newExercises.length > 0 && (
        <View style={styles.details}>
          <ThemedText type="smallBold">Se crearán como ejercicios tuyos:</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {preview.newExercises.join(', ')}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

function Detail({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      • {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  done: {
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
  },
  details: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
});
