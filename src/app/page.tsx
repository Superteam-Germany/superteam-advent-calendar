'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/Spinner';
import { motion } from 'framer-motion';
import { useScroll, useTransform } from 'framer-motion';
import { BlurredCard } from '@/components/blurred-card';
import Doors from './sections/doors';
const doors = [7, 19, 3, 9, 11, 22, 5, 12, 8, 1, 16, 14, 20, 17, 24, 18, 23, 15, 13, 2, 4, 6, 21, 10];

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [minting, setMinting] = useState(false);
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['-40%', '-0%']);

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
      <motion.div
        style={{ backgroundSize: 'cover', y }}
        className="bg-[url('/images/backgrounds/line-wave-4-primary.svg')] -z-20 bg-50% bg-no-repeat w-full absolute h-[300vh]">
      </motion.div>
      
      <div className="-mt-40 md:-mt-[40vh] relative">
        <Image 
          src="/images/Sol-Santa.png" 
          alt="Sol-Santa" 
          width={1000} 
          height={1000}
          priority
        />
        <h1 className="absolute bottom-[20%] left-1/2 -translate-x-1/2 text-4xl font-bold text-center text-white drop-shadow-lg max-w-2xl">
          Santa is running on Solana this year!
        </h1>
      </div>
      <div className="z-10 w-full max-w-5xl -mt-24">
        <BlurredCard>
          <h2 className="text-2xl font-bold text-center m-4 mt-12">Mint todays door and win!</h2>
          <p className="text-center text-sm text-gray-500 mb-12">
            You have to use the same wallet you used to mint your Superteam Germany Membership NFT.
          </p>
          <Doors />
      </BlurredCard>
      </div>
    </main>
  );
}
