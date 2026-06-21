# Graph Report - C:\Users\acer\Documents\GitHub\FinScope  (2026-06-21)

## Corpus Check
- Corpus is ~16,047 words - fits in a single context window. You may not need a graph.

## Summary
- 71 nodes · 99 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 61% EXTRACTED · 39% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Risk Scoring Engine|Risk Scoring Engine]]
- [[_COMMUNITY_Statement API Processing|Statement API Processing]]
- [[_COMMUNITY_Statement API Processing|Statement API Processing]]
- [[_COMMUNITY_Statement API Processing|Statement API Processing]]
- [[_COMMUNITY_Statement API Processing|Statement API Processing]]
- [[_COMMUNITY_AI Assistant Interface|AI Assistant Interface]]
- [[_COMMUNITY_Statement API Processing|Statement API Processing]]

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
- `checkAccuracy()` --calls--> `parseStatementText()`  [INFERRED]
  test_accuracy.ts → src/lib/parser/extractors.ts
- `checkAccuracy()` --calls--> `detectBank()`  [INFERRED]
  test_accuracy.ts → src/lib/parser/detector.ts
- `POST()` --calls--> `parseStatementText()`  [INFERRED]
  src/app/api/process/route.ts → src/lib/parser/extractors.ts
- `POST()` --calls--> `detectBank()`  [INFERRED]
  src/app/api/process/route.ts → src/lib/parser/detector.ts
- `POST()` --calls--> `classifyTransactions()`  [INFERRED]
  src/app/api/process/route.ts → src/lib/engine/classifier.ts

## Communities (20 total, 4 thin omitted)

### Community 0 - "Risk Scoring Engine"
Cohesion: 0.17
Nodes (7): RootLayout(), Charts(), fmt(), fmt(), RiskCard(), getCategoryClass(), cleanCounterpartyName()

### Community 1 - "Statement API Processing"
Cohesion: 0.51
Nodes (9): cleanDate(), parseAmount(), parseBankOfBaroda(), parseCanaraBank(), parseGeneric(), parseICICI(), parseIndusInd(), parseStatementText() (+1 more)

### Community 2 - "Statement API Processing"
Cohesion: 0.33
Nodes (5): classifyTransactions(), computeRiskProfile(), checkAccuracy(), detectBank(), POST()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseGeneric()` connect `Statement API Processing` to `Risk Scoring Engine`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `parseStatementText()` connect `Statement API Processing` to `Statement API Processing`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `POST()` connect `Statement API Processing` to `Risk Scoring Engine`, `Statement API Processing`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `parseStatementText()` (e.g. with `checkAccuracy()` and `POST()`) actually correct?**
  _`parseStatementText()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `POST()` (e.g. with `detectBank()` and `parseStatementText()`) actually correct?**
  _`POST()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `detectBank()` (e.g. with `checkAccuracy()` and `POST()`) actually correct?**
  _`detectBank()` has 3 INFERRED edges - model-reasoned connections that need verification._