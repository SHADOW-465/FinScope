import { BankTemplate } from "./types";

/**
 * Registry of standard bank templates configuration.
 */
export const BANK_TEMPLATES: BankTemplate[] = [
  {
    bankName: "HDFC Bank",
    detectorRegex: /HDFC BANK|HDFC/i,
    columnMap: {
      dateRelativeX: [0.0, 0.15],
      descriptionRelativeX: [0.15, 0.65],
      amountRelativeX: [0.65, 0.85],
      balanceRelativeX: [0.85, 1.0]
    }
  },
  {
    bankName: "ICICI Bank",
    detectorRegex: /ICICI BANK|ICICI/i,
    columnMap: {
      dateRelativeX: [0.0, 0.12],
      descriptionRelativeX: [0.12, 0.68],
      amountRelativeX: [0.68, 0.86],
      balanceRelativeX: [0.86, 1.0]
    }
  },
  {
    bankName: "Canara Bank",
    detectorRegex: /CANARA BANK|CNRB/i,
    columnMap: {
      dateRelativeX: [0.0, 0.14],
      descriptionRelativeX: [0.14, 0.64],
      amountRelativeX: [0.64, 0.84],
      balanceRelativeX: [0.84, 1.0]
    }
  },
  {
    bankName: "Bank of Baroda",
    detectorRegex: /BANK OF BARODA|BARB/i,
    columnMap: {
      dateRelativeX: [0.0, 0.15],
      descriptionRelativeX: [0.15, 0.60],
      amountRelativeX: [0.60, 0.82],
      balanceRelativeX: [0.82, 1.0]
    }
  },
  {
    bankName: "IndusInd Bank",
    detectorRegex: /INDUSIND BANK|INDB/i,
    columnMap: {
      dateRelativeX: [0.0, 0.16],
      descriptionRelativeX: [0.16, 0.66],
      amountRelativeX: [0.66, 0.86],
      balanceRelativeX: [0.86, 1.0]
    }
  }
];

/**
 * Scans a statement's header text to automatically identify the matching BankTemplate.
 * 
 * @param rawText - Raw text fragment extracted from the first page of the document
 */
export function detectBankTemplate(rawText: string): BankTemplate | null {
  for (const template of BANK_TEMPLATES) {
    if (template.detectorRegex.test(rawText)) {
      return template;
    }
  }
  return null;
}
