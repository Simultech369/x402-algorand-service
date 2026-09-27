# x402 Algorand Council Security Auditor

Paid x402 demo endpoint for the Global x402 Challenge. The protected route charges
`$0.01` over Algorand/USDC and returns a deterministic code-audit response from a
small local rule engine.

## What This Is

- A local Node/Express service using `@x402/express` and `@x402/avm`.
- A payment-protected `POST /api/audit` route.
- A challenge-tagged payment requirement: `x402-global-challenge`.
- A safe client helper that can first inspect the 402 challenge and then, only with
  an explicit runtime key, submit a paid request.

## What This Is Not

- It is not a custodial wallet.
- It does not store private keys or mnemonics.
- It does not prove challenge eligibility until a real on-chain payment is settled
  through the facilitator and visible in the challenge tooling.

## Configure a Controlled Receiving Address

Use an Algorand address you control in Pera, Defly, or another wallet. The receiving
wallet must be able to receive the configured USDC ASA. Do not use the old generated
scratch address unless you separately saved its signing secret.

```powershell
Set-Location -LiteralPath "C:\Users\Josh\.gemini\antigravity\scratch\x402-algorand-service"
npm run configure:wallet -- --address YOUR_CONTROLLED_ALGORAND_ADDRESS
```

Then edit `.env`:

- `PUBLIC_BASE_URL` should be your HTTPS tunnel URL when submitting.
- `ALGORAND_PAYTO_ADDRESS` must be the public address you control.
- Leave wallet mnemonics/private keys out of `.env`.

## Run Locally

```powershell
npm run build
npm start
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4021/api/health"
```

Probe the protected route without paying:

```powershell
npm run payment:probe
```

That command should receive a 402 challenge and verify:

- `extra.tag` is `x402-global-challenge`
- network is Algorand mainnet CAIP-2
- receiver is your configured address
- ASA metadata points to mainnet USDC `31566704`

## Wallet Setup: Two Separate Roles

To avoid risking or exposing your main wallet keys in terminal sessions:
1. **Receiver (Defly / Pera)**: `ALGORAND_PAYTO_ADDRESS` in `.env` — this is your "cash register". It receives the $0.01 USDC. It must be opted into USDC ASA `31566704` in your wallet app.
2. **Throwaway Payer (CLI)**: A disposable temporary account generated purely to execute the test payment. You fund it with ~0.2 ALGO and ~0.05 USDC from Defly, test the payment, and discard or sweep it.

### Generate Disposable Payer & Opt-In

```powershell
# 1. Generate disposable payer (outputs PAYER_ADDRESS and AVM_PRIVATE_KEY_BASE64 to terminal ONLY)
npm run payer:generate

# 2. In Defly, send ~0.2 ALGO to PAYER_ADDRESS

# 3. Submit USDC opt-in on-chain for the payer:
$env:AVM_PRIVATE_KEY_BASE64="<from generate output>"
npm run payer:optin-usdc

# 4. In Defly, send ~0.05 USDC to PAYER_ADDRESS
```

## Live Payment Test

Once the receiving wallet (Defly) and payer wallet are both opted into USDC, and your service is running behind an HTTPS tunnel:

```powershell
$env:SERVICE_URL="https://your-public-tunnel-url"
$env:AVM_PRIVATE_KEY_BASE64="<payer private key>"
npm run payment:live
```

The live client prints a verified settlement receipt with transaction metadata. Preserve this output for your challenge submission.
