# Project Brief: Screenplay Idea Vault

**Status**: APPROVED
**Created**: 2026-03-21

---

**Core Problem**: Creative ideas are fleeting and unstructured. A solo screenwriter generating ideas throughout the day needs a frictionless system to capture them in context — organized around proven craft frameworks — so they're actually usable when sitting down to develop a screenplay.

**Value Proposition**: A personal idea vault that captures story ideas by type, organizes them around screenplay-specific structure (logline → characters → scenes → dialogue), and surfaces the ones that still excite you.

**Primary User**: Solo screenwriter/developer — generating ideas in bursts, needs capture without friction, wants to develop ideas toward a working screenplay.

**Secondary Users**: None (personal tool).

**Known Constraints**: Solo developer, Claude Pro token budget, AWS low-cost stack.

**Complexity Estimate**: Small-Medium

**Explicitly Out of Scope**: Screenplay formatting/export (Final Draft territory), collaboration features, AI-generated story content, Scrivener integration.

## Key Capabilities (high-level)

1. **Quick idea capture** — minimal friction entry, categorized by type:
   - What-If (premise sparks)
   - Character (people, obsessions, occupations)
   - Setting (places, worlds, atmospheres)
   - First Line (opening dialogue or action)
   - Scene (what happens + who says what — screenplay-aware, not prose)
   - Theme / Burning Issue
   - News Flash (real-world story fodder)

2. **Idea review mode** — browse and search ideas; surface ones not reviewed recently ("what still excites you?")

3. **Screenplay scaffolding**
   - Logline builder (who/must/when/now format from the course)
   - Character file (name, obsession, occupation, relationships)
   - Scene bank (killer-scenes blast — unordered scene ideas)

4. **Project organization** — group ideas under a named screenplay project as it develops

## Design Notes

Screenplay structure shapes how ideas are entered and displayed:
- Scenes are captured as action + dialogue fragments, not narrative prose
- Characters are defined by what they *want* and what they *do*, not how they feel internally
- The logline is the north star — every idea should be testable against it

## Craft Framework Reference

Based on *How to Write Best-Selling Fiction* (The Great Courses):
- Idea types map directly to the course's creativity exercises
- The "sweet spot" principle (what you love × commercial viability) applies to screenplay as much as novels
- The elevator pitch / logline format is standard across both forms
