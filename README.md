# Panta Signal Lens

Panta Signal Lens turns prediction markets into a ranked intelligence feed for researchers, traders, and newsrooms. It combines Panta's market catalog, market detail, and recent trade history into explainable signals for conviction, liquidity, market phase, and directional flow.

## Why it exists

Prediction markets contain useful information, but a long market catalog still leaves the user asking where to look first. Signal Lens ranks attention rather than recommending trades. Every score is visible and reproducible.

## Panta integration

The server-side proxy uses an `X-Api-Key` and calls three Panta product surfaces:

- `GET /markets/` for the ranked catalog
- `GET /markets/{id}/` for a market evidence panel
- `GET /markets/{id}/trades/` for recent YES/NO directional flow
- `GET /categories/` for live filters

Panta is the core data path. Demo fixtures exist only so judges can inspect the full interface before adding a key; the header clearly identifies demo versus live mode.

## Run locally

```bash
copy .env.example .env
# Set PANTA_API_KEY in your shell or load .env with your preferred tool.
npm start
```

PowerShell:

```powershell
$env:PANTA_API_KEY = "pk_test_..."
npm start
```

Open `http://localhost:4173`.

Without a key, the app starts in a labeled demo mode. With a key, the same UI automatically uses the live Panta API.

## Signal method

The 0–100 attention score weights:

- 45% conviction: distance of the YES price from 50/50
- 35% liquidity: logarithmic market volume
- 20% phase quality: secondary markets score above primary and resolved markets

The detail view adds directional flow from recent Panta trades. The score is an explainable attention-ranking tool, not financial advice.

## Verification

```bash
npm test
```

The project uses Node's built-in test runner and has no runtime dependencies.

## Hackathon

Built for the Panta API Sidetrack at Colosseum Crypto World's Fair 2026.

Powered by Panta.

## Public demo

The GitHub Pages build uses the same clearly labeled demo fixture so reviewers can explore the interface without receiving an API credential. Run the Node server with `PANTA_API_KEY` to switch the full experience to live Panta data.
