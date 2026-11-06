import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { nearestIndex, niceTicks, scaleLinear } from '@/utils/chart';

export type ChartPoint = {
  /** Fecha en milisegundos (eje X). */
  x: number;
  /** Valor (eje Y). */
  y: number;
};

type Props = {
  data: ChartPoint[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Cómo mostrar los valores del eje Y (ej: 80 → "80"). */
  formatY: (value: number) => string;
  /** Cómo mostrar las fechas del eje X (ej: "6 nov"). */
  formatX: (value: number) => string;
  height?: number;
  accessibilityLabel: string;
};

// Espacio para los textos de los ejes
const PADDING = { top: 12, right: 12, bottom: 24, left: 40 };
/** Con muchos puntos, los círculos se amontonan: solo dibujamos la línea (y el punto elegido). */
const MAX_POINTS_WITH_MARKERS = 30;

/**
 * Gráfico de línea hecho a mano con react-native-svg (sin librerías de gráficos).
 * Toca o arrastra el dedo sobre el gráfico para elegir un punto.
 */
export function LineChart({ data, selectedIndex, onSelect, formatY, formatX, height = 220, accessibilityLabel }: Props) {
  const theme = useTheme();
  // El ancho lo sabemos recién cuando la vista se dibuja (onLayout)
  const [width, setWidth] = useState(0);

  const plotLeft = PADDING.left;
  const plotRight = width - PADDING.right;
  const plotTop = PADDING.top;
  const plotBottom = height - PADDING.bottom;

  const values = data.map((point) => point.y);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];

  // Eje X por fecha real: dos entrenamientos seguidos quedan cerca y uno tras un mes, lejos
  const xMin = data[0]?.x ?? 0;
  const xMax = data[data.length - 1]?.x ?? 0;

  const positions = data.map((point) => ({
    x: data.length === 1 ? (plotLeft + plotRight) / 2 : scaleLinear(point.x, xMin, xMax, plotLeft, plotRight),
    y: scaleLinear(point.y, yMin, yMax, plotBottom, plotTop),
  }));

  const linePath = positions.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const selected = positions[selectedIndex];
  const showMarkers = data.length <= MAX_POINTS_WITH_MARKERS;

  function handleTouch(event: GestureResponderEvent) {
    if (positions.length === 0) return;
    onSelect(nearestIndex(positions.map((p) => p.x), event.nativeEvent.locationX));
  }

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      // Sistema de "responder" de React Native: recibir el toque y el arrastre del dedo
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      // Si el usuario desliza hacia arriba/abajo, dejamos que la pantalla haga scroll
      onResponderTerminationRequest={() => true}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* Líneas guía horizontales y valores del eje Y (suaves, para no competir con la línea) */}
          {ticks.map((tick) => {
            const y = scaleLinear(tick, yMin, yMax, plotBottom, plotTop);
            return (
              <G key={tick}>
                <Line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke={theme.backgroundSelected} strokeWidth={1} />
                <SvgText x={plotLeft - 6} y={y + 4} fontSize={11} fill={theme.textSecondary} textAnchor="end">
                  {formatY(tick)}
                </SvgText>
              </G>
            );
          })}

          {/* Fechas: primera y última */}
          {data.length > 0 && (
            <SvgText x={positions[0].x} y={height - 6} fontSize={11} fill={theme.textSecondary} textAnchor="start">
              {formatX(data[0].x)}
            </SvgText>
          )}
          {data.length > 1 && (
            <SvgText
              x={positions[positions.length - 1].x}
              y={height - 6}
              fontSize={11}
              fill={theme.textSecondary}
              textAnchor="end">
              {formatX(data[data.length - 1].x)}
            </SvgText>
          )}

          {/* Línea vertical sobre el punto elegido */}
          {selected && (
            <Line
              x1={selected.x}
              x2={selected.x}
              y1={plotTop}
              y2={plotBottom}
              stroke={theme.textSecondary}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          <Path d={linePath} stroke={theme.chart} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Puntos: con un borde del color de fondo para que se separen de la línea */}
          {showMarkers &&
            positions.map((p, index) => (
              <Circle key={index} cx={p.x} cy={p.y} r={4} fill={theme.chart} stroke={theme.backgroundElement} strokeWidth={2} />
            ))}
          {selected && (
            <Circle cx={selected.x} cy={selected.y} r={6} fill={theme.chart} stroke={theme.backgroundElement} strokeWidth={2} />
          )}
        </Svg>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
