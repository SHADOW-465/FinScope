import { LayoutRegion, TableRegion } from "./types";

/**
 * Identifies and isolates TableRegions from visual LayoutRegions.
 * 
 * @param regions - Categorized visual LayoutRegions
 * @param pageNumber - Target page number of regions
 */
export function detectTables(regions: LayoutRegion[], pageNumber: number): TableRegion[] {
  return regions
    .filter(r => r.type === "table_region")
    .map(r => ({
      boundingBox: { ...r.boundingBox },
      pageNumber,
      confidence: r.confidence
    }));
}
