import React, { useState, useRef, useCallback } from "react";
import { Pencil, ArrowUpRight } from "lucide-react";
import { Canvas } from "./components/Canvas";

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"draw" | "arrow">("draw");
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (!file) continue;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        setImage(img);
        break;
      }
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!canvasContainerRef.current) return;

    // Get the Konva stage from the Canvas component
    const stage = canvasContainerRef.current.querySelector("canvas");
    if (!stage) return;

    // Create a temporary canvas to combine the image and annotations
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // Set the canvas size to match the stage
    tempCanvas.width = stage.width;
    tempCanvas.height = stage.height;

    // Draw the stage content onto the temporary canvas
    ctx.drawImage(stage, 0, 0);

    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]);
    });
  }, []);

  React.useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Image Annotator</h1>

          {!image ? (
            <div className="flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-lg p-12 text-center h-72">
              <p className="text-gray-500">Paste an image (Ctrl+V / Cmd+V) to start annotating</p>
            </div>
          ) : (
            <div ref={canvasContainerRef} className="border border-gray-200 rounded-lg overflow-auto relative">
              <Canvas image={image} mode={mode} onSave={handleSave} />
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>Press Cmd+C / Ctrl+C to copy the annotated image</p>
            <p>Press Cmd+Z / Ctrl+Z to undo</p>
            <p>Press Cmd+Shift+Z / Ctrl+Shift+Z to redo</p>
          </div>
        </div>
      </div>

      {/* Fixed toolbar at the bottom center */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 bg-white rounded-full shadow-lg p-2 z-50">
        <button
          className={`p-3 rounded-full transition-colors ${
            mode === "draw" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => setMode("draw")}
          title="Draw (D)"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          className={`p-3 rounded-full transition-colors ${
            mode === "arrow" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => setMode("arrow")}
          title="Arrow (A)"
        >
          <ArrowUpRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default App;
