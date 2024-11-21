'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import Image from 'next/image';

const doors = [7, 19, 3, 9, 11, 22, 5, 12, 8, 1, 16, 14, 20, 17, 24, 18, 23, 15, 13, 2, 4, 6, 21, 10];

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null);

  const handleMint = async (doorNumber: number) => {
    if (!connected || !publicKey) {
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
        body: JSON.stringify({ 
          doorNumber,
          publicKey: publicKey.toBase58() 
        }),
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
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="z-10 w-full max-w-5xl">
        <div className="flex justify-end mb-8">
          <WalletMultiButton />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {doors.map((doorNumber) => (
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
                transition-all
                overflow-hidden
                ${minting && selectedDoor === doorNumber
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
                }
                ${!connected ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Image
                src={`/images/door${doorNumber.toString().padStart(2, '0')}.png`}
                alt={`Door ${doorNumber}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
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
