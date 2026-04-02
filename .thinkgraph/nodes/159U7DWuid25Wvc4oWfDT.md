# Synthesis: Core LA Preparation — Technical Plan

## Overview

This synthesis consolidates 11 work items from the Core LA preparation brainstorm into a coherent technical plan. The items span four domains: **model quality**, **hardware integration**, **developer tooling**, and **team coordination**.

## Domain 1: Model Quality (Critical Path)

Three tightly coupled items form the critical path for Core LA model quality:

### 1.1 Drop Detection Regression (~9/100 failure rate)
- **Priority**: P0 — blocking launch
- **Issue**: Drop detection is failing ~9% of the time, a regression from previous performance
- **Dependency**: Likely benefits from key point detection refinement (1.2) and beat grid builder (1.3)

### 1.2 Key Point Detection Model Refinement
- **Priority**: P1 — directly improves model quality
- **Relationship**: Upstream of drop detection; better key points → better drop detection

### 1.3 Beat Grid Builder Implementation
- **Priority**: P1 — "significantly improves overall model quality"
- **Type**: Research/implementation — needs investigation before building
- **Impact**: Cross-cutting improvement that benefits both drop detection and key point detection

### Recommended Sequencing
```
Beat Grid Builder (research) → Key Point Detection Refinement → Drop Detection Fix
```
The beat grid builder provides foundational timing accuracy that both other tasks depend on. However, the drop detection regression should have a parallel investigation track since the 9% failure rate may have a specific bug cause independent of model quality.

## Domain 2: Hardware Integration (Launch-Critical)

### 2.1 USB and CDJ Setup Reliability
- **Priority**: P0 — Core LA is a live event; hardware must work
- **Action**: Validate and fix all USB and CDJ hardware integration
- **Dependencies**: Swift/ProLink kickoff call (3.3)

### 2.2 Offline Model Pipeline Fix
- **Priority**: P0 — Boris requested Data Master assistance
- **Relationship**: Required for USB/CDJ setups to function reliably offline

### Recommended Sequencing
```
Swift/ProLink Kickoff → Offline Pipeline Fix → USB/CDJ Validation
```

## Domain 3: Developer Tooling & Process

### 3.1 Cursor Teams + Bugbot Setup
- **Action**: Boris provisions Cursor Teams ($14.40/user/month) for Sam, Chato, Boris
- **Open question**: Can Evelyn's seat be excluded? Cancel personal accounts after

### 3.2 Codex & Claude Code Evaluation
- **Type**: Research — evaluate as alternatives to Bugbot
- **Codex strengths**: CI/debugging tooling integration
- **Claude Code strengths**: General development assistance
- **Decision needed**: Replace Bugbot or supplement it?

### 3.3 Browser Crash Investigation
- **Owner**: Chato + external testers
- **Suspected cause**: RAM configuration
- **Status**: Ongoing investigation

## Domain 4: Team Coordination

### 4.1 Convert Brainstorm to Tasks
- **Owners**: Chato & Sam
- **Source**: 'Next 3 Months' Figma file
- **Status**: This synthesis partially fulfills this item by structuring the brainstorm output

### 4.2 Swift/ProLink Kickoff Call
- **Owners**: Chato, Sam, Boris
- **Duration**: ~1hr
- **Purpose**: Begin Swift/ProLink work, discuss known Swift traps
- **Urgency**: Scheduled for bank holiday — time-sensitive

### 4.3 Sync with Evelyn
- **Owner**: Maarten
- **Purpose**: Walk through Core LA technical plan and setup details

## Priority Matrix

| Priority | Item | Owner | Blocks |
|----------|------|-------|--------|
| P0 | Drop detection regression | TBD | Launch |
| P0 | USB/CDJ reliability | TBD | Launch |
| P0 | Offline model pipeline | Boris/Data Master | USB/CDJ |
| P1 | Beat grid builder | TBD | Model quality |
| P1 | Key point detection | TBD | Drop detection |
| P1 | Swift/ProLink kickoff | Chato, Sam, Boris | Hardware work |
| P2 | Cursor Teams setup | Boris | Dev velocity |
| P2 | Codex/Claude evaluation | TBD | Tooling decision |
| P2 | Browser crash investigation | Chato | Stability |
| P3 | Brainstorm → tasks | Chato, Sam | Planning |
| P3 | Evelyn sync | Maarten | Alignment |

## Key Risks

1. **Drop detection + hardware = dual critical path**: Both must work for Core LA. If either slips, the event is compromised.
2. **Beat grid builder is research**: Unknown scope. Could be quick or could be a deep rabbit hole. Needs a timebox.
3. **Swift/ProLink traps**: Boris flagged known issues — getting the kickoff call done ASAP is crucial to avoid surprises.
4. **RAM-related browser crashes**: If the root cause isn't RAM configuration, this could become a P0 blocker.

## Recommendations

1. **Parallel-track drop detection**: Investigate the specific regression bug independently from model quality improvements. The 9% failure rate may have a discrete cause.
2. **Timebox beat grid builder research**: Allocate 2-3 days max for investigation before deciding build/no-build.
3. **Prioritize Swift/ProLink call**: This unblocks the entire hardware domain.
4. **Defer tooling decisions**: Cursor/Bugbot/Codex evaluation is P2 — don't let it distract from launch-critical work.
5. **Create a Core LA launch checklist**: Convert P0 items into a gated checklist with clear pass/fail criteria.
