# Ghost Stake

Ghost Stake is a confidential staking dApp built on Zama FHEVM. It introduces two encrypted ERC7984 tokens (mETH and
mZama) and a staking contract that keeps balances private on-chain while still allowing users to claim, stake, withdraw,
and decrypt their positions on demand.

This project focuses on end-to-end privacy for staking: amounts are encrypted as `euint64` values, balances are stored as
confidential handles, and only the wallet owner can decrypt them through the Zama relayer flow.

## Table of Contents

- Overview
- Problem Statement
- Solution and Features
- Advantages
- User Flows
- Architecture
- Tech Stack
- Project Structure
- Setup and Usage
- Operational Notes
- Limitations and Security
- Future Roadmap
- License

## Overview

Ghost Stake provides a privacy-first staking experience for two synthetic assets:

- mETH: a confidential ERC7984 token representing synthetic Ether.
- mZama: a confidential ERC7984 token representing a Zama-native staking asset.

Users can claim tokens, stake them via confidential transfers, and withdraw at any time. Balances are encrypted on-chain
and only become readable when the user triggers a decryption request from the front end.

## Problem Statement

Traditional staking systems expose user balances and positions in plaintext. Even when token symbols change, wallet
activity and holdings remain public, which is undesirable for:

- Institutions that must protect treasury strategies.
- Users who do not want portfolio sizes or staking behavior visible.
- Teams experimenting with confidential financial primitives without compromising on-chain verifiability.

Ghost Stake solves this by keeping balances encrypted while preserving on-chain settlement and user-controlled
decryption.

## Solution and Features

- Confidential claim flow for mETH and mZama using encrypted minting.
- Encrypted wallet balances and encrypted staked balances using ERC7984 handles.
- Confidential staking via `confidentialTransferAndCall` to the staking contract.
- Encrypted withdrawals using Zama external inputs and proofs.
- On-demand decryption of wallet and staked balances from the UI.
- No local storage, no mock data, no off-chain balance cache.

## Advantages

- Privacy by default: balances and staking positions are encrypted on-chain.
- User-controlled decryption: only the wallet owner can decrypt balances.
- Simple, auditable contracts: no hidden off-chain logic for balances.
- Read/write separation: viem reads for encrypted handles, ethers for transactions.
- Front end is deterministic: all state comes from contracts and the relayer.

## User Flows

1. Claim
   - Enter a whole number to mint mETH or mZama.
   - The contract converts the amount to an encrypted value and mints it.
2. Stake
   - The UI encrypts the amount via the relayer SDK.
   - The token performs `confidentialTransferAndCall` into the staking contract.
3. Withdraw
   - The UI encrypts the requested amount.
   - The staking contract validates and transfers encrypted tokens back to the user.
4. Decrypt
   - The UI generates a keypair and signs an EIP-712 request.
   - The relayer returns decrypted values for the requested handles.
   - The UI displays the plaintext amounts and lets the user hide them.

## Architecture

### Smart Contracts

- `contracts/ConfidentialMETH.sol`
  - ERC7984 confidential token for mETH.
  - `claim(uint64 amount)` mints encrypted balances.
- `contracts/ConfidentialMZama.sol`
  - ERC7984 confidential token for mZama.
  - Same `claim(uint64 amount)` flow as mETH.
- `contracts/ConfidentialStaking.sol`
  - Accepts confidential transfers from supported tokens.
  - Tracks encrypted staked balances per token and staker.
  - `confidentialStakedBalance(address token, address staker)` returns an encrypted handle.
  - `withdraw(address token, externalEuint64 amount, bytes inputProof)` withdraws encrypted amounts.

### Frontend

- `frontend/src/components/StakeApp.tsx` orchestrates the experience.
- `frontend/src/components/AssetCard.tsx` handles claim, stake, withdraw, and decrypt actions.
- Reads:
  - `confidentialBalanceOf` from token contracts.
  - `confidentialStakedBalance` from the staking contract.
- Writes:
  - `claim`, `confidentialTransferAndCall`, and `withdraw` via ethers.
- Encryption and decryption:
  - `@zama-fhe/relayer-sdk` creates encrypted inputs and handles user decryption.

### Encryption and Decryption Flow

- Minting: plaintext amount is encrypted inside the token contract.
- Staking/withdrawing: encrypted inputs and proofs are generated in the UI and verified on-chain.
- Decryption: the user signs an EIP-712 request; the relayer returns decrypted values for the selected handles.

## Tech Stack

- Solidity 0.8.27
- Hardhat + hardhat-deploy
- Zama FHEVM and OpenZeppelin confidential contracts (ERC7984)
- TypeScript
- React + Vite
- wagmi + RainbowKit for wallet connection
- viem for read-only contract calls
- ethers for state-changing transactions
- @zama-fhe/relayer-sdk for encryption and decryption

## Project Structure

```
contracts/            Confidential token and staking contracts
deploy/               Hardhat deploy scripts
deployments/          Deployment artifacts and ABI files
docs/                 Project and Zama references
frontend/             React + Vite front end
tasks/                Hardhat tasks
test/                 Test suites (template tests included)
```

## Setup and Usage

### Prerequisites

- Node.js 20+
- npm
- A Sepolia-funded wallet for deployment and testing

### Install Dependencies

From the repository root:

```bash
npm install
```

Then install front end dependencies:

```bash
cd frontend
npm install
```

### Compile and Test Contracts

From the repository root:

```bash
npm run compile
npm run test
```

Note: the current test suite includes the template FHECounter tests. Expand tests for the staking flow as needed.

### Deploy to a Local Node

Start a local node:

```bash
npx hardhat node
```

Deploy to the local node (uses the `anvil` network configuration):

```bash
npx hardhat deploy --network anvil
```

### Deploy to Sepolia

Create a `.env` file in the repository root and set:

```
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=0xyour_private_key
ETHERSCAN_API_KEY=optional_for_verification
```

Deploy:

```bash
npx hardhat deploy --network sepolia
```

Deployment artifacts and ABIs are written to `deployments/sepolia`.

### Update Frontend Contract Data

After deploying to Sepolia:

- Copy the contract addresses into `frontend/src/config/contracts.ts`.
- Replace the ABI arrays in `frontend/src/config/contracts.ts` with the ABIs from:
  - `deployments/sepolia/ConfidentialMETH.json`
  - `deployments/sepolia/ConfidentialMZama.json`
  - `deployments/sepolia/ConfidentialStaking.json`

The frontend does not use environment variables, so addresses and ABIs are hard-coded in the config file.

### Run the Frontend

From `frontend/`:

```bash
npm run dev
```

Connect a wallet to Sepolia and use the app to claim, stake, withdraw, and decrypt balances.

## Operational Notes

- The UI targets Sepolia by design; it does not connect to local chain IDs.
- If contract addresses are zeroed in `frontend/src/config/contracts.ts`, assets are disabled.
- Decryption requires a working Zama relayer connection; errors are surfaced in the UI.

## Limitations and Security

- There are no staking rewards or yield mechanics; it is a confidential custody flow.
- The contracts do not include admin controls, pausing, or upgrade hooks.
- Amounts are encrypted, but transaction metadata (addresses, timing, gas usage) is still visible.
- This project is not audited; use it for testing and research purposes.

## Future Roadmap

- Add confidential reward distribution and APY logic.
- Expand to additional confidential assets and pools.
- Add position history and analytics without revealing balances.
- Improve UX with richer transaction status and error recovery.
- Add comprehensive tests for staking and decryption flows.
- Pursue formal audits and security reviews.

## License

BSD-3-Clause-Clear. See `LICENSE`.
