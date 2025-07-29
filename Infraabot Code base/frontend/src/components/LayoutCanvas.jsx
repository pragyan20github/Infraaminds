import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Text, Group, Rect, Transformer } from "react-konva";

export default function LayoutCanvas({
  layout,
  onUpdateRoom,
  selectedRoom,
  onSelectRoom,
  onDeleteRoom,
  plotDimensions = { width: 1000, height: 800 }, // Default plot area
}) {
  const width = 600, height = 450;
  const shapeRefs = useRef([]);
  const trRef = useRef();

  // Local state for hover
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Attach transformer to the selected room
  useEffect(() => {
    if (trRef.current && selectedRoom !== null && shapeRefs.current[selectedRoom]) {
      trRef.current.nodes([shapeRefs.current[selectedRoom]]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedRoom, layout]);

  // Filter out rooms with less than 3 points (invalid polygons)
  const validRooms = layout.filter(room => room.points.length >= 3);

  // --- Center and scale layout inside the plot area ---
  // 1. Find bounding box of all rooms
  const allPoints = validRooms.flatMap(room => room.points);
  const xs = allPoints.map(([x, y]) => x);
  const ys = allPoints.map(([x, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // 2. Compute layout bounding box size
  const layoutWidth = maxX - minX;
  const layoutHeight = maxY - minY;

  // 3. Plot size
  const plotWidth = plotDimensions.width;
  const plotHeight = plotDimensions.height;

  // 4. Compute scale to fit layout in plot (proportionally)
  const layoutToPlotScale = Math.min(
    plotWidth / (layoutWidth || 1),
    plotHeight / (layoutHeight || 1)
  );

  // 5. Compute offset to center layout in plot
  const layoutOffsetX = (plotWidth - layoutWidth * layoutToPlotScale) / 2 - minX * layoutToPlotScale;
  const layoutOffsetY = (plotHeight - layoutHeight * layoutToPlotScale) / 2 - minY * layoutToPlotScale;

  // --- Now scale/center the plot area itself into the canvas ---
  const margin = 40;
  const scale = Math.min(
    (width - margin * 2) / plotWidth,
    (height - margin * 2) / plotHeight
  );
  const offsetX = margin + (width - plotWidth * scale) / 2;
  const offsetY = margin + (height - plotHeight * scale) / 2;

  // Helper to get centroid for label placement (in canvas space)
  const getCentroid = (points) => {
    const n = points.length;
    const sum = points.reduce(
      (acc, [x, y]) => [acc[0] + x, acc[1] + y],
      [0, 0]
    );
    return [sum[0] / n, sum[1] / n];
  };

  // Handle drag end: update room coordinates and constrain to plot area
  const handleDragEnd = (idx, e) => {
    const node = e.target;
    // Undo both scales to get real plot-space delta
    const dx = node.x() / (scale * layoutToPlotScale);
    const dy = node.y() / (scale * layoutToPlotScale);

    const currentPoints = layout[idx].points;
    let minXr = Infinity, minYr = Infinity, maxXr = -Infinity, maxYr = -Infinity;
    currentPoints.forEach(([x, y]) => {
      minXr = Math.min(minXr, x);
      minYr = Math.min(minYr, y);
      maxXr = Math.max(maxXr, x);
      maxYr = Math.max(maxYr, y);
    });

    // Proposed new bounding box
    let allowedDx = dx, allowedDy = dy;
    if ((minXr + dx) * layoutToPlotScale < 0) allowedDx = -minXr;
    if ((maxXr + dx) * layoutToPlotScale > plotWidth) allowedDx = (plotWidth / layoutToPlotScale) - maxXr;
    if ((minYr + dy) * layoutToPlotScale < 0) allowedDy = -minYr;
    if ((maxYr + dy) * layoutToPlotScale > plotHeight) allowedDy = (plotHeight / layoutToPlotScale) - maxYr;

    const newPoints = currentPoints.map(([x, y]) => [
      x + allowedDx,
      y + allowedDy,
    ]);
    node.position({ x: 0, y: 0 });
    if (onUpdateRoom) {
      onUpdateRoom(idx, { ...layout[idx], points: newPoints });
    }
  };

  // Handle resize for rectangles (4-point polygons)
  const handleTransformEnd = (idx) => {
    const shape = shapeRefs.current[idx];
    if (!shape) return;

    // Get the scale applied by the transformer (in canvas space)
    const scaleX = shape.scaleX();
    const scaleY = shape.scaleY();

    // Get the original points (before scaling)
    const points = layout[idx].points;
    const [x0, y0] = points[0];
    const [x1, y1] = points[1];
    const [x2, y2] = points[2];
    const [x3, y3] = points[3];

    // Compute width and height from the original points
    const width0 = Math.abs(x1 - x0);
    const height0 = Math.abs(y3 - y0);

    // Apply scale to width and height
    let newWidth = width0 * scaleX;
    let newHeight = height0 * scaleY;

    // Constrain resizing to plot area
    let maxWidth = plotWidth / layoutToPlotScale - x0;
    let maxHeight = plotHeight / layoutToPlotScale - y0;
    newWidth = Math.max(10 / layoutToPlotScale, Math.min(newWidth, maxWidth));
    newHeight = Math.max(10 / layoutToPlotScale, Math.min(newHeight, maxHeight));

    // Calculate new points for the rectangle
    const newPoints = [
      [x0, y0],
      [x0 + newWidth, y0],
      [x0 + newWidth, y0 + newHeight],
      [x0, y0 + newHeight],
    ];

    // Reset the scale to 1
    shape.scaleX(1);
    shape.scaleY(1);

    onUpdateRoom(idx, { ...layout[idx], points: newPoints });
  };

  if (validRooms.length === 0) {
    return (
      <div className="text-gray-400 text-lg">
        No valid rooms to display.
      </div>
    );
  }

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Plot area border */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={plotWidth * scale}
          height={plotHeight * scale}
          stroke="#000"
          strokeWidth={2}
          fill="transparent"
        />

        {validRooms.map((room, idx) => {
          // First, scale and center layout in plot space, then map plot to canvas
          const scaledPoints = room.points.flatMap(([x, y]) => [
            (x * layoutToPlotScale + layoutOffsetX) * scale + offsetX,
            (y * layoutToPlotScale + layoutOffsetY) * scale + offsetY,
          ]);
          // Centroid for label
          const [cx, cy] = getCentroid(
            room.points.map(([x, y]) => [
              (x * layoutToPlotScale + layoutOffsetX) * scale + offsetX,
              (y * layoutToPlotScale + layoutOffsetY) * scale + offsetY,
            ])
          );
          const isSelected = selectedRoom === idx;
          const isHovered = hoveredIdx === idx;

          // Find top-right corner for delete icon
          const xs = scaledPoints.filter((_, i) => i % 2 === 0);
          const ys = scaledPoints.filter((_, i) => i % 2 === 1);
          const topRightX = Math.max(...xs);
          const topRightY = Math.min(...ys);

          return (
            <Group
              key={room.name + idx}
              draggable
              onDragEnd={e => handleDragEnd(idx, e)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectRoom(idx)}
              onTap={() => onSelectRoom(idx)}
            >
              <Line
                ref={node => (shapeRefs.current[idx] = node)}
                points={scaledPoints}
                closed
                fill="#e0e7ff"
                stroke={
                  isSelected ? "#f59e42" : isHovered ? "#2563eb" : "#1e293b"
                }
                strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                shadowBlur={isSelected ? 8 : 0}
              />
              <Text
                text={room.name}
                x={cx}
                y={cy}
                fontSize={16}
                fill="#1e293b"
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                offsetX={room.name.length * 8}
                offsetY={8}
              />

              {/* Delete button/icon */}
              {isSelected && onDeleteRoom && (
                <>
                  <Rect
                    x={topRightX - 10}
                    y={topRightY - 10}
                    width={20}
                    height={20}
                    fill="#f87171"
                    cornerRadius={4}
                    onClick={() => onDeleteRoom(idx)}
                    onTap={() => onDeleteRoom(idx)}
                    style={{ cursor: "pointer" }}
                  />
                  <Text
                    text="🗑"
                    x={topRightX - 6}
                    y={topRightY - 10}
                    fontSize={16}
                    onClick={() => onDeleteRoom(idx)}
                    onTap={() => onDeleteRoom(idx)}
                    style={{ cursor: "pointer" }}
                  />
                </>
              )}
              {/* Transformer for resizing rectangles */}
              {isSelected && room.points.length === 4 && (
                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => newBox}
                  onTransformEnd={() => handleTransformEnd(idx)}
                  rotateEnabled={false}
                  enabledAnchors={[
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                  ]}
                />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
