# Algorand Global x402 Challenge — Submission Package

## Submission Status: FULLY SETTLED & VERIFIED ON MAINNET

The service is running live, conforms strictly to the x402 V2 protocol specification, integrates the Bazaar discovery extension, and has successfully processed and settled an authentic live payment on Algorand Mainnet.

---

## 1. Project Metadata

- **Project Title:** Council Code Security Auditor (x402 Algorand)
- **Tag:** `x402-global-challenge`
- **Track:** Global x402 Challenge ($100K Prize Pool)
- **Controlled Receiver Address:** `3XFFLNEAJSRDYAFDJQLXV5NFMBHGVXVHHDHPIQZU7EDOD6FRFWPDLU25PM`
- **Network Identifier (CAIP-2):** `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`
- **Settlement Asset:** USDC (ASA ID `31566704`, 6 decimals)
- **Price Per Query:** `$0.01` (10,000 base units)
- **Facilitator:** GoPlausible (`https://facilitator.goplausible.xyz`)
- **Live Endpoint URL:** `https://untarnished-ricky-nonhierarchically.ngrok-free.dev/api/audit`
- **Health Check URL:** `https://untarnished-ricky-nonhierarchically.ngrok-free.dev/api/health`

---

## 2. On-Chain Settlement Proof

The live settlement was executed against Algorand Mainnet and verified via the GoPlausible facilitator:

| Field | Value |
|---|---|
| **Transaction ID** | [`VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ`](https://explorer.perawallet.app/tx/VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ) |
| **Confirmed Round** | `65458070` |
| **Transaction Type** | `axfer` (Asset Transfer) |
| **Asset ID** | `31566704` (USDC) |
| **Amount Settled** | `10,000` (0.010000 USDC) |
| **Sender / Payer** | `5Z2W6Q427NXJOBEEEXKTNGPXNDNNJXAAGCW772V7I5NI67IV4TVZMXEJUU` |
| **Receiver** | `3XFFLNEAJSRDYAFDJQLXV5NFMBHGVXVHHDHPIQZU7EDOD6FRFWPDLU25PM` |
| **Facilitator Group** | `+XVREjFKndzcob322UPbF41J0eZ1FYZ0vK+3AQauYt4=` |
| **Transaction Note** | `x402-payment-v2-1790551546370` |
| **Allo Explorer** | [allo.info/tx/VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ](https://allo.info/tx/VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ) |
| **Pera Explorer** | [explorer.perawallet.app/tx/VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ](https://explorer.perawallet.app/tx/VRHCPC467JZ5NXTWQIERMGVF6U6KRXMGJIOFUXPYJG73OF4MGKBQ) |

---

## 3. Product Description & Architecture

### One-Sentence Pitch
A payment-gated AI smart contract security analysis API that charges $0.01 USDC per audit over Algorand Mainnet using the x402 protocol and self-describes via the Bazaar discovery extension.

### Long Description
The Council Code Security Auditor provides instant, deterministic static analysis of smart contracts (Solidity, PyTeal, TEAL) to identify reentrancy hazards, unchecked arithmetic, unsafe delegatecalls, and permission bypasses. 

By implementing `@x402/express` and `@x402/avm`, the service operates without accounts, API keys, or subscriptions. Autonomous agents and developers pay per audit request directly on-chain. The service registers the Bazaar discovery extension with JSON Schema 2020-12 input/output validation, making it directly discoverable and consumable by automated x402 agent crawlers.

---

## 4. Verification Instructions for Judges

### A. Health Check (Free)
```bash
curl -i https://untarnished-ricky-nonhierarchically.ngrok-free.dev/api/health \
  -H "ngrok-skip-browser-warning: true"
```
**Expected Response:** HTTP 200 with service metadata and configured payTo address.

### B. Dry-Run x402 Challenge Probe (Free)
```powershell
Set-Location -LiteralPath "C:\Users\Josh\.gemini\antigravity\scratch\x402-algorand-service"
$env:SERVICE_URL="https://untarnished-ricky-nonhierarchically.ngrok-free.dev"
npm run payment:probe
```
**Expected Response:** Returns `{ ok: true, receipt: { payment_status: "payment_required", bazaar_extension_declared: true, ... } }`.

### C. Inspection of Saved Settlement Receipt
View [`settlement_receipt.json`](./settlement_receipt.json) for the full JSON payload, response body, and on-chain settlement headers.

---

## 5. Electric Capital Open Dev Data Qualification

As required by Step 7 of the official challenge guide:
- **Taxonomy Pull Request:** [`electric-capital/open-dev-data#3077`](https://github.com/electric-capital/open-dev-data/pull/3077)
- **Status:** CI Build Passed (`pass`)
- **Ecosystem Mapping:** `repadd Algorand https://github.com/Simultech369/x402-algorand-service`

