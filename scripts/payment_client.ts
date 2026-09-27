import dotenv from "dotenv";
dotenv.config();

import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";
import { x402Client, x402HTTPClient } from "@x402/core/client";

const DEFAULT_BASE_URL = "http://127.0.0.1:4021";
const CHALLENGE_TAG = "x402-global-challenge";
const DEFAULT_NETWORK = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const USDC_MAINNET_ASA_ID = "31566704";
const ALGORAND_ADDRESS_RE = /^[A-Z2-7]{58}$/;

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function headerValue(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

function assertChallenge(paymentRequired: any, expectedPayTo: string, expectedNetwork: string) {
  const accepts = Array.isArray(paymentRequired?.accepts) ? paymentRequired.accepts : [];
  const matching = accepts.find((accept: any) => {
    return (
      accept?.scheme === "exact" &&
      accept?.network === expectedNetwork &&
      accept?.payTo === expectedPayTo &&
      accept?.extra?.tag === CHALLENGE_TAG
    );
  });

  if (!matching) {
    throw new Error(
      `No exact Algorand payment requirement with ${CHALLENGE_TAG} for the configured receiver was found.`,
    );
  }

  return matching;
}

function redactPaymentPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  if (Array.isArray(clone?.payload?.paymentGroup)) {
    clone.payload.paymentGroup = clone.payload.paymentGroup.map((_: string, index: number) => {
      return `[redacted-transaction-${index}]`;
    });
  }
  return clone;
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

async function main() {
  const live = hasFlag("--live");
  const baseUrl = process.env.SERVICE_URL || DEFAULT_BASE_URL;
  const url = new URL("/api/audit", baseUrl).toString();
  const expectedPayTo = requireEnv("ALGORAND_PAYTO_ADDRESS");
  if (!ALGORAND_ADDRESS_RE.test(expectedPayTo)) {
    throw new Error("ALGORAND_PAYTO_ADDRESS must be a 58-character Algorand address.");
  }
  const expectedNetwork = process.env.ALGORAND_NETWORK || DEFAULT_NETWORK;

  const requestBody = JSON.stringify({
    language: "solidity",
    code: "contract Probe { function ok() external pure returns (uint256) { return 1; } }",
  });

  const unpaidResponse = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: requestBody,
  });

  const baseClient = new x402Client();
  const httpClient = new x402HTTPClient(baseClient);
  const unpaid = await httpClient.processResponse(unpaidResponse);

  if (unpaid.paymentStatus !== "payment_required") {
    throw new Error(`Expected x402 payment_required response, got ${unpaid.status}/${unpaid.paymentStatus}.`);
  }

  const requirement = assertChallenge(unpaid.header, expectedPayTo, expectedNetwork);
  const resolvedAsaId = String(requirement.asset || requirement.extra?.asaId || USDC_MAINNET_ASA_ID);
  requirement.asset = resolvedAsaId;
  if (!requirement.extra) requirement.extra = {};
  requirement.extra.asaId = resolvedAsaId;

  const probeReceipt = {
    mode: live ? "live" : "dry-run",
    service_url: url,
    payment_status: unpaid.paymentStatus,
    challenge_tag: requirement.extra?.tag,
    network: requirement.network,
    pay_to: requirement.payTo,
    amount: requirement.maxAmountRequired ?? requirement.amount ?? null,
    asset: resolvedAsaId,
    asa_id: resolvedAsaId,
    bazaar_extension_declared: Boolean(unpaid.header?.extensions?.bazaar),
    extensions: unpaid.header?.extensions ?? null,
  };

  if (!live) {
    console.log(JSON.stringify({ ok: true, receipt: probeReceipt }, null, 2));
    return;
  }

  // Ensure all matching accepts in unpaid.header have explicit asset and asaId
  const rawAccepts = Array.isArray((unpaid.header as any)?.accepts) ? (unpaid.header as any).accepts : [];
  for (const acc of rawAccepts) {
    if (acc?.scheme === "exact" && acc?.network === expectedNetwork) {
      acc.asset = acc.asset || resolvedAsaId;
      if (!acc.extra) acc.extra = {};
      acc.extra.asaId = acc.extra.asaId || resolvedAsaId;
    }
  }

  const privateKeyBase64 = requireEnv("AVM_PRIVATE_KEY_BASE64");
  const signer = toClientAvmSigner(privateKeyBase64);
  const paymentClient = new x402Client()
    .register("algorand:*" as any, new ExactAvmScheme(signer))
    .register(expectedNetwork as any, new ExactAvmScheme(signer));
  const paidHttpClient = new x402HTTPClient(paymentClient);

  const paymentPayload = await paidHttpClient.createPaymentPayload(unpaid.header as any);
  const paymentHeaders = paidHttpClient.encodePaymentSignatureHeader(paymentPayload);

  const paidResponse = await fetch(url, {
    method: "POST",
    headers: buildHeaders(paymentHeaders as Record<string, string>),
    body: requestBody,
  });

  const paid = await paidHttpClient.processResponse(paidResponse);
  const settlementHeader =
    headerValue(paidResponse.headers, "payment-response") ??
    headerValue(paidResponse.headers, "x-payment-response");

  console.log(
    JSON.stringify(
      {
        ok: paid.status >= 200 && paid.status < 300 && paid.paymentStatus === "settled",
        receipt: {
          ...probeReceipt,
          final_status: paid.status,
          final_payment_status: paid.paymentStatus,
          settlement_header_present: Boolean(settlementHeader),
          settlement: paid.header ?? null,
          redacted_payment_payload: redactPaymentPayload(paymentPayload),
          response_body: paid.body,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
