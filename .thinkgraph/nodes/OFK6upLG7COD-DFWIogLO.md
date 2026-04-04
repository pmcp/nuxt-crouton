# Chat history may bloat brief field over time

**ID:** OFK6upLG7COD-DFWIogLO
**Type:** task
**Status:** done

## Problem

Each dispatch appends conversation context and human answers to the brief. If a node is dispatched multiple times, the brief grows with duplicate sections endlessly.

## Solution

Added `stripAppendedSections()` helper that removes previously appended `**Conversation context:**` and `**Human answers:**` sections from the brief before appending fresh ones. Applied in both `dispatchNode()` and `respondAndRedispatch()`.

The regex `/\n\n---\n\*\*(?:Conversation context|Human answers):\*\*[\s\S]*/g` matches from the first `---` separator with a known section header through the end of the string, ensuring all prior appended sections are replaced rather than accumulated.
