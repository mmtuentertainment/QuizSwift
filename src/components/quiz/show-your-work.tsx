"use client";

import { useRef, useState, useCallback } from "react";
import {
  Tldraw,
  Editor,
  TLShapeId,
  TLEditorSnapshot,
  getSvgAsImage,
} from "tldraw";
import "tldraw/tldraw.css";
import { MathText } from "./math-display";

/**
 * Data captured from the ShowYourWork component when student submits
 */
export interface ShowYourWorkData {
  /** The tldraw canvas state (for replay/grading) */
  canvasState: TLEditorSnapshot | null;
  /** PNG image of the canvas (for quick viewing) */
  canvasImage: Blob | null;
  /** The student's final answer (may include LaTeX) */
  finalAnswer: string;
}

export interface ShowYourWorkProps {
  /** Question text (may include LaTeX with $...$ or $$...$$) */
  questionText: string;
  /** Optional expected solution steps for reference */
  workingSteps?: string[];
  /** Callback when student submits their work */
  onSubmit: (data: ShowYourWorkData) => void;
  /** Make the canvas read-only (for reviewing submitted work) */
  readOnly?: boolean;
  /** Initial canvas state (for loading saved work) */
  initialCanvasState?: TLEditorSnapshot;
  /** Initial answer value */
  initialAnswer?: string;
  /** Canvas height in pixels */
  canvasHeight?: number;
}

/**
 * Canvas component for math/science "show your work" problems.
 * Uses tldraw for freehand drawing and MathText for LaTeX rendering.
 *
 * Students can:
 * - Draw their work on the canvas
 * - Enter a final answer (with LaTeX support)
 * - Submit their work for grading
 *
 * Teachers can:
 * - View submitted work in read-only mode
 * - See the expected solution steps
 */
export function ShowYourWork({
  questionText,
  workingSteps,
  onSubmit,
  readOnly = false,
  initialCanvasState,
  initialAnswer = "",
  canvasHeight = 400,
}: ShowYourWorkProps) {
  const editorRef = useRef<Editor | null>(null);
  const [finalAnswer, setFinalAnswer] = useState(initialAnswer);
  const [showSteps, setShowSteps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Called when tldraw mounts. Sets up the editor reference and loads initial state.
   */
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Load initial canvas state if provided
      if (initialCanvasState) {
        editor.loadSnapshot(initialCanvasState);
      }

      // Set read-only mode if specified
      if (readOnly) {
        editor.updateInstanceState({ isReadonly: true });
      }
    },
    [initialCanvasState, readOnly]
  );

  /**
   * Captures the canvas state and image, then calls onSubmit.
   */
  const handleSubmit = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsSubmitting(true);

    try {
      // Get the canvas snapshot (for replay/re-editing)
      const canvasState = editor.getSnapshot();

      // Get all shape IDs on the current page
      const shapeIds = editor.getCurrentPageShapeIds();
      let canvasImage: Blob | null = null;

      // Only export image if there are shapes
      if (shapeIds.size > 0) {
        const shapeIdsArray = Array.from(shapeIds) as TLShapeId[];

        // Get SVG string from editor
        const svgResult = await editor.getSvgString(shapeIdsArray, {
          padding: 16,
          background: true,
        });

        if (svgResult) {
          // Convert SVG to PNG blob
          canvasImage = await getSvgAsImage(svgResult.svg, {
            type: "png",
            width: svgResult.width,
            height: svgResult.height,
            quality: 1,
          });
        }
      }

      onSubmit({
        canvasState,
        canvasImage,
        finalAnswer,
      });
    } catch (error) {
      console.error("Failed to capture canvas:", error);
      // Still submit with null image on error
      onSubmit({
        canvasState: editorRef.current?.getSnapshot() ?? null,
        canvasImage: null,
        finalAnswer,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [finalAnswer, onSubmit]);

  /**
   * Clears all shapes from the canvas.
   */
  const handleClear = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || readOnly) return;

    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size > 0) {
      editor.deleteShapes(Array.from(shapeIds) as TLShapeId[]);
    }
  }, [readOnly]);

  return (
    <div className="space-y-4">
      {/* Question Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Question:</h3>
        <div className="text-blue-800">
          <MathText>{questionText}</MathText>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
          <span className="text-sm font-medium text-gray-700">
            Show Your Work
          </span>
          {!readOnly && (
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              type="button"
            >
              Clear Canvas
            </button>
          )}
        </div>
        <div style={{ height: canvasHeight }}>
          <Tldraw
            onMount={handleMount}
            hideUi={false}
            components={{
              DebugPanel: null,
              DebugMenu: null,
            }}
          />
        </div>
      </div>

      {/* Final Answer Input */}
      <div className="space-y-2">
        <label
          htmlFor="final-answer"
          className="block text-sm font-medium text-gray-700"
        >
          Final Answer (use $ for inline math, $$ for block math):
        </label>
        <input
          id="final-answer"
          type="text"
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Enter your final answer..."
        />
        {/* Live Preview */}
        {finalAnswer && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <span className="text-xs text-gray-500 block mb-1">Preview:</span>
            <div className="text-gray-900">
              <MathText>{finalAnswer}</MathText>
            </div>
          </div>
        )}
      </div>

      {/* Expected Steps Toggle (for teacher review or hints) */}
      {workingSteps && workingSteps.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50
                       hover:bg-gray-100 transition-colors text-left"
            type="button"
          >
            <span className="text-sm font-medium text-gray-700">
              {readOnly ? "Expected Solution Steps" : "Show Hint (Solution Steps)"}
            </span>
            <span className="text-gray-400">{showSteps ? "-" : "+"}</span>
          </button>
          {showSteps && (
            <div className="p-4 space-y-2 bg-yellow-50">
              {workingSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-200 rounded-full
                                   flex items-center justify-center text-xs font-medium text-yellow-800">
                    {index + 1}
                  </span>
                  <div className="text-sm text-yellow-900">
                    <MathText>{step}</MathText>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      {!readOnly && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium
                     hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed
                     transition-colors"
          type="button"
        >
          {isSubmitting ? "Submitting..." : "Submit Work"}
        </button>
      )}
    </div>
  );
}
