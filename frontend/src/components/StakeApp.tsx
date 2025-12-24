import { useAccount } from 'wagmi';
import { Header } from './Header';
import { AssetCard } from './AssetCard';
import { METH_ADDRESS, MZAMA_ADDRESS } from '../config/contracts';
import '../styles/StakeApp.css';

const assets = [
  {
    key: 'meth',
    name: 'mETH',
    symbol: 'mETH',
    address: METH_ADDRESS,
    accent: '#22d3ee',
    accentSoft: '#0ea5e9',
    description: 'Synthetic Ether with encrypted balances.'
  },
  {
    key: 'mzama',
    name: 'mZama',
    symbol: 'mZama',
    address: MZAMA_ADDRESS,
    accent: '#fbbf24',
    accentSoft: '#f97316',
    description: 'Confidential Zama-native staking asset.'
  }
];

export function StakeApp() {
  const { address, isConnected } = useAccount();
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="stake-app">
      <div className="ambient-glow" />
      <Header />
      <main className="stake-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">Confidential staking</span>
            <h2 className="hero-title">Stake without revealing balances.</h2>
            <p className="hero-description">
              Claim mETH or mZama, stake instantly, and decrypt your balances only when you want to see them.
            </p>
            <div className="hero-meta">
              <span className="hero-pill">
                {isConnected ? `Connected: ${shortAddress}` : 'Connect wallet to begin'}
              </span>
              <span className="hero-pill">Sepolia network</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-header">How it works</div>
            <ol className="hero-steps">
              <li>Claim encrypted mETH or mZama.</li>
              <li>Stake via confidential transfer and call.</li>
              <li>Withdraw anytime, decrypt balances on demand.</li>
            </ol>
          </div>
        </section>

        <section className="asset-grid">
          {assets.map((asset, index) => (
            <AssetCard key={asset.key} asset={asset} delay={index * 140} />
          ))}
        </section>

        <section className="info-panel">
          <div>
            <h3>Encrypted by default</h3>
            <p>
              Token balances and staked positions are encrypted on-chain. Only you can decrypt them using Zama's
              relayer flow and your wallet signature.
            </p>
          </div>
          <div>
            <h3>Direct on-chain actions</h3>
            <p>
              Claims, stakes, and withdrawals are executed directly from your wallet using ethers for writes and
              viem reads.
            </p>
          </div>
          <div>
            <h3>No local storage</h3>
            <p>
              The app does not use local storage or mock data. Everything shown comes from encrypted contracts on
              Sepolia.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
