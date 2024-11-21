'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/Spinner';

const doors = [7, 19, 3, 9, 11, 22, 5, 12, 8, 1, 16, 14, 20, 17, 24, 18, 23, 15, 13, 2, 4, 6, 21, 10];

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [minting, setMinting] = useState(false);
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null);

  const handleMint = async (doorNumber: number) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setMinting(true);
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

      await response.json();
      toast.success(`Successfully minted Door #${doorNumber}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setMinting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#333',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#333',
            },
          },
        }}
      />
      
      {minting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-xl">
            <Spinner />
            <div className="text-white text-sm mt-2 text-center">
              Minting Door #{selectedDoor}
            </div>
          </div>
        </div>
      )}
      
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
                ${minting ? 'cursor-not-allowed' : 'hover:scale-105'}
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
      </div>
    </main>
  );
}
