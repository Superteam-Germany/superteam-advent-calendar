'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

export default function Home() {
  const { connected } = useWallet();
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null);

  const handleMint = async (doorNumber: number) => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setMinting(true);
      setError(null);
      setSuccess(false);
      setSelectedDoor(doorNumber);

      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doorNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Minting failed');
      }

      const data = await response.json();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setMinting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="z-10 w-full max-w-5xl">
        <div className="flex justify-end mb-8">
          <WalletMultiButton />
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {Array.from({ length: 24 }, (_, i) => i + 1).map((doorNumber) => (
            <button
              key={doorNumber}
              onClick={() => handleMint(doorNumber)}
              disabled={minting}
              className={`
                aspect-square
                rounded-lg
                flex
                items-center
                justify-center
                text-xl
                font-bold
                transition-all
                ${minting && selectedDoor === doorNumber
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                }
                ${!connected ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {doorNumber}
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-500 text-sm mt-2">
              Successfully minted Door #{selectedDoor}!
            </div>
          )}

          {!connected && (
            <div className="text-yellow-500 text-sm mt-2">
              Connect your wallet to mint
            </div>
          )}

          {minting && (
            <div className="text-blue-500 text-sm mt-2">
              Minting Door #{selectedDoor}...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
