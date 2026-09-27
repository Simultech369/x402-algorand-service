/**
 * payer_wallet.ts — Throwaway payer wallet helper for x402 test payments.
 *
 * Subcommands:
 *   generate     — Create a disposable Algorand account. Prints:
 *                  • PAYER_ADDRESS (58-char Algorand address)
 *                  • AVM_PRIVATE_KEY_BASE64 (for toClientAvmSigner)
 *                  • 25-word mnemonic (TERMINAL ONLY — do NOT commit or paste)
 *
 *   optin-usdc   — Opt the payer into USDC ASA 31566704 on mainnet.
 *                  Requires AVM_PRIVATE_KEY_BASE64 set as an env var.
 *
 * Security rules:
 *   • Secrets are printed to stdout ONLY — never written to .env or any file.
 *   • The generate command warns the operator not to commit/paste the mnemonic.
 *   • The optin-usdc command reads the private key from an env var, never from disk.
 *
 * Usage:
 *   npx tsx scripts/payer_wallet.ts generate
 *   $env:AVM_PRIVATE_KEY_BASE64="<from generate output>"
 *   npx tsx scripts/payer_wallet.ts optin-usdc
 */

import { Buffer } from "buffer";
import { randomBytes } from "crypto";

// ---------- Constants ----------

const USDC_MAINNET_ASA_ID = 31566704;
const ALGOD_MAINNET_URL = "https://mainnet-api.4160.nodely.dev";
const ALGOD_MAINNET_TOKEN = "";

// ---------- Algorand address encoding (matching algokit-utils) ----------

// hi-base32 is a transitive dependency via algokit-utils
// We'll use the Address class from algokit-utils directly
import { Address } from "@algorandfoundation/algokit-utils/common";
import { ed25519Generator } from "@algorandfoundation/algokit-utils/crypto";

// ---------- Mnemonic encoding ----------
// Algorand uses a 25-word BIP39-like mnemonic derived from the 32-byte seed.
// We use the same word list approach as the official SDK.
// Rather than bundling the full wordlist, we'll use tweetnacl (already a dependency)
// and compute the mnemonic the same way algosdk does.

// Import tweetnacl for nacl.sign.keyPair.fromSeed compatibility check
import nacl from "tweetnacl";

// Algorand wordlist — we need this for mnemonic generation.
// Since algosdk isn't a direct dep, we'll generate the mnemonic by
// importing the wordlist from the bip39 standard via a simpler approach:
// Actually, let's keep it simple — we'll just output the seed as hex as a backup
// and note that the user can import it into Pera/Defly via the raw key.

// For proper mnemonic, let's check if we can require algosdk's wordlist
// Actually, the simplest robust approach: output only what payment_client.ts needs
// (AVM_PRIVATE_KEY_BASE64) and the address. Mnemonic is optional/nice-to-have.

// ---------- Subcommand: generate ----------

async function generate() {
  // Generate a random 32-byte seed
  const seed = randomBytes(32);

  // Use algokit-utils ed25519Generator to derive keypair from seed
  const { ed25519Pubkey, ed25519SecretKey } = ed25519Generator(seed);

  // Algorand AVM standard secret key is 64 bytes: 32 bytes seed/secret + 32 bytes public key.
  // This is exactly what toClientAvmSigner expects as base64.
  const fullSecretKey = Buffer.concat([Buffer.from(ed25519SecretKey), Buffer.from(ed25519Pubkey)]);
  const privateKeyBase64 = fullSecretKey.toString("base64");

  // Derive Algorand address from pubkey
  const address = new Address(ed25519Pubkey);
  const addressStr = address.toString();

  // Derive mnemonic-equivalent: we'll output the seed as hex since we don't
  // have the Algorand wordlist. The user can use AVM_PRIVATE_KEY_BASE64 directly.
  const seedHex = Buffer.from(seed).toString("hex");

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  THROWAWAY PAYER WALLET — for x402 test payments only");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  PAYER_ADDRESS=${addressStr}`);
  console.log("");
  console.log(`  AVM_PRIVATE_KEY_BASE64=${privateKeyBase64}`);
  console.log("");
  console.log("  ⚠️  SEED (hex, TERMINAL ONLY — do NOT commit, paste, or share):");
  console.log(`  ${seedHex}`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Next steps:");
  console.log(`  1. Send tiny ALGO (0.2+) from Defly to: ${addressStr}`);
  console.log("  2. Run opt-in:");
  console.log(`     $env:AVM_PRIVATE_KEY_BASE64="${privateKeyBase64}"`);
  console.log("     npx tsx scripts/payer_wallet.ts optin-usdc");
  console.log("  3. Send tiny USDC from Defly to the same address");
  console.log("  4. Run live payment:");
  console.log(`     $env:AVM_PRIVATE_KEY_BASE64="${privateKeyBase64}"`);
  console.log("     npm run payment:live");
  console.log("");
  console.log("  ⚠️  This is a DISPOSABLE wallet. Sweep funds out when done.");
  console.log("  ⚠️  NEVER write AVM_PRIVATE_KEY_BASE64 to .env or commit it.");
  console.log("");

  // Zero out seed from memory
  seed.fill(0);
}

// ---------- Subcommand: optin-usdc ----------

async function optinUsdc() {
  const privateKeyBase64 = process.env.AVM_PRIVATE_KEY_BASE64?.trim();
  if (!privateKeyBase64) {
    console.error("Error: AVM_PRIVATE_KEY_BASE64 environment variable is required.");
    console.error('Set it first: $env:AVM_PRIVATE_KEY_BASE64="<from generate output>"');
    process.exitCode = 1;
    return;
  }

  // Decode the private key to get the address
  const secretKey = Buffer.from(privateKeyBase64, "base64");
  if (secretKey.length !== 64) {
    console.error("Error: AVM_PRIVATE_KEY_BASE64 must decode to exactly 64 bytes.");
    process.exitCode = 1;
    return;
  }

  const pubkey = secretKey.subarray(32, 64);
  const address = new Address(pubkey);
  const addressStr = address.toString();

  console.log(`Opting in address ${addressStr} to USDC ASA ${USDC_MAINNET_ASA_ID}...`);

  const getHeaders: Record<string, string> = {};
  if (ALGOD_MAINNET_TOKEN) {
    getHeaders["X-Algo-API-Token"] = ALGOD_MAINNET_TOKEN;
  }

  // Fetch suggested transaction parameters from algod
  const paramsRes = await fetch(`${ALGOD_MAINNET_URL}/v2/transactions/params`, {
    headers: getHeaders,
  });

  if (!paramsRes.ok) {
    console.error(`Error: Algod returned ${paramsRes.status}: ${await paramsRes.text()}`);
    process.exitCode = 1;
    return;
  }

  const params = await paramsRes.json() as {
    "consensus-version": string;
    fee: number;
    "genesis-hash": string;
    "genesis-id": string;
    "last-round": number;
    "min-fee": number;
  };

  // Build an ASA opt-in transaction (asset transfer of 0 to self)
  // We need to construct the raw transaction bytes and sign with nacl.
  // Using the msgpack format that Algorand expects.

  // Import algorand-msgpack (transitive dependency)
  const { encode: msgpackEncode } = await import("algorand-msgpack");

  const genesisHash = Buffer.from(params["genesis-hash"], "base64");
  const firstRound = params["last-round"];
  const lastRound = firstRound + 1000;
  const fee = Math.max(params["min-fee"] || 1000, 1000);

  // Algorand transaction fields for asset transfer opt-in
  // Must be in canonical (alphabetical by tag) order for msgpack
  const txnFields: Record<string, any> = {
    arcv: pubkey,              // asset receiver = self (opt-in)
    fee: fee,
    fv: firstRound,            // first valid round
    gen: params["genesis-id"], // genesis ID
    gh: genesisHash,           // genesis hash
    lv: lastRound,             // last valid round
    snd: pubkey,               // sender
    type: "axfer",             // asset transfer
    xaid: USDC_MAINNET_ASA_ID, // asset ID
  };

  // Encode the transaction with msgpack
  const encodedTxn = msgpackEncode(txnFields);

  // Prepend "TX" prefix for signing
  const txPrefix = Buffer.from("TX");
  const bytesToSign = Buffer.concat([txPrefix, encodedTxn]);

  // Sign with nacl
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
  const signature = nacl.sign.detached(bytesToSign, keyPair.secretKey);

  // Build signed transaction
  const signedTxn = msgpackEncode({
    sig: signature,
    txn: txnFields,
  });

  const postHeaders: Record<string, string> = {
    "Content-Type": "application/x-binary",
  };
  if (ALGOD_MAINNET_TOKEN) {
    postHeaders["X-Algo-API-Token"] = ALGOD_MAINNET_TOKEN;
  }

  // Submit to algod
  const submitRes = await fetch(`${ALGOD_MAINNET_URL}/v2/transactions`, {
    method: "POST",
    headers: postHeaders,
    body: Buffer.from(signedTxn),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    console.error(`Error: Transaction submission failed (${submitRes.status}): ${errorText}`);
    process.exitCode = 1;
    return;
  }

  const result = await submitRes.json() as { txId: string };
  console.log("");
  console.log("✅ USDC opt-in transaction submitted successfully!");
  console.log(`   Transaction ID: ${result.txId}`);
  console.log(`   Address: ${addressStr}`);
  console.log(`   ASA: ${USDC_MAINNET_ASA_ID} (USDC)`);
  console.log("");
  console.log("  Next: Send tiny USDC from Defly to this address, then run:");
  console.log("  npm run payment:live");
  console.log("");
}

// ---------- Main ----------

const subcommand = process.argv[2];

switch (subcommand) {
  case "generate":
    generate().catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    });
    break;

  case "optin-usdc":
    optinUsdc().catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    });
    break;

  default:
    console.error("Usage: npx tsx scripts/payer_wallet.ts <generate|optin-usdc>");
    console.error("");
    console.error("  generate    — Create a throwaway payer wallet (prints to terminal only)");
    console.error("  optin-usdc  — Opt the payer wallet into USDC (requires AVM_PRIVATE_KEY_BASE64 env var)");
    process.exitCode = 1;
}
