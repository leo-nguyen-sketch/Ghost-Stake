import { useMemo, useState, type CSSProperties } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import type { Address } from 'viem';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { STAKING_ABI, STAKING_ADDRESS, TOKEN_ABI } from '../config/contracts';
import '../styles/AssetCard.css';

const ZERO_HANDLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type Asset = {
  key: string;
  name: string;
  symbol: string;
  address: Address;
  accent: string;
  accentSoft: string;
  description: string;
};

type AssetCardProps = {
  asset: Asset;
  delay: number;
};

const isZeroHandle = (handle?: string) =>
  !handle || handle.toLowerCase() === ZERO_HANDLE;

const formatHandle = (handle?: string) => {
  if (!handle) return '--';
  return `${handle.slice(0, 10)}...${handle.slice(-6)}`;
};

export function AssetCard({ asset, delay }: AssetCardProps) {
  const { address } = useAccount();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [claimAmount, setClaimAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedWallet, setDecryptedWallet] = useState<string | null>(null);
  const [decryptedStaked, setDecryptedStaked] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isConfigured = asset.address !== ZERO_ADDRESS && STAKING_ADDRESS !== ZERO_ADDRESS;

  const { data: encryptedBalance } = useReadContract({
    address: asset.address,
    abi: TOKEN_ABI,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: encryptedStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'confidentialStakedBalance',
    args: address ? [asset.address, address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const walletHandle = encryptedBalance as string | undefined;
  const stakedHandle = encryptedStaked as string | undefined;

  const formattedWalletHandle = useMemo(
    () => (isZeroHandle(walletHandle) ? 'Encrypted: 0' : `Encrypted: ${formatHandle(walletHandle)}`),
    [walletHandle],
  );
  const formattedStakedHandle = useMemo(
    () => (isZeroHandle(stakedHandle) ? 'Encrypted: 0' : `Encrypted: ${formatHandle(stakedHandle)}`),
    [stakedHandle],
  );

  const parseAmount = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return null;
    }
    return parsed;
  };

  const resetStatusSoon = () => {
    window.setTimeout(() => setStatusMessage(null), 3500);
  };

  const ensureSigner = async () => {
    if (!signerPromise) {
      throw new Error('Wallet not connected');
    }
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    return signer;
  };

  const encryptAmount = async (contractAddress: Address, amount: number) => {
    if (!instance || !address) {
      throw new Error('Encryption service not ready');
    }
    const input = instance.createEncryptedInput(contractAddress, address);
    input.add64(amount);
    return await input.encrypt();
  };

  const handleClaim = async () => {
    const amount = parseAmount(claimAmount);
    if (!amount) {
      setStatusMessage('Enter a whole number to claim.');
      resetStatusSoon();
      return;
    }

    setIsClaiming(true);
    setStatusMessage('Submitting claim...');
    try {
      const signer = await ensureSigner();
      const token = new Contract(asset.address, TOKEN_ABI, signer);
      const tx = await token.claim(amount);
      await tx.wait();
      setClaimAmount('');
      setStatusMessage('Claim confirmed on-chain.');
    } catch (error) {
      console.error('Claim failed:', error);
      setStatusMessage('Claim failed. Check wallet connection.');
    } finally {
      setIsClaiming(false);
      resetStatusSoon();
    }
  };

  const handleStake = async () => {
    const amount = parseAmount(stakeAmount);
    if (!amount) {
      setStatusMessage('Enter a whole number to stake.');
      resetStatusSoon();
      return;
    }
    if (!instance || !address) {
      setStatusMessage('Encryption service is still loading.');
      resetStatusSoon();
      return;
    }

    setIsStaking(true);
    setStatusMessage('Encrypting stake amount...');
    try {
      const encryptedInput = await encryptAmount(asset.address, amount);
      const signer = await ensureSigner();
      const token = new Contract(asset.address, TOKEN_ABI, signer);
      const tx = await token.confidentialTransferAndCall(
        STAKING_ADDRESS,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        '0x',
      );
      await tx.wait();
      setStakeAmount('');
      setStatusMessage('Stake confirmed on-chain.');
    } catch (error) {
      console.error('Stake failed:', error);
      setStatusMessage('Stake failed. Check balance and wallet.');
    } finally {
      setIsStaking(false);
      resetStatusSoon();
    }
  };

  const handleWithdraw = async () => {
    const amount = parseAmount(withdrawAmount);
    if (!amount) {
      setStatusMessage('Enter a whole number to withdraw.');
      resetStatusSoon();
      return;
    }
    if (!instance || !address) {
      setStatusMessage('Encryption service is still loading.');
      resetStatusSoon();
      return;
    }

    setIsWithdrawing(true);
    setStatusMessage('Encrypting withdrawal amount...');
    try {
      const encryptedInput = await encryptAmount(STAKING_ADDRESS, amount);
      const signer = await ensureSigner();
      const stakingContract = new Contract(STAKING_ADDRESS, STAKING_ABI, signer);
      const tx = await stakingContract.withdraw(
        asset.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
      );
      await tx.wait();
      setWithdrawAmount('');
      setStatusMessage('Withdrawal confirmed on-chain.');
    } catch (error) {
      console.error('Withdraw failed:', error);
      setStatusMessage('Withdrawal failed. Check staked balance.');
    } finally {
      setIsWithdrawing(false);
      resetStatusSoon();
    }
  };

  const handleDecrypt = async () => {
    if (!instance || !address) {
      setStatusMessage('Connect wallet to decrypt balances.');
      resetStatusSoon();
      return;
    }

    if (isZeroHandle(walletHandle) && isZeroHandle(stakedHandle)) {
      setDecryptedWallet('0');
      setDecryptedStaked('0');
      return;
    }

    setIsDecrypting(true);
    setStatusMessage('Preparing decryption...');
    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [];

      if (!isZeroHandle(walletHandle)) {
        handleContractPairs.push({ handle: walletHandle, contractAddress: asset.address });
      }
      if (!isZeroHandle(stakedHandle)) {
        handleContractPairs.push({ handle: stakedHandle, contractAddress: STAKING_ADDRESS });
      }

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [asset.address, STAKING_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const signer = await ensureSigner();
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      setDecryptedWallet(
        isZeroHandle(walletHandle) ? '0' : (result[walletHandle as string] || '0'),
      );
      setDecryptedStaked(
        isZeroHandle(stakedHandle) ? '0' : (result[stakedHandle as string] || '0'),
      );
      setStatusMessage('Decryption complete.');
    } catch (error) {
      console.error('Decrypt failed:', error);
      setStatusMessage('Decryption failed. Try again.');
    } finally {
      setIsDecrypting(false);
      resetStatusSoon();
    }
  };

  const actionDisabled = !address || zamaLoading || !isConfigured;

  return (
    <article
      className="asset-card"
      style={
        {
          '--accent': asset.accent,
          '--accent-soft': asset.accentSoft,
          '--delay': `${delay}ms`,
        } as CSSProperties
      }
    >
      <header className="asset-header">
        <div>
          <span className="asset-symbol">{asset.symbol}</span>
          <p className="asset-description">{asset.description}</p>
        </div>
        <span className="asset-pill">Encrypted</span>
      </header>

      <div className="asset-balances">
        <div>
          <p className="balance-label">Wallet balance</p>
          <p className="balance-handle">{formattedWalletHandle}</p>
          <p className="balance-decrypted">
            {decryptedWallet ? `${decryptedWallet} ${asset.symbol}` : 'Decrypt to reveal'}
          </p>
        </div>
        <div>
          <p className="balance-label">Staked balance</p>
          <p className="balance-handle">{formattedStakedHandle}</p>
          <p className="balance-decrypted">
            {decryptedStaked ? `${decryptedStaked} ${asset.symbol}` : 'Decrypt to reveal'}
          </p>
        </div>
      </div>

      <div className="asset-actions">
        <div className="action-group">
          <label htmlFor={`${asset.key}-claim`}>Claim {asset.symbol}</label>
          <div className="action-row">
            <input
              id={`${asset.key}-claim`}
              type="number"
              min="1"
              step="1"
              value={claimAmount}
              onChange={(event) => setClaimAmount(event.target.value)}
              placeholder="Amount"
            />
            <button
              type="button"
              onClick={handleClaim}
              disabled={actionDisabled || isClaiming}
            >
              {isClaiming ? 'Claiming...' : 'Claim'}
            </button>
          </div>
        </div>

        <div className="action-group">
          <label htmlFor={`${asset.key}-stake`}>Stake</label>
          <div className="action-row">
            <input
              id={`${asset.key}-stake`}
              type="number"
              min="1"
              step="1"
              value={stakeAmount}
              onChange={(event) => setStakeAmount(event.target.value)}
              placeholder="Amount"
            />
            <button
              type="button"
              onClick={handleStake}
              disabled={actionDisabled || isStaking}
            >
              {isStaking ? 'Staking...' : 'Stake'}
            </button>
          </div>
        </div>

        <div className="action-group">
          <label htmlFor={`${asset.key}-withdraw`}>Withdraw</label>
          <div className="action-row">
            <input
              id={`${asset.key}-withdraw`}
              type="number"
              min="1"
              step="1"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="Amount"
            />
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={actionDisabled || isWithdrawing}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>

      <div className="asset-footer">
        <button
          type="button"
          className="decrypt-button"
          onClick={handleDecrypt}
          disabled={actionDisabled || isDecrypting}
        >
          {isDecrypting ? 'Decrypting...' : 'Decrypt balances'}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            setDecryptedWallet(null);
            setDecryptedStaked(null);
          }}
          disabled={actionDisabled}
        >
          Hide decrypted
        </button>
      </div>

      {!isConfigured ? (
        <p className="status-message">Set contract addresses to activate this asset.</p>
      ) : statusMessage ? (
        <p className="status-message">{statusMessage}</p>
      ) : null}
    </article>
  );
}
