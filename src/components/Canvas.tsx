import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Arrow, Image as KonvaImage, Rect } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';

interface CanvasProps {
  image: HTMLImageElement | null;
  mode: 'draw' | 'arrow';
  onSave: () => void;
}

interface Line {
  tool: 'draw' | 'arrow';
  points: number[];
}

export const Canvas: React.FC<CanvasProps> = ({ image, mode, onSave }) => {
  const stageRef = useRef<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [undoStack, setUndoStack] = useState<Line[][]>([]);
  const [redoStack, setRedoStack] = useState<Line[][]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const isDrawing = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault(); // Prevent default copy behavior
        if (stageRef.current) {
          // Show flash effect
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150);

          // Get the stage as a data URL
          const dataUrl = stageRef.current.toDataURL();
          
          // Convert the data URL to a blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Create a clipboard item and write it
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      startPoint.current = { x: pos.x, y: pos.y };
      setUndoStack([...undoStack, lines]);
      setRedoStack([]);
      setLines([...lines, { tool: mode, points: [pos.x, pos.y, pos.x, pos.y] }]);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const newLines = lines.slice();
      if (mode === 'arrow') {
        // For arrows, only update the end point
        newLines[lines.length - 1].points = [
          lastLine.points[0],
          lastLine.points[1],
          point.x,
          point.y,
        ];
      } else {
        // For free drawing, add all points
        newLines[lines.length - 1].points = lastLine.points.concat([point.x, point.y]);
      }
      setLines(newLines);
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    startPoint.current = null;
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
    >
      <Layer>
        <KonvaImage image={image} />
      </Layer>
      <Layer>
        {lines.map((line, i) => {
          if (line.tool === 'arrow') {
            const points = line.points;
            return (
              <Arrow
                key={i}
                points={points}
                stroke="#df4b26"
                fill="#df4b26"
                strokeWidth={2}
                pointerLength={20}
                pointerWidth={20}
              />
            );
          }
          return (
            <Line
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={2}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          );
        })}
      </Layer>
      {showFlash && (
        <Layer>
          <Rect
            x={0}
            y={0}
            width={image.width}
            height={image.height}
            fill="white"
            opacity={0.3}
          />
        </Layer>
      )}
    </Stage>
  );
};