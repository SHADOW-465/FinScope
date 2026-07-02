/// <reference types="vitest/globals" />
/**
 * Golden-corpus harness (PRD-v2 §D): every folder under tests/golden/ with a
 * fixture.json is parsed end-to-end (detect bank -> extract transactions ->
 * running-balance integrity) and checked against its expected values.
 * See tests/golden/README.md for the fixture format.
 */
import fs from "node:fs";
import path from "node:path";
import { detectBank } from "@/lib/parser/detector";
import { parseStatementText } from "@/lib/parser/extractors";
import { checkStatementIntegrity } from "@/lib/parser/integrity";

interface GoldenFixture {
  description?: string;
  bank?: string;
  text?: string;
  textFile?: string;
  expected: {
    transactionCount: number;
    integrity: "ok" | "warning" | "fail";
    accountNumber?: string;
    accountHolder?: string;
    closingBalance?: number;
  };
}

const GOLDEN_DIR = path.resolve(__dirname, "../../../tests/golden");

function discoverFixtures(): Array<{ name: string; dir: string; fixture: GoldenFixture }> {
  if (!fs.existsSync(GOLDEN_DIR)) return [];
  return fs
    .readdirSync(GOLDEN_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = path.join(GOLDEN_DIR, entry.name);
      const fixturePath = path.join(dir, "fixture.json");
      if (!fs.existsSync(fixturePath)) return [];
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as GoldenFixture;
      return [{ name: entry.name, dir, fixture }];
    });
}

const fixtures = discoverFixtures();

describe("golden statement corpus", () => {
  if (fixtures.length === 0) {
    it.todo("no golden fixtures committed yet — see tests/golden/README.md");
    return;
  }

  for (const { name, dir, fixture } of fixtures) {
    it(`${name}${fixture.description ? ` — ${fixture.description}` : ""}`, () => {
      const text =
        fixture.text ??
        fs.readFileSync(path.join(dir, fixture.textFile as string), "utf-8");

      const bank = fixture.bank ?? detectBank(text);
      const parsed = parseStatementText(text, bank);

      expect(parsed.transactions.length).toBe(fixture.expected.transactionCount);

      const integrity = checkStatementIntegrity(parsed.transactions);
      expect(integrity.status).toBe(fixture.expected.integrity);

      if (fixture.expected.accountNumber !== undefined) {
        expect(parsed.accountNumber).toBe(fixture.expected.accountNumber);
      }
      if (fixture.expected.accountHolder !== undefined) {
        expect(parsed.accountHolder).toBe(fixture.expected.accountHolder);
      }
      if (fixture.expected.closingBalance !== undefined) {
        const last = parsed.transactions[parsed.transactions.length - 1];
        expect(last.balance).toBeCloseTo(fixture.expected.closingBalance, 2);
      }
    });
  }
});
