'use client';
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/Spinner';
import { motion } from 'framer-motion';
import { useScroll, useTransform } from 'framer-motion';
import { BlurredCard } from '@/components/blurred-card';
import Doors from './sections/doors';
import { ComingSoonMessage } from '@/components/ComingSoonMessage';
import Sponsors from './sections/sponsors';

export default function Home() {
  const { connected, publicKey, signMessage } = useWallet();
  const [minting, setMinting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['-40%', '-0%']);

  useEffect(() => {
    if (publicKey) {
      checkRegistration();
    }
  }, [publicKey]);

  const checkRegistration = async () => {
    try {
      const response = await fetch(`/api/check-registration?wallet=${publicKey?.toBase58()}`);
      const data = await response.json();
      setIsRegistered(data.isRegistered);
    } catch (err) {
      console.error('Failed to check registration:', err);
    }
  };

  const handleRegister = async () => {
    if (!connected || !publicKey || !signMessage) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setMinting(true);
      
      // Create message to sign
      const message = `Register for Superteam Germany Advent Calendar`;
      const encodedMessage = new TextEncoder().encode(message);
      
      // Request signature using wallet adapter's signMessage
      let signature;
      try {
        signature = await signMessage(encodedMessage);
      } catch (signError) {
        toast.error('Please sign the message to verify your wallet ownership');
        return;
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          publicKey: publicKey.toBase58(),
          message,
          signature: Buffer.from(signature).toString('base64')
        }),
      });

      if (response.status === 403) {
        toast.error('Please use the same wallet you used to mint your Superteam Germany Membership NFT.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to register');
      }

      toast.success('Successfully registered for the advent calendar!');
      setIsRegistered(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setMinting(false);
    }
  };

  const isBeforeDecFirst = () => {
    const now = new Date();
    const decFirst = new Date('2024-12-01T00:00:00Z'); // UTC time
    return now < decFirst;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <Toaster position="top-center" />
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
          {!isRegistered ? (
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Register for the Advent Calendar</h2>
              <p className="text-gray-500 mb-8">
                Mint your registration NFT to participate in all daily raffles!
              </p>
              <button
                onClick={handleRegister}
                disabled={minting || !connected}
                className={`bg-gradient-to-r from-[#9945FF] to-[#14F195] shadow-2xl backdrop-blur-xl tracking-wide text-primary-foreground px-6 py-3 rounded-md font-bold cursor-pointer ${
                  !connected ? 'opacity-50' : 'hover:saturate-[1.5]'
                }`}
              >
                {minting ? <Spinner /> : 'Register Now'}
              </button>
            </div>
          ) : (
            <>
              {isBeforeDecFirst() ? (
                <ComingSoonMessage />
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-center m-4 mt-12">Open today's door to see if you won!</h2>
                  <p className="text-center text-sm text-gray-500 mb-12">
                    You're registered for all daily raffles. Open doors to reveal your prizes!
                  </p>
                  <Doors isRegistered={isRegistered} />
                </>
              )}
              {/* <Sponsors /> */}
            </>
          )}
        </BlurredCard>
      </div>
    </main>
  );
}