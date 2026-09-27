import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions";
import { runSecurityAudit } from "./auditor";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4021;
const PAY_TO = process.env.ALGORAND_PAYTO_ADDRESS;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz";
const PRICE = process.env.PRICE_PER_REQUEST || "$0.01";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const CHALLENGE_TAG = "x402-global-challenge";
const USDC_MAINNET_ASA_ID = "31566704";
const ALGORAND_ADDRESS_RE = /^[A-Z2-7]{58}$/;
// CAIP-2 Algorand mainnet identifier expected by @x402/avm.
const NETWORK = (process.env.ALGORAND_NETWORK || "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=") as any;

if (!PAY_TO) {
  throw new Error(
    "ALGORAND_PAYTO_ADDRESS is required. Use a wallet address you control and never commit its mnemonic/private key.",
  );
}
if (!ALGORAND_ADDRESS_RE.test(PAY_TO)) {
  throw new Error("ALGORAND_PAYTO_ADDRESS must be a 58-character Algorand address.");
}

function publicResourceUrl(path: string): string {
  return new URL(path, PUBLIC_BASE_URL).toString();
}

// Route configuration with Algorand payments
const routes = {
  "POST /api/audit": {
    accepts: {
      scheme: "exact",
      network: NETWORK,
      payTo: PAY_TO,
      price: PRICE,
      extra: {
        tag: CHALLENGE_TAG,
        service: "council-security-auditor",
        asset: "USDC",
        asaId: USDC_MAINNET_ASA_ID,
      },
    },
    resource: publicResourceUrl("/api/audit"),
    description: "Council Multi-Surface Code Security & Vulnerability Audit",
    mimeType: "application/json",
    serviceName: "Council Security Auditor",
    tags: [CHALLENGE_TAG, "algorand", "x402", "usdc", "security-audit"],
    extensions: {
      ...declareDiscoveryExtension({
        bodyType: "json",
        input: {
          code: "contract Probe { function ok() external pure returns (uint256) { return 1; } }",
          language: "solidity",
        },
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Smart contract source code to audit for security vulnerabilities",
            },
            language: {
              type: "string",
              enum: ["solidity", "teal", "python"],
              description: "Programming language of the smart contract",
            },
          },
          required: ["code"],
        },
        output: {
          example: {
            service: "Council Security Surface",
            result: {
              score: 100,
              passed: true,
              totalFindings: 0,
              findings: [],
              timestamp: "2026-09-26T21:00:00.000Z",
              metadata: {
                language: "solidity",
                linesOfCode: 1,
              },
            },
            paid: true,
          },
        },
      }),
    },
  },
};

// Create facilitator client pointed to GoPlausible facilitator.
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

// Apply x402 payment middleware using ExactAvmScheme
const avmScheme = new ExactAvmScheme();

app.use(
  paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    [{ network: "algorand:*", server: avmScheme }],
  ),
);

// Public route: health & discovery
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Council Code Security Auditor (x402 Algorand)",
    network: NETWORK,
    payTo: PAY_TO,
    price: PRICE,
    facilitator: FACILITATOR_URL,
    timestamp: new Date().toISOString(),
  });
});

// Protected route: Code security audit (Requires x402 payment)
app.post("/api/audit", (req: Request, res: Response) => {
  const { code, language } = req.body || {};
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing or invalid 'code' string in request body." });
    return;
  }

  const result = runSecurityAudit(code, language || "solidity");
  res.json({
    service: "Council Security Surface",
    result,
    paid: true,
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 x402 Algorand Service running on http://localhost:${PORT}`);
  console.log(`📡 Algorand Network: ${NETWORK}`);
  console.log(`💳 PayTo Address:   ${PAY_TO}`);
  console.log(`💰 Price per call:   ${PRICE}`);
  console.log(`🔗 Facilitator:      ${FACILITATOR_URL}`);
  console.log(`====================================================`);
});
