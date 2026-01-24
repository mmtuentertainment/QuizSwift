"use client";

import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/**
 * Escape HTML entities for safe display in error fallback
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface MathDisplayProps {
  /** LaTeX math expression to render */
  math: string;
  /** Display mode (block) vs inline mode */
  displayMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders LaTeX math using KaTeX with DOMPurify sanitization.
 *
 * SECURITY: All KaTeX output is sanitized through DOMPurify.sanitize()
 * before being rendered. This prevents XSS attacks from malicious LaTeX input.
 * KaTeX is also configured with trust: false to prevent unsafe macros.
 */
export function MathDisplay({
  math,
  displayMode = false,
  className = "",
}: MathDisplayProps) {
  const sanitizedHtml = useMemo(() => {
    try {
      // Render LaTeX to HTML with security settings
      const rawHtml = katex.renderToString(math, {
        displayMode,
        trust: false, // Disable potentially unsafe macros
        throwOnError: false,
        strict: false,
      });
      // CRITICAL: Sanitize the HTML output before rendering
      // DOMPurify removes any malicious scripts or attributes
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      // On error, show escaped raw LaTeX (safe - no HTML interpretation)
      console.error("KaTeX rendering error:", error);
      return `<span class="text-red-500 font-mono text-sm">${escapeHtml(math)}</span>`;
    }
  }, [math, displayMode]);

  // SECURITY NOTE: sanitizedHtml is always processed through DOMPurify.sanitize()
  // before reaching this point. This is safe usage of dangerouslySetInnerHTML.
  return (
    <span
      className={`katex-container ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

/**
 * Convenience wrapper for inline math (e.g., $x^2$)
 */
export function InlineMath({
  math,
  className = "",
}: {
  math: string;
  className?: string;
}) {
  return <MathDisplay math={math} displayMode={false} className={className} />;
}

/**
 * Convenience wrapper for block/display math (e.g., $$\sum_{i=1}^n x_i$$)
 */
export function BlockMath({
  math,
  className = "",
}: {
  math: string;
  className?: string;
}) {
  return <MathDisplay math={math} displayMode={true} className={className} />;
}

/**
 * Parses text containing LaTeX delimiters and renders math inline.
 * Supports $...$ for inline and $$...$$ for display mode.
 *
 * All math content is sanitized through MathDisplay -> DOMPurify.
 */
export function MathText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const parts = useMemo(() => {
    const result: Array<{ type: "text" | "inline" | "block"; content: string }> = [];
    let remaining = children;

    // Process $$...$$ (display math) first
    while (remaining.length > 0) {
      const displayMatch = remaining.match(/\$\$([\s\S]*?)\$\$/);
      const inlineMatch = remaining.match(/\$([^$\n]+?)\$/);

      // No more math found
      if (!displayMatch && !inlineMatch) {
        if (remaining) {
          result.push({ type: "text", content: remaining });
        }
        break;
      }

      // Determine which match comes first
      const displayIndex = displayMatch ? remaining.indexOf(displayMatch[0]) : Infinity;
      const inlineIndex = inlineMatch ? remaining.indexOf(inlineMatch[0]) : Infinity;

      if (displayIndex < inlineIndex && displayMatch) {
        // Add text before the match
        if (displayIndex > 0) {
          result.push({ type: "text", content: remaining.slice(0, displayIndex) });
        }
        // Add the display math
        result.push({ type: "block", content: displayMatch[1] });
        remaining = remaining.slice(displayIndex + displayMatch[0].length);
      } else if (inlineMatch) {
        // Add text before the match
        if (inlineIndex > 0) {
          result.push({ type: "text", content: remaining.slice(0, inlineIndex) });
        }
        // Add the inline math
        result.push({ type: "inline", content: inlineMatch[1] });
        remaining = remaining.slice(inlineIndex + inlineMatch[0].length);
      }
    }

    return result;
  }, [children]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.content}</span>;
        }
        if (part.type === "inline") {
          return <InlineMath key={index} math={part.content} />;
        }
        if (part.type === "block") {
          return (
            <span key={index} className="block my-2">
              <BlockMath math={part.content} />
            </span>
          );
        }
        return null;
      })}
    </span>
  );
}
