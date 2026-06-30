# Graph Report - .  (2026-06-24)

## Corpus Check
- Corpus is ~19,269 words - fits in a single context window. You may not need a graph.

## Summary
- 101 nodes · 115 edges · 36 communities (18 shown, 18 thin omitted)
- Extraction: 57% EXTRACTED · 43% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Components & Layout|UI Components & Layout]]
- [[_COMMUNITY_Bank Statement Parsing Logic|Bank Statement Parsing Logic]]
- [[_COMMUNITY_Underwriting & Risk Calculations|Underwriting & Risk Calculations]]
- [[_COMMUNITY_On-Device AI Classification Workflow|On-Device AI Classification Workflow]]
- [[_COMMUNITY_File Upload Handling UI|File Upload Handling UI]]
- [[_COMMUNITY_Dashboard Pages & Actions|Dashboard Pages & Actions]]
- [[_COMMUNITY_AI Chat Assistant Interface|AI Chat Assistant Interface]]
- [[_COMMUNITY_Local Classifier Client State|Local Classifier Client State]]
- [[_COMMUNITY_Heuristic Chat Assistant API|Heuristic Chat Assistant API]]
- [[_COMMUNITY_Chat Client-Server Flow|Chat Client-Server Flow]]
- [[_COMMUNITY_nextConfig Settings|nextConfig Settings]]
- [[_COMMUNITY_Turbopack Bundler Rules|Turbopack Bundler Rules]]
- [[_COMMUNITY_Webpack Production Rules|Webpack Production Rules]]
- [[_COMMUNITY_AI Status Indicator UI|AI Status Indicator UI]]
- [[_COMMUNITY_Rule-Based Chat Responses|Rule-Based Chat Responses]]
- [[_COMMUNITY_KPI Overview Cards|KPI Overview Cards]]
- [[_COMMUNITY_Account Detail Panels|Account Detail Panels]]
- [[_COMMUNITY_Drag-Drop Upload Box|Drag-Drop Upload Box]]
- [[_COMMUNITY_Counterparty Cleaner|Counterparty Cleaner]]
- [[_COMMUNITY_AI Classification Heuristics|AI Classification Heuristics]]
- [[_COMMUNITY_PDF Parsing Types|PDF Parsing Types]]
- [[_COMMUNITY_Developer & Agent Manual|Developer & Agent Manual]]

## God Nodes (most connected - your core abstractions)
1. `parseStatementText()` - 10 edges
2. `POST()` - 6 edges
3. `detectBank()` - 6 edges
4. `parseAmount()` - 5 edges
5. `cleanDate()` - 5 edges
6. `parseGeneric()` - 5 edges
7. `checkAccuracy()` - 4 edges
8. `computeRiskProfile()` - 4 edges
9. `parseBankOfBaroda()` - 4 edges
10. `parseIndusInd()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Home Component` --conceptually_related_to--> `On-Device AI Classifier Architecture`  [INFERRED]
  src/app/page.tsx → AGENTS.md
- `enhanceClassifications` --conceptually_related_to--> `On-Device AI Classifier Architecture`  [INFERRED]
  src/lib/engine/local-classifier.ts → AGENTS.md
- `checkAccuracy()` --calls--> `parseStatementText()`  [INFERRED]
  test_accuracy.ts → src/lib/parser/extractors.ts
- `checkAccuracy()` --calls--> `detectBank()`  [INFERRED]
  test_accuracy.ts → src/lib/parser/detector.ts
- `POST()` --calls--> `parseStatementText()`  [INFERRED]
  src/app/api/process/route.ts → src/lib/parser/extractors.ts

## Communities (36 total, 18 thin omitted)

### Community 0 - "UI Components & Layout"
Cohesion: 0.16
Nodes (7): RootLayout(), Charts(), fmt(), fmt(), RiskCard(), getCategoryClass(), cleanCounterpartyName()

### Community 1 - "Bank Statement Parsing Logic"
Cohesion: 0.51
Nodes (9): cleanDate(), parseAmount(), parseBankOfBaroda(), parseCanaraBank(), parseGeneric(), parseICICI(), parseIndusInd(), parseStatementText() (+1 more)

### Community 2 - "Underwriting & Risk Calculations"
Cohesion: 0.33
Nodes (5): classifyTransactions(), computeRiskProfile(), checkAccuracy(), detectBank(), POST()

### Community 3 - "On-Device AI Classification Workflow"
Cohesion: 0.25
Nodes (9): On-Device AI Classifier Architecture, classifyTransactions, Worker onmessage Handler, parseStatementText, enhanceClassifications, Home Component, computeRiskProfile, POST Process Handler (+1 more)

## Knowledge Gaps
- **18 isolated node(s):** `nextConfig`, `Turbopack Config`, `Webpack Config`, `AIEnhancementBadge`, `POST Chat Handler` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseGeneric()` connect `Bank Statement Parsing Logic` to `UI Components & Layout`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `parseStatementText()` connect `Bank Statement Parsing Logic` to `Underwriting & Risk Calculations`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `POST()` connect `Underwriting & Risk Calculations` to `UI Components & Layout`, `Bank Statement Parsing Logic`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `parseStatementText()` (e.g. with `checkAccuracy()` and `POST()`) actually correct?**
  _`parseStatementText()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `POST()` (e.g. with `detectBank()` and `parseStatementText()`) actually correct?**
  _`POST()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `detectBank()` (e.g. with `checkAccuracy()` and `POST()`) actually correct?**
  _`detectBank()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nextConfig`, `Turbopack Config`, `Webpack Config` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._