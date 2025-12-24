import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div className="brand-mark">GS</div>
            <div>
              <h1 className="header-title">Ghost Stake</h1>
              <p className="header-subtitle">Encrypted staking for mETH and mZama</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
