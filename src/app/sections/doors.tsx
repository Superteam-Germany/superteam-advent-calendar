'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import WinnerPopup from '@/components/WinnerPopup';

const doors = [7, 19, 3, 9, 11, 22, 5, 12, 8, 1, 16, 14, 20, 17, 24, 18, 23, 15, 13, 2, 4, 6, 21, 10];

interface DoorsProps {
  isRegistered: boolean;
}

interface OpenedDoor {
  doorNumber: number;
  isEligibleForRaffle: boolean;
  nftAddress: string;
}

export default function Doors({ isRegistered }: DoorsProps) {
  const { connected, publicKey, signMessage } = useWallet();
  const [checking, setChecking] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [openedDoors, setOpenedDoors] = useState<OpenedDoor[]>([]);
  const [winnerState, setWinnerState] = useState<{
    isWinner: boolean;
    prize: any;
    alreadyClaimed: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchOpenedDoors = async () => {
      if (!publicKey) return;
      
      try {
        const response = await fetch(`/api/opened-doors?wallet=${publicKey.toBase58()}`);
        if (response.ok) {
          const data = await response.json();
          setOpenedDoors(data.openedDoors);
        }
      } catch (error) {
        console.error('Failed to fetch opened doors:', error);
      }
    };

    fetchOpenedDoors();
  }, [publicKey]);

  const handleOpenDoor = async (doorNumber: number) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isRegistered) {
      toast.error('Please register for the advent calendar first');
      return;
    }

    try {
      setChecking(true);

      if (!signMessage) {
        toast.error('Wallet does not support message signing');
        return;
      }

      const message = `Open door ${doorNumber}`;
      const messageBytes = new TextEncoder().encode(message);
      
      const signature = await signMessage(messageBytes);

      const response = await fetch('/api/check-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doorNumber,
          publicKey: publicKey.toBase58(),
          signature: Buffer.from(signature).toString('base64'),
          message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check winner');
      }

      const data = await response.json();
      setWinnerState(data);
      setShowPopup(true);
      setOpenedDoors(prev => [...prev, {
        doorNumber: doorNumber,
        isEligibleForRaffle: data.isWinner,
        nftAddress: data.nftAddress
      }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {doors.map((doorNumber) => (
          <button
            key={doorNumber}
            onClick={() => handleOpenDoor(doorNumber)}
            disabled={checking || !connected || !isRegistered}
            className={`
              aspect-square
              rounded-lg
              flex
              items-center
              justify-center
              transition-all
              overflow-hidden
              relative
              ${checking ? 'cursor-not-allowed' : 'hover:scale-105'}
              ${(!connected || !isRegistered) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {openedDoors.find((door: OpenedDoor) => door.doorNumber === doorNumber)?.nftAddress !== 'opened' ? (
              <Image
                src={`/images/door${doorNumber.toString().padStart(2, '0')}.png`}
                alt={`Door ${doorNumber}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />):
              openedDoors.find((door: OpenedDoor) => door.doorNumber === doorNumber)?.isEligibleForRaffle ? (
                <Image
                  src={`/images/adventcalendar-prizes/${doorNumber.toString().padStart(2, '0')}.png`}
                  alt={`Prize ${doorNumber}`}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white font-bold text-lg drop-shadow-md bg-slate-950 w-full h-full flex flex-col items-center justify-center">
                  <p className="text-4xl">🎄</p>
                  <p>Better luck</p>
                  <p>next time!</p>
                </div>
              )}
          </button>
        ))}
      </div>

      {winnerState && (
        <WinnerPopup
          isOpen={showPopup}
          onClose={() => setShowPopup(false)}
          isWinner={winnerState.isWinner}
          prize={winnerState.prize}
          alreadyClaimed={winnerState.alreadyClaimed}
        />
      )}
    </>
  );
}
