import * as fs from "fs";
import * as path from "path";

const MAINNET_CAIP2 = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const ALGORAND_ADDRESS_RE = /^[A-Z2-7]{58}$/;

function getArgValue(name: string): string | undefined {
  const prefixed = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  if (match) return match.slice(prefixed.length).trim();
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1]?.trim();
  return undefined;
}

function upsertEnv(content: string, entries: Record<string, string>): string {
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) return line;
    const key = match[1];
    if (!Object.prototype.hasOwnProperty.call(entries, key)) return line;
    seen.add(key);
    return `${key}=${entries[key]}`;
  });

  for (const [key, value] of Object.entries(entries)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  return lines.filter((line, index, all) => line !== "" || index < all.length - 1).join("\n") + "\n";
}

async function main() {
  const addr = getArgValue("--address") || process.env.ALGORAND_PAYTO_ADDRESS;

  if (!addr) {
    throw new Error(
      "No receiving address supplied. Use: npm run configure:wallet -- --address <controlled-algorand-address>",
    );
  }
  if (!ALGORAND_ADDRESS_RE.test(addr)) {
    throw new Error("The supplied receiving address is not a 58-character Algorand address.");
  }
  
  const entries = {
    PORT: process.env.PORT || "4021",
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || "http://localhost:4021",
    ALGORAND_NETWORK: process.env.ALGORAND_NETWORK || MAINNET_CAIP2,
    ALGORAND_PAYTO_ADDRESS: addr,
    FACILITATOR_URL: process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz",
    PRICE_PER_REQUEST: process.env.PRICE_PER_REQUEST || "$0.01",
  };

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    const envContent = `# x402 Algorand Service Environment Configuration
# Public service configuration only. Never store wallet mnemonics or private keys here.
${Object.entries(entries).map(([key, value]) => `${key}=${value}`).join("\n")}
`;
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("Written public receiver configuration to .env");
  } else {
    const updated = upsertEnv(fs.readFileSync(envPath, "utf8"), entries);
    fs.writeFileSync(envPath, updated, "utf8");
    console.log("Updated public receiver configuration in .env");
  }
}

main().catch(console.error);
