import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletConnect() {
  const { connected } = useWallet();
  
  return (
    <div>
      <WalletMultiButton />
      {connected && <p>Connected!</p>}
    </div>
  );
} 