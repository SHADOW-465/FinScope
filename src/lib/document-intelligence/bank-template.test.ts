import { describe, it, expect } from "vitest";
import { detectBankTemplate } from "./bank-template";

describe("Bank Template Engine", () => {
  it("correctly identifies HDFC Bank statements from header signatures", () => {
    const header = "HDFC BANK LTD\nBranch: MUMBAI\nIFSC: HDFC0000001";
    const template = detectBankTemplate(header);
    expect(template).not.toBeNull();
    expect(template?.bankName).toBe("HDFC Bank");
    expect(template?.columnMap.dateRelativeX).toEqual([0.0, 0.15]);
  });

  it("correctly identifies ICICI Bank statements", () => {
    const header = "ICICI BANK SEC-54 GURGAON STATEMENT OF ACCOUNT";
    const template = detectBankTemplate(header);
    expect(template).not.toBeNull();
    expect(template?.bankName).toBe("ICICI Bank");
  });

  it("returns null for unknown bank headers", () => {
    const header = "MY RANDOM PRIVATE LOCAL CREDIT UNION STATEMENT";
    const template = detectBankTemplate(header);
    expect(template).toBeNull();
  });
});
