#!/bin/bash
set -euo pipefail

if [ "${1:-}" = "plan" ]; then
    MODE="plan"; PROMPT_FILE="PROMPT_plan.md"; MAX_ITERATIONS=${2:-0}
elif [[ "${1:-}" =~ ^[0-9]+$ ]]; then
    MODE="build"; PROMPT_FILE="PROMPT_build.md"; MAX_ITERATIONS=$1
else
    MODE="build"; PROMPT_FILE="PROMPT_build.md"; MAX_ITERATIONS=0
fi

ITERATION=0
echo ""
echo "============================================================"
echo "              RALPH WIGGUM LOOP"
echo "============================================================"
echo "  Mode: $MODE | Prompt: $PROMPT_FILE"
[ $MAX_ITERATIONS -gt 0 ] && echo "  Max iterations: $MAX_ITERATIONS"
echo ""

[ ! -f "$PROMPT_FILE" ] && echo "ERROR: $PROMPT_FILE not found" && exit 1

while true; do
    [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ] && echo "Done!" && break
    ITERATION=$((ITERATION + 1))
    echo "Iteration $ITERATION - $(date '+%H:%M:%S')"
    cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions --model opus --verbose || true
    git push origin main 2>/dev/null || true
    sleep 2
done
