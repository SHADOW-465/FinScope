import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { processIntake } from "./intake";

describe("Document Intake Engine", () => {
  const referenceDir = "c:\\Users\\acer\\Downloads\\reference";
  const statementsDir = "c:\\Users\\acer\\Downloads\\bank statement";
  const password = "11051985";

  it("successfully detects encryption/password protection on encrypted HDFC PDF", async () => {
    const filePath = path.join(statementsDir, "RetailAccountStatement_639186457093995625.pdf");
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping test`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    // Call processIntake without a password
    const metadata = await processIntake(buffer, "RetailAccountStatement_639186457093995625.pdf");
    
    expect(metadata.encrypted).toBe(true);
    expect(metadata.pdf_type).toBe("unknown");
    expect(metadata.processing_strategy).toBe("unsupported");
    expect(metadata.pages).toBe(0);
  });

  it("successfully decrypts and classifies encrypted HDFC PDF when password is provided", async () => {
    const filePath = path.join(statementsDir, "RetailAccountStatement_639186457093995625.pdf");
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping test`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    // Call processIntake with correct password
    const metadata = await processIntake(buffer, "RetailAccountStatement_639186457093995625.pdf", password);
    
    expect(metadata.encrypted).toBe(false);
    expect(metadata.pdf_type).toBe("digital");
    expect(metadata.pages).toBeGreaterThan(0);
    expect(metadata.language).toBe("en");
    expect(metadata.bank_unknown).toBe(false);
    expect(metadata.processing_strategy).toBe("native");
    expect(metadata.pageDetails).toBeDefined();
    expect(metadata.pageDetails!.length).toBe(metadata.pages);
  });

  it("classifies standard digital bank statements correctly", async () => {
    // Look for a PDF in reference directory
    if (!fs.existsSync(referenceDir)) {
      console.warn(`Reference directory not found: ${referenceDir}, skipping test`);
      return;
    }
    const files = fs.readdirSync(referenceDir).filter(f => f.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      console.warn("No reference PDF files found, skipping test");
      return;
    }

    const file = files[0];
    const filePath = path.join(referenceDir, file);
    const buffer = fs.readFileSync(filePath);
    
    const metadata = await processIntake(buffer, file);
    
    expect(metadata.encrypted).toBe(false);
    expect(metadata.pdf_type).toBe("digital");
    expect(metadata.pages).toBeGreaterThan(0);
    expect(metadata.language).toBe("en");
    expect(metadata.bank_unknown).toBe(false);
    expect(metadata.processing_strategy).toBe("native");
  });

  it("handles corrupt files gracefully", async () => {
    const corruptBuffer = Buffer.from("this is a corrupt dummy file, not a valid pdf structure");
    const metadata = await processIntake(corruptBuffer, "corrupt.pdf");
    
    expect(metadata.encrypted).toBe(false);
    expect(metadata.pdf_type).toBe("corrupt");
    expect(metadata.estimated_quality).toBe(0.0);
    expect(metadata.pages).toBe(0);
    expect(metadata.processing_strategy).toBe("unsupported");
  });
});
