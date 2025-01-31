import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Arrow, Image as KonvaImage, Rect } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";

interface CanvasProps {
  image: HTMLImageElement | null;
  mode: "draw" | "arrow";
  onSave: () => void;
}

interface Line {
  tool: "draw" | "arrow";
  points: number[];
}

export const Canvas: React.FC<CanvasProps> = ({ image, mode, onSave }) => {
  const stageRef = useRef<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [undoStack, setUndoStack] = useState<Line[][]>([]);
  const [redoStack, setRedoStack] = useState<Line[][]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDrawing = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        if (stageRef.current) {
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150);

          const dataUrl = stageRef.current.toDataURL();
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, lines, undoStack, redoStack]);

  const handleUndo = () => {
    if (lines.length === 0) return;

    const newUndoStack = [...undoStack];
    const lastLines = newUndoStack.pop();
    if (!lastLines) return;

    setRedoStack([...redoStack, lines]);
    setLines(lastLines);
    setUndoStack(newUndoStack);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const newRedoStack = [...redoStack];
    const nextLines = newRedoStack.pop();
    if (!nextLines) return;

    setUndoStack([...undoStack, lines]);
    setLines(nextLines);
    setRedoStack(newRedoStack);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || !stage) return;

    // Convert position to take into account the scale and position
    const stageBox = stage.container().getBoundingClientRect();
    const x = (pos.x - position.x) / scale;
    const y = (pos.y - position.y) / scale;

    startPoint.current = { x, y };
    setUndoStack([...undoStack, lines]);
    setRedoStack([]);
    setLines([...lines, { tool: mode, points: [x, y, x, y] }]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || !stage) return;

    // Convert position to take into account the scale and position
    const x = (pos.x - position.x) / scale;
    const y = (pos.y - position.y) / scale;

    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const newLines = lines.slice();
      if (mode === "arrow") {
        newLines[lines.length - 1].points = [lastLine.points[0], lastLine.points[1], x, y];
      } else {
        newLines[lines.length - 1].points = lastLine.points.concat([x, y]);
      }
      setLines(newLines);
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    startPoint.current = null;
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    // Handle zoom speed
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom range
    const limitedScale = Math.min(Math.max(newScale, 0.1), 10);

    setScale(limitedScale);

    // Calculate new position
    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };

    setPosition(newPos);
  };

  if (!image) return null;

  return (
    <Stage
      width={image.width}
      height={image.height}
      ref={stageRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
    >
      <Layer>
        <KonvaImage image={image} />
      </Layer>
      <Layer>
        {lines.map((line, i) => {
          if (line.tool === "arrow") {
            const points = line.points;
            return (
              <Arrow
                key={i}
                points={points}
                stroke="#df4b26"
                fill="#df4b26"
                strokeWidth={2 / scale} // Adjust stroke width based on scale
                pointerLength={20 / scale}
                pointerWidth={20 / scale}
              />
            );
          }
          return (
            <Line
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={2 / scale} // Adjust stroke width based on scale
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          );
        })}
      </Layer>
      {showFlash && (
        <Layer>
          <Rect x={0} y={0} width={image.width} height={image.height} fill="white" opacity={0.3} />
        </Layer>
      )}
    </Stage>
  );
};
