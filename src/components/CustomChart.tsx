import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

interface CustomChartProps {
  data?: number[];
}

export default function CustomChart({ data = [12, 19, 15, 25, 32, 28, 35] }: CustomChartProps) {
  // Chart dimensions
  const containerWidth = Dimensions.get('window').width - 64; // Account for card padding and screen padding
  const height = 160;
  const paddingX = 10;
  const paddingY = 20;

  const chartWidth = containerWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Max value in data to scale Y
  const maxVal = Math.max(...data, 40); // Baseline max of 40
  const minVal = 0;
  const range = maxVal - minVal;

  // Calculate coordinates
  const points = data.map((val, index) => {
    const x = paddingX + (index / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y };
  });

  // Create SVG path for the line
  let linePath = '';
  points.forEach((pt, idx) => {
    if (idx === 0) {
      linePath += `M ${pt.x} ${pt.y}`;
    } else {
      linePath += ` L ${pt.x} ${pt.y}`;
    }
  });

  // Create SVG path for the gradient fill area
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Draw 4 horizontal gridlines
  const gridLines = [];
  for (let i = 0; i <= 3; i++) {
    const y = paddingY + (i / 3) * chartHeight;
    gridLines.push(y);
  }

  return (
    <View style={styles.container}>
      <Svg width={containerWidth} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal Gridlines */}
        {gridLines.map((y, idx) => (
          <Line
            key={idx}
            x1={paddingX}
            y1={y}
            x2={containerWidth - paddingX}
            y2={y}
            stroke="#E5E8EC"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        {/* Gradient Fill under the curve */}
        {points.length > 0 && (
          <Path d={fillPath} fill="url(#gradient)" />
        )}

        {/* Main Line */}
        {points.length > 0 && (
          <Path d={linePath} fill="none" stroke="#6366F1" strokeWidth="3" />
        )}

        {/* Data points */}
        {points.map((pt, idx) => (
          <Circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r="5"
            fill="#16A34A" // Green data points matching design
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
});
