---
id: std-20250213-coverage-analysis
depthUsed: standard
timestamp: 2025-02-13T00:00:00Z
executed: true
originalPrompt: "Analiza que archivos del frontend tienen mas lineas sin cobertura. Crea un .md con un orden de los archivos con mas lineas sin cobertura hasta la menor. Guarda la ruta del archivo, cantidad de lineas y cantidad de lineas sin cubrir"
---

# Improved Prompt

```markdown
# Frontend Coverage Analysis Report

## Objective
Generate a markdown report ranking frontend files by uncovered lines, from highest to lowest.

## Scope
- **Target directory**: `apps/frontend/`
- **Coverage source**: Analyze existing coverage reports (lcov.info or HTML coverage in `apps/frontend/coverage/`)

## Output Requirements
Create a markdown file at: `.clavix/outputs/frontend-coverage-report.md`

For each file, include:
1. **File path**: Relative path from `apps/frontend/src/`
2. **Total lines**: Line count in the file
3. **Uncovered lines**: Count of lines not covered by tests
4. **Coverage percentage**: (optional) Calculate % of covered lines

## Format
Sort by **uncovered lines** (descending). Files with most uncovered lines appear first.

## Example Output Format
```markdown
# Frontend Coverage Report

| Rank | File Path | Total Lines | Uncovered Lines | Coverage % |
|------|-----------|--------------|------------------|-------------|
| 1 | components/Header.tsx | 150 | 45 | 70% |
| 2 | services/api.ts | 200 | 38 | 81% |
...
```
```

## Quality Scores
- **Clarity**: 85%
- **Efficiency**: 90%
- **Structure**: 90%
- **Completeness**: 85%
- **Actionability**: 85%
- **Specificity**: 80%
- **Overall**: 86% (good)

## Original Prompt
```
Analiza que archivos del frontend tienen mas lineas sin cobertura. Crea un .md con un orden de los archivos con mas lineas sin cobertura hasta la menor. Guarda la ruta del archivo, cantidad de lineas y cantidad de lineas sin cubrir
```
