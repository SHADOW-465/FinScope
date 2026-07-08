import { TextToken, LayoutRegion, RegionType, BoundingBox } from "./types";

/**
 * Classifies page regions (headers, footers, logos, tables) based on relative vertical distributions.
 * 
 * @param tokens - TextToken coordinates extracted from a page
 */
export function analyzeLayout(tokens: TextToken[]): LayoutRegion[] {
  if (tokens.length === 0) return [];

  // Find overall boundaries
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;

  for (const token of tokens) {
    const box = token.boundingBox;
    if (box.y < minY) minY = box.y;
    if (box.y + box.height > maxY) maxY = box.y + box.height;
    if (box.x < minX) minX = box.x;
    if (box.x + box.width > maxX) maxX = box.x + box.width;
  }

  const heightSpan = maxY - minY;
  if (heightSpan <= 0) return [];

  // Vertical boundary levels
  const headerCutoff = minY + (heightSpan * 0.15);
  const footerCutoff = maxY - (heightSpan * 0.10);

  // Group tokens into categories
  const headerTokens = tokens.filter(t => (t.boundingBox.y + t.boundingBox.height) <= headerCutoff);
  const footerTokens = tokens.filter(t => t.boundingBox.y >= footerCutoff);
  const bodyTokens = tokens.filter(t => t.boundingBox.y > headerCutoff && (t.boundingBox.y + t.boundingBox.height) < footerCutoff);

  const regions: LayoutRegion[] = [];

  const buildRegion = (type: RegionType, group: TextToken[]): LayoutRegion | null => {
    if (group.length === 0) return null;
    let rMinX = Infinity, rMaxX = -Infinity;
    let rMinY = Infinity, rMaxY = -Infinity;

    for (const t of group) {
      const box = t.boundingBox;
      if (box.x < rMinX) rMinX = box.x;
      if (box.x + box.width > rMaxX) rMaxX = box.x + box.width;
      if (box.y < rMinY) rMinY = box.y;
      if (box.y + box.height > rMaxY) rMaxY = box.y + box.height;
    }

    return {
      type,
      boundingBox: {
        x: rMinX,
        y: rMinY,
        width: rMaxX - rMinX,
        height: rMaxY - rMinY
      },
      confidence: 0.9
    };
  };

  const headerRegion = buildRegion("header", headerTokens);
  if (headerRegion) regions.push(headerRegion);

  const bodyRegion = buildRegion("table_region", bodyTokens);
  if (bodyRegion) regions.push(bodyRegion);

  const footerRegion = buildRegion("footer", footerTokens);
  if (footerRegion) regions.push(footerRegion);

  return regions;
}
