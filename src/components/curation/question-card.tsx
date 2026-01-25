'use client';

import type { CuratedQuestion } from '@/generated/prisma/client';
import { MathText } from '@/components/quiz';

interface QuestionCardProps {
  question: CuratedQuestion;
  selected: boolean;
  onToggleSelect: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const bloomColors: Record<string, { bg: string; text: string }> = {
  understand: { bg: 'bg-blue-100', text: 'text-blue-800' },
  apply: { bg: 'bg-green-100', text: 'text-green-800' },
  analyze: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  evaluate: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'bg-green-100', text: 'text-green-800' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  hard: { bg: 'bg-red-100', text: 'text-red-800' },
};

function ScoreStars({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">--</span>;

  // Score is already on 0-5 scale, clamp to valid range
  const stars = Math.min(5, Math.max(0, Math.round(score)));
  return (
    <span className="text-yellow-500">
      {'★'.repeat(stars)}
      {'☆'.repeat(5 - stars)}
    </span>
  );
}

function Badge({
  label,
  bg,
  textColor,
}: {
  label: string;
  bg: string;
  textColor: string;
}) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${textColor}`}>
      {label}
    </span>
  );
}

export function QuestionCard({
  question,
  selected,
  onToggleSelect,
  showDetails,
  onToggleDetails,
}: QuestionCardProps) {
  const bloomStyle = bloomColors[question.bloomLevel] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };
  const difficultyStyle = difficultyColors[question.difficulty] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };

  const truncatedText =
    question.questionText.length > 100 && !showDetails
      ? question.questionText.slice(0, 100) + '...'
      : question.questionText;

  const workingSteps = question.workingSteps as string[] | null;
  const options = question.options as string[] | null;

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onToggleSelect}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {/* Selection checkbox */}
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 bg-white'
            }`}
          >
            {selected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Rank */}
          {question.rank !== null && (
            <span className="text-sm text-gray-500 font-medium">#{question.rank}</span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge
            label={question.bloomLevel}
            bg={bloomStyle.bg}
            textColor={bloomStyle.text}
          />
          <Badge
            label={question.difficulty}
            bg={difficultyStyle.bg}
            textColor={difficultyStyle.text}
          />
          <Badge
            label={question.questionType.replace('_', ' ')}
            bg="bg-gray-100"
            textColor="text-gray-700"
          />
        </div>
      </div>

      {/* Question text */}
      <div className="mb-3">
        <MathText className="text-gray-800">{truncatedText}</MathText>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Score:</span>
          <ScoreStars score={question.evaluationScore} />
          {question.evaluationScore !== null && (
            <span className="text-gray-400 text-xs">
              ({(question.evaluationScore * 100).toFixed(0)}%)
            </span>
          )}
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDetails();
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div
          className="mt-4 pt-4 border-t border-gray-200 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full question if truncated */}
          {question.questionText.length > 100 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Full Question
              </h4>
              <MathText className="text-gray-800">{question.questionText}</MathText>
            </div>
          )}

          {/* Options for multiple choice */}
          {options && options.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Options</h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {options.map((opt, i) => (
                  <li key={i}>
                    <MathText>{opt}</MathText>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Answer */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Answer</h4>
            <MathText className="text-green-700 font-medium">
              {question.correctAnswer}
            </MathText>
          </div>

          {/* Explanation */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Explanation</h4>
            <MathText className="text-gray-600 text-sm">{question.explanation}</MathText>
          </div>

          {/* Working steps for show_work questions */}
          {workingSteps && workingSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Working Steps
              </h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                {workingSteps.map((step, i) => (
                  <li key={i}>
                    <MathText>{step}</MathText>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Comprehension rationale */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Why This Tests Understanding
            </h4>
            <p className="text-sm text-gray-600">{question.comprehensionRationale}</p>
          </div>

          {/* Source evidence */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Source Evidence
            </h4>
            <blockquote className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">
              &quot;{question.sourceEvidence}&quot;
            </blockquote>
          </div>

          {/* Evaluation breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Evaluation Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-500 mb-1">Comprehension</div>
                <div className="font-medium">
                  {question.comprehensionDepth !== null
                    ? `${(question.comprehensionDepth * 100).toFixed(0)}%`
                    : '--'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 mb-1">Clarity</div>
                <div className="font-medium">
                  {question.clarity !== null
                    ? `${(question.clarity * 100).toFixed(0)}%`
                    : '--'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 mb-1">Answerability</div>
                <div className="font-medium">
                  {question.answerability !== null
                    ? `${(question.answerability * 100).toFixed(0)}%`
                    : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Concept tag */}
          <div className="text-xs text-gray-400">
            Concept: {question.targetConceptName}
          </div>
        </div>
      )}
    </div>
  );
}

export type { QuestionCardProps };
