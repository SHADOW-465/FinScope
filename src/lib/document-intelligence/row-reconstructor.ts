import { TextToken, TableRegion, RawTransaction } from "./types";

/**
 * Reconstructs transaction rows from spatial text tokens within a table region.
 * Handles multi-line wrapped narration and column mapping based on horizontal coordinates.
 * 
 * @param tokens - The raw spatial TextTokens extracted from the document page
 * @param tableRegion - The detected TableRegion bounding box and metadata
 */
export function reconstructRows(
  tokens: TextToken[],
  tableRegion: TableRegion
): RawTransaction[] {
  const { boundingBox } = tableRegion;

  // 1. Filter tokens that lie inside the table bounding box (vertically and horizontally)
  // Allow a small padding to catch edge alignment issues
  const tableTokens = tokens.filter(t => {
    const box = t.boundingBox;
    return (
      box.y >= boundingBox.y - 2 &&
      box.y + box.height <= boundingBox.y + boundingBox.height + 2 &&
      box.x >= boundingBox.x - 5 &&
      box.x + box.width <= boundingBox.x + boundingBox.width + 5
    );
  });

  if (tableTokens.length === 0) return [];

  // 2. Group tokens into horizontal rows based on vertical proximity (y-coordinate within 4 pixels)
  const rowGroups: TextToken[][] = [];
  const sortedByY = [...tableTokens].sort((a, b) => a.boundingBox.y - b.boundingBox.y);

  for (const token of sortedByY) {
    let placed = false;
    for (const group of rowGroups) {
      const groupY = group[0].boundingBox.y;
      if (Math.abs(token.boundingBox.y - groupY) <= 4) {
        group.push(token);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rowGroups.push([token]);
    }
  }

  // Sort each row's tokens from left to right (x-coordinate)
  for (const group of rowGroups) {
    group.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
  }

  // Sort row groups vertically from top to bottom
  rowGroups.sort((a, b) => a[0].boundingBox.y - b[0].boundingBox.y);

  // 3. Classify each token inside each row into table columns based on horizontal positions
  interface TempRow {
    date: string[];
    description: string[];
    amount: string[];
    balance: string[];
  }

  const tempRows: TempRow[] = [];

  for (const row of rowGroups) {
    const temp: TempRow = { date: [], description: [], amount: [], balance: [] };

    for (const token of row) {
      const relX = (token.boundingBox.x - boundingBox.x) / boundingBox.width;

      if (relX < 0.15) {
        temp.date.push(token.text);
      } else if (relX >= 0.15 && relX < 0.65) {
        // Description covers a wide middle band
        temp.description.push(token.text);
      } else if (relX >= 0.65 && relX < 0.85) {
        temp.amount.push(token.text);
      } else {
        temp.balance.push(token.text);
      }
    }

    // Skip empty lines
    if (
      temp.date.length ||
      temp.description.length ||
      temp.amount.length ||
      temp.balance.length
    ) {
      tempRows.push(temp);
    }
  }

  // 4. Merge wrapped rows: a new transaction starts when there is a valid Date
  const rawTransactions: RawTransaction[] = [];
  
  // Date pattern: DD/MM/YY, DD-MM-YYYY, DD MMM YYYY, etc.
  const dateRegex = /^\d{1,2}[-/](\d{1,2}|[a-zA-Z]{3})[-/]\d{2,4}$|^\d{1,2}\s+[a-zA-Z]{3}/i;

  for (const temp of tempRows) {
    const dateStr = temp.date.join(" ").trim();
    const descStr = temp.description.join(" ").trim();
    const amtStr = temp.amount.join(" ").trim();
    const balStr = temp.balance.join(" ").trim();

    const isNewTxn = dateRegex.test(dateStr);

    if (isNewTxn) {
      // Create new transaction row
      rawTransactions.push({
        dateText: dateStr,
        descriptionText: descStr,
        amountText: amtStr,
        balanceText: balStr,
        confidence: 0.95
      });
    } else {
      // Wrapped row: merge description and amount/balance if preceding row exists
      if (rawTransactions.length > 0) {
        const lastTxn = rawTransactions[rawTransactions.length - 1];
        
        if (descStr) {
          lastTxn.descriptionText = lastTxn.descriptionText
            ? `${lastTxn.descriptionText} ${descStr}`
            : descStr;
        }
        
        // If the main transaction line was missing amount/balance but this wrapped row has it, merge them
        if (amtStr && !lastTxn.amountText) {
          lastTxn.amountText = amtStr;
        }
        if (balStr && !lastTxn.balanceText) {
          lastTxn.balanceText = balStr;
        }
      } else {
        // Fallback for header row items that are not transaction starts
        if (dateStr || descStr || amtStr || balStr) {
          rawTransactions.push({
            dateText: dateStr,
            descriptionText: descStr,
            amountText: amtStr,
            balanceText: balStr,
            confidence: 0.5
          });
        }
      }
    }
  }

  return rawTransactions;
}
