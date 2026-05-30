/**
 * Reusable Metro Network SVG component.
 * Used by both MetroMapScreen and JourneyVisualizationScreen.
 *
 * Features:
 *   - All 65 stations rendered as SVG nodes
 *   - Purple & Green line paths
 *   - Interchange marker at Majestic
 *   - Optional route highlighting (for journey visualization)
 *   - Station tap callback
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';
import {
  PURPLE_LINE_NODES,
  GREEN_LINE_NODES,
  VIEWBOX,
  LINE_COLORS,
  type StationNode,
} from '../data/networkLayout';

interface MetroNetworkSVGProps {
  /** Station IDs to highlight as active route */
  highlightedRoute?: string[];
  /** Currently active station ID (train position) */
  activeStationId?: string;
  /** Callback when a station is tapped */
  onStationPress?: (station: StationNode) => void;
  /** Width of the container */
  width: number;
  /** Height of the container */
  height: number;
}

const STATION_RADIUS = 6;
const INTERCHANGE_RADIUS = 10;
const LINE_WIDTH = 4;
const DIM_OPACITY = 0.15;

export const MetroNetworkSVG: React.FC<MetroNetworkSVGProps> = ({
  highlightedRoute,
  activeStationId,
  onStationPress,
  width,
  height,
}) => {
  const isHighlighted = (id: string) =>
    !highlightedRoute || highlightedRoute.includes(id);

  const isEdgeHighlighted = (id1: string, id2: string) =>
    !highlightedRoute ||
    (highlightedRoute.includes(id1) && highlightedRoute.includes(id2));

  const renderLine = (
    nodes: StationNode[],
    color: string,
    lineKey: string,
  ) => {
    const segments: React.ReactElement[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const bright = isEdgeHighlighted(a.id, b.id);
      segments.push(
        <Line
          key={`${lineKey}-seg-${i}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={color}
          strokeWidth={LINE_WIDTH}
          opacity={bright ? 1 : DIM_OPACITY}
        />,
      );
    }
    return segments;
  };

  const renderStation = (node: StationNode, color: string) => {
    const bright = isHighlighted(node.id);
    const isActive = node.id === activeStationId;
    const isInterchange = node.line === 'both';
    const opacity = bright ? 1 : DIM_OPACITY;

    // Label positioning
    const labelOffset = 12;
    let tx = node.x;
    let ty = node.y;
    let anchor: 'start' | 'end' | 'middle' = 'start';

    switch (node.labelAlign) {
      case 'left':
        tx = node.x - labelOffset;
        anchor = 'end';
        break;
      case 'right':
        tx = node.x + labelOffset;
        anchor = 'start';
        break;
      case 'top':
        ty = node.y - labelOffset;
        anchor = 'middle';
        break;
      case 'bottom':
        ty = node.y + labelOffset + 4;
        anchor = 'middle';
        break;
    }

    return (
      <G key={node.id} opacity={opacity} onPress={() => onStationPress?.(node)}>
        {/* Station dot */}
        {isInterchange ? (
          <>
            <Circle
              cx={node.x}
              cy={node.y}
              r={INTERCHANGE_RADIUS}
              fill="white"
              stroke="#333"
              strokeWidth={2.5}
            />
            <Circle cx={node.x} cy={node.y} r={4} fill="#333" />
          </>
        ) : (
          <Circle
            cx={node.x}
            cy={node.y}
            r={STATION_RADIUS}
            fill="white"
            stroke={color}
            strokeWidth={2}
          />
        )}

        {/* Active train marker */}
        {isActive && (
          <Circle
            cx={node.x}
            cy={node.y}
            r={STATION_RADIUS + 4}
            fill="none"
            stroke="#F44336"
            strokeWidth={2}
          />
        )}

        {/* Label */}
        <SvgText
          x={tx}
          y={ty}
          fontSize={7}
          fill={bright ? '#333' : '#999'}
          fontWeight={isInterchange ? '700' : '400'}
          textAnchor={anchor}
          alignmentBaseline="central"
        >
          {node.name}
        </SvgText>
      </G>
    );
  };

  // Deduplicate Majestic (rendered once as interchange)
  const greenWithoutMajestic = GREEN_LINE_NODES.filter(
    (n) => n.id !== 'nadaprabhu_kempegowda_majestic',
  );

  return (
    <View style={styles.container}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Line paths */}
        {renderLine(PURPLE_LINE_NODES, LINE_COLORS.purple, 'purple')}
        {renderLine(GREEN_LINE_NODES, LINE_COLORS.green, 'green')}

        {/* Station dots — purple (non-interchange) */}
        {PURPLE_LINE_NODES.filter((n) => n.line !== 'both').map((n) =>
          renderStation(n, LINE_COLORS.purple),
        )}

        {/* Station dots — green (non-interchange) */}
        {greenWithoutMajestic.map((n) =>
          renderStation(n, LINE_COLORS.green),
        )}

        {/* Interchange — rendered last (on top) */}
        {PURPLE_LINE_NODES.filter((n) => n.line === 'both').map((n) =>
          renderStation(n, '#333'),
        )}

        {/* Legend */}
        <G>
          <Rect x={20} y={20} width={140} height={60} rx={6} fill="white" opacity={0.9} stroke="#ddd" />
          <Line x1={30} y1={38} x2={60} y2={38} stroke={LINE_COLORS.purple} strokeWidth={3} />
          <SvgText x={66} y={40} fontSize={8} fill="#333">Purple Line</SvgText>
          <Line x1={30} y1={56} x2={60} y2={56} stroke={LINE_COLORS.green} strokeWidth={3} />
          <SvgText x={66} y={58} fontSize={8} fill="#333">Green Line</SvgText>
          <Circle cx={45} cy={72} r={5} fill="white" stroke="#333" strokeWidth={2} />
          <SvgText x={56} y={74} fontSize={7} fill="#333">Interchange</SvgText>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
