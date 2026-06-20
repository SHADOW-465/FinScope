import fs from "fs";
import pdf from "pdf-parse";

async function searchValues() {
  const filePath = "c:\\Users\\acer\\Downloads\\reference\\DetailedStatement (2).pdf";
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer);
  const lines = pdfData.text.split("\n").map(l => l.trim()).filter(l => l !== "");

  console.log("Searching for 41,138 or 92,615.34:");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("41,138") || lines[i].includes("92,615") || lines[i].includes("41138") || lines[i].includes("92615")) {
      console.log(`Line ${i+1}: ${lines[i]}`);
      // Print context
      for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+8); j++) {
        console.log(`  [${j+1}]: ${lines[j]}`);
      }
    }
  }
}
searchValues();
