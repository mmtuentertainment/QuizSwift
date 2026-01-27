'use client';

/**
 * QuestionEditor Modal Component
 *
 * Modal for editing question content (CONT-07 requirement):
 * - Question text editing
 * - Answer/options editing per question type
 * - Explanation editing
 * - Source evidence editing
 *
 * Uses the updateQuestion server action with Zod validation.
 */

import { useState, useTransition, useCallback, useEffect } from 'react';
import { updateQuestion, type UpdateQuestionInput } from '@/actions/questions';
import { MathText } from '@/components/quiz/math-display';
import { ImageUpload } from './image-upload';
import type { QuestionOptions, MultipleChoiceOptions } from '@/lib/questions/types';

interface QuestionData {
  id: string;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  explanation: string;
  sourceEvidence: string;
  options: QuestionOptions | null;
  bloomLevel: string;
  difficulty: string;
  imageUrl?: string | null;
  imageAltText?: string | null;
}

interface QuestionEditorProps {
  question: QuestionData;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (question: QuestionData) => void;
}

export function QuestionEditor({
  question,
  isOpen,
  onClose,
  onSave,
}: QuestionEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local state for form fields
  const [questionText, setQuestionText] = useState(question.questionText);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const [explanation, setExplanation] = useState(question.explanation);
  const [sourceEvidence, setSourceEvidence] = useState(question.sourceEvidence);
  const [options, setOptions] = useState<QuestionOptions | null>(question.options);
  const [imageUrl, setImageUrl] = useState<string | null>(question.imageUrl ?? null);
  const [imageAltText, setImageAltText] = useState<string | null>(question.imageAltText ?? null);

  // Reset form state when modal opens or question changes
  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuestionText(question.questionText);
      setCorrectAnswer(question.correctAnswer);
      setExplanation(question.explanation);
      setSourceEvidence(question.sourceEvidence);
      setOptions(question.options);
      setImageUrl(question.imageUrl ?? null);
      setImageAltText(question.imageAltText ?? null);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, question]);

  // Handle multiple choice option editing
  const updateMCOption = useCallback((index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    if (!options || options.type !== 'multiple_choice') return;

    const mcOptions = options as MultipleChoiceOptions;
    const newChoices = mcOptions.choices.map((choice, i) => {
      if (field === 'isCorrect') {
        return { ...choice, isCorrect: i === index };
      }
      if (i === index && field === 'text') {
        return { ...choice, text: value as string };
      }
      return choice;
    });

    setOptions({ ...options, choices: newChoices } as MultipleChoiceOptions);

    // Also update correctAnswer to match the correct choice id
    const correctChoice = newChoices.find(c => c.isCorrect);
    if (correctChoice) {
      setCorrectAnswer(correctChoice.id);
    }
  }, [options]);

  const handleSave = useCallback(async () => {
    setError(null);

    const updateData: UpdateQuestionInput = {
      questionText,
      correctAnswer,
      explanation,
      sourceEvidence,
      options,
      imageUrl,
      imageAltText,
    };

    startTransition(async () => {
      const result = await updateQuestion(question.id, updateData);

      if (!result.success) {
        setError(result.error || 'Failed to save question');
        return;
      }

      // Notify parent of successful save
      if (onSave) {
        onSave({
          ...question,
          questionText,
          correctAnswer,
          explanation,
          sourceEvidence,
          options,
          imageUrl,
          imageAltText,
        });
      }

      onClose();
    });
  }, [
    question,
    questionText,
    correctAnswer,
    explanation,
    sourceEvidence,
    options,
    imageUrl,
    imageAltText,
    onSave,
    onClose,
  ]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  // Render options editor based on question type
  const renderOptionsEditor = () => {
    switch (question.questionType) {
      case 'multiple_choice': {
        if (!options || options.type !== 'multiple_choice') return null;
        const mcOptions = options as MultipleChoiceOptions;

        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Answer Choices
            </label>
            {mcOptions.choices.map((choice, index) => (
              <div key={choice.id} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="correctChoice"
                  checked={choice.isCorrect}
                  onChange={() => updateMCOption(index, 'isCorrect', true)}
                  className="mt-2.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Choice {choice.id}</label>
                  <input
                    type="text"
                    value={choice.text}
                    onChange={(e) => updateMCOption(index, 'text', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Select the radio button next to the correct answer
            </p>
          </div>
        );
      }

      case 'true_false':
      case 'true_false_justify': {
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Correct Answer
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tfAnswer"
                  checked={correctAnswer.toLowerCase() === 'true'}
                  onChange={() => setCorrectAnswer('true')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span>True</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tfAnswer"
                  checked={correctAnswer.toLowerCase() === 'false'}
                  onChange={() => setCorrectAnswer('false')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span>False</span>
              </label>
            </div>
          </div>
        );
      }

      case 'fill_in_blank':
      case 'fill_blank':
      case 'short_answer':
      case 'essay': {
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Correct Answer
            </label>
            <textarea
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter the correct answer..."
            />
          </div>
        );
      }

      default:
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Correct Answer
            </label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 id="question-editor-title" className="text-lg font-semibold text-gray-900">
              Edit Question
            </h2>
            <div className="mt-1 flex gap-2 text-xs">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                {question.questionType.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700">
                {question.bloomLevel}
              </span>
              <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">
                {question.difficulty}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Error message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter the question text..."
            />
            {/* Preview with LaTeX */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">Preview:</p>
              <MathText>{questionText}</MathText>
            </div>
          </div>

          {/* Options/Answer editor */}
          {renderOptionsEditor()}

          {/* Explanation */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Explanation
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Explain why this is the correct answer..."
            />
          </div>

          {/* Source Evidence */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Source Evidence
            </label>
            <textarea
              value={sourceEvidence}
              onChange={(e) => setSourceEvidence(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Quote from the source document..."
            />
            <p className="text-xs text-gray-500">
              This evidence links the question to the original document.
            </p>
          </div>

          {/* Image Upload */}
          <ImageUpload
            currentImageUrl={imageUrl}
            onUpload={(storageKey) => setImageUrl(storageKey)}
            onRemove={() => setImageUrl(null)}
            disabled={isPending}
          />

          {/* Image Alt Text (only shown when image exists) */}
          {imageUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Image Description (Alt Text)
              </label>
              <input
                type="text"
                value={imageAltText || ''}
                onChange={(e) => setImageAltText(e.target.value || null)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the image for accessibility..."
              />
              <p className="text-xs text-gray-500">
                Describe the image content for screen readers and accessibility.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
