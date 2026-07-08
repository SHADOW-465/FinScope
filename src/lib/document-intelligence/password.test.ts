import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { validatePassword } from "./password";

describe("Document Password Handler", () => {
  const referenceDir = "c:\\Users\\acer\\Downloads\\reference";
  const statementsDir = "c:\\Users\\acer\\Downloads\\bank statement";
  const password = "11051985";

  it("identifies that password is required for encrypted HDFC statement", async () => {
    const filePath = path.join(statementsDir, "RetailAccountStatement_639186457093995625.pdf");
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping test`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    const result = await validatePassword(buffer);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Password required");
    expect(result.decryptedBuffer).toBeUndefined();
  });

  it("fails with incorrect password warning on encrypted statement", async () => {
    const filePath = path.join(statementsDir, "RetailAccountStatement_639186457093995625.pdf");
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping test`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    const result = await validatePassword(buffer, "wrong-password-12345");
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Incorrect password");
    expect(result.decryptedBuffer).toBeUndefined();
  });

  it("successfully decrypts encrypted statement with correct password", async () => {
    const filePath = path.join(statementsDir, "RetailAccountStatement_639186457093995625.pdf");
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping test`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    const result = await validatePassword(buffer, password);
    
    expect(result.success).toBe(true);
    expect(result.decryptedBuffer).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("passes through successfully on unencrypted statements without password", async () => {
    if (!fs.existsSync(referenceDir)) {
      console.warn(`Reference directory not found: ${referenceDir}, skipping test`);
      return;
    }
    const files = fs.readdirSync(referenceDir).filter(f => f.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      console.warn("No reference PDF files found, skipping test");
      return;
    }

    const filePath = path.join(referenceDir, files[0]);
    const buffer = fs.readFileSync(filePath);
    const result = await validatePassword(buffer);
    
    expect(result.success).toBe(true);
    expect(result.decryptedBuffer).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});
