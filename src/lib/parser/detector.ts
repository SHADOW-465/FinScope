export function detectBank(pdfText: string): string {
  const textLower = pdfText.toLowerCase();

  // Extract the header snippet (first 1500 characters)
  // This is where bank logos, addresses, and IFSC codes are printed.
  // Restricting the search here prevents matching other banks listed in transaction remarks.
  const headerSnippet = textLower.slice(0, 1500);

  // 1. Check for IFSC codes in the header snippet first (most accurate)
  if (headerSnippet.includes("barb0")) {
    return "Bank of Baroda";
  }
  if (headerSnippet.includes("icic0")) {
    return "ICICI";
  }
  if (headerSnippet.includes("cnrb0")) {
    return "Canara Bank";
  }
  if (headerSnippet.includes("indb0")) {
    return "IndusInd Bank";
  }
  if (headerSnippet.includes("sbin0")) {
    return "SBI";
  }
  if (headerSnippet.includes("hdfc0")) {
    return "HDFC";
  }
  if (headerSnippet.includes("utib0")) {
    return "Axis";
  }
  if (headerSnippet.includes("kkbk0")) {
    return "Kotak";
  }

  // 2. Fallback to bank name keywords in the header snippet
  if (headerSnippet.includes("hdfc bank") || headerSnippet.includes("hdfcbank")) {
    return "HDFC";
  }
  if (headerSnippet.includes("state bank of india") || headerSnippet.includes("state bank") || headerSnippet.includes(" sbi ")) {
    return "SBI";
  }
  if (headerSnippet.includes("icici bank") || headerSnippet.includes("icicibank")) {
    return "ICICI";
  }
  if (headerSnippet.includes("axis bank") || headerSnippet.includes("axisbank")) {
    return "Axis";
  }
  if (headerSnippet.includes("bank of baroda") || headerSnippet.includes("bank ofbaroda")) {
    return "Bank of Baroda";
  }
  if (headerSnippet.includes("canara bank") || headerSnippet.includes("canarabank")) {
    return "Canara Bank";
  }
  if (headerSnippet.includes("indusind bank") || headerSnippet.includes("indusind")) {
    return "IndusInd Bank";
  }
  if (headerSnippet.includes("federal bank") || headerSnippet.includes("federalbank")) {
    return "Federal Bank";
  }
  if (headerSnippet.includes("indian bank") || headerSnippet.includes("indianbank")) {
    return "Indian Bank";
  }

  // 3. Last resort fallback (entire text)
  if (textLower.includes("bank of baroda")) {
    return "Bank of Baroda";
  }
  if (textLower.includes("icic000")) {
    return "ICICI";
  }
  if (textLower.includes("indb000")) {
    return "IndusInd Bank";
  }
  if (textLower.includes("cnrb000")) {
    return "Canara Bank";
  }
  if (textLower.includes("sbin000")) {
    return "SBI";
  }

  return "Generic";
}
