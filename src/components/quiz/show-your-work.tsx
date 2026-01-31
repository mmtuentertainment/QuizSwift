'use client';

import { useRef, useState, useCallback } from 'react';
import { Tldraw, Editor, TLShapeId, TLEditorSnapshot, getSvgAsImage } from 'tldraw';
import 'tldraw/tldraw.css';
import { MathText } from './math-display';

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
  initialAnswer = '',
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
            type: 'png',
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
      console.error('Failed to capture canvas:', error);
      // Ask user if they want to continue without the image
      const proceed = window.confirm(
        'Could not capture your drawing as an image. Your work is still saved and can be viewed. Continue with submission?'
      );
      if (proceed) {
        onSubmit({
          canvasState: editorRef.current?.getSnapshot() ?? null,
          canvasImage: null,
          finalAnswer,
        });
      }
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
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-medium text-blue-900">Question:</h3>
        <div className="text-blue-800">
          <MathText>{questionText}</MathText>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
          <span className="text-sm font-medium text-gray-700">Show Your Work</span>
          {!readOnly && (
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
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
        <label htmlFor="final-answer" className="block text-sm font-medium text-gray-700">
          Final Answer (use $ for inline math, $$ for block math):
        </label>
        <input
          id="final-answer"
          type="text"
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          disabled={readOnly}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Enter your final answer..."
        />
        {/* Live Preview */}
        {finalAnswer && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <span className="mb-1 block text-xs text-gray-500">Preview:</span>
            <div className="text-gray-900">
              <MathText>{finalAnswer}</MathText>
            </div>
          </div>
        )}
      </div>

      {/* Expected Steps Toggle (for teacher review or hints) */}
      {workingSteps && workingSteps.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex w-full items-center justify-between bg-gray-50 px-4 py-2 text-left transition-colors hover:bg-gray-100"
            type="button"
          >
            <span className="text-sm font-medium text-gray-700">
              {readOnly ? 'Expected Solution Steps' : 'Show Hint (Solution Steps)'}
            </span>
            <span className="text-gray-400">{showSteps ? '-' : '+'}</span>
          </button>
          {showSteps && (
            <div className="space-y-2 bg-yellow-50 p-4">
              {workingSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-yellow-200 text-xs font-medium text-yellow-800">
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
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          type="button"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Work'}
        </button>
      )}
    </div>
  );
}
