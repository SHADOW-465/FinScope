import { describe, it, expect } from "vitest";
import { reconstructRows } from "./row-reconstructor";
import { TextToken, TableRegion } from "./types";

describe("Row Reconstruction Engine", () => {
  const tableRegion: TableRegion = {
    boundingBox: { x: 10, y: 100, width: 500, height: 400 },
    hasBorders: false,
    confidence: 1.0,
    columnsCount: 5
  };

  const createToken = (
    text: string,
    x: number,
    y: number,
    width = 40,
    height = 10
  ): TextToken => ({
    text,
    pageNumber: 1,
    boundingBox: { x, y, width, height },
    font: "Helvetica",
    confidence: 1.0,
    readingOrder: 0
  });

  it("groups tokens into a single row and maps to correct columns", () => {
    // 5 tokens sharing roughly y = 120
    const tokens = [
      createToken("12/04/2023", 15, 120),       // Date (< 15% width -> relX = 5/500 = 0.01)
      createToken("UPI-TRANSFER", 100, 119),     // Description (relX = 90/500 = 0.18)
      createToken("TO JOHN", 200, 121),          // Description (relX = 190/500 = 0.38)
      createToken("1,500.00", 380, 120),         // Amount (relX = 370/500 = 0.74)
      createToken("24,592.56", 450, 120)         // Balance (relX = 440/500 = 0.88)
    ];

    const rows = reconstructRows(tokens, tableRegion);
    expect(rows.length).toBe(1);
    expect(rows[0].dateText).toBe("12/04/2023");
    expect(rows[0].descriptionText).toBe("UPI-TRANSFER TO JOHN");
    expect(rows[0].amountText).toBe("1,500.00");
    expect(rows[0].balanceText).toBe("24,592.56");
  });

  it("merges multi-line wrapped narration into the preceding transaction", () => {
    // Row 1: main transaction row with date
    // Row 2: wrapped narration line (no date, text in description column)
    const tokens = [
      createToken("15-Jul-2023", 15, 150),
      createToken("INTEREST PAYMENT BY BANK", 100, 150),
      createToken("45.00", 380, 150),
      createToken("24,637.56", 450, 150),

      // Wrapped line 5 pixels lower
      createToken("FOR THE QUARTER ENDING JUNE", 120, 156)
    ];

    const rows = reconstructRows(tokens, tableRegion);
    expect(rows.length).toBe(1); // Only 1 logical transaction
    expect(rows[0].dateText).toBe("15-Jul-2023");
    expect(rows[0].descriptionText).toBe("INTEREST PAYMENT BY BANK FOR THE QUARTER ENDING JUNE");
    expect(rows[0].amountText).toBe("45.00");
    expect(rows[0].balanceText).toBe("24,637.56");
  });
});
