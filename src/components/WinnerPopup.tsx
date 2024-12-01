import React from 'react';
import Image from 'next/image';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import confetti from 'canvas-confetti';

interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  winnerMessage: string;
  doorNumber: number;
  sponsor?: string;
}

interface WinnerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isWinner: boolean;
  prize: Prize | null;
  alreadyClaimed: boolean;
}

const X_MSG = 'Please share your win ❤️';

export default function WinnerPopup({ isOpen, onClose, isWinner, prize, alreadyClaimed }: WinnerPopupProps) {
  React.useEffect(() => {
    if (isOpen && isWinner && !alreadyClaimed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen, isWinner, alreadyClaimed]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden text-left align-middle transition-all bg-slate-950 shadow-2xl rounded-2xl">
                {isWinner ? (
                  <div className="flex flex-col h-[600px]">
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 text-white/60 hover:text-white z-10 p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="relative w-full aspect-[16/9] flex-none">
                      <Image
                        src={`/images/adventcalendar-prizes/${prize?.doorNumber?.toString().padStart(2, '0') || '00'}-prize.png`}
                        alt={prize?.name || 'Prize'}
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between">
                      <div></div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-2xl font-bold leading-6 text-white text-center mb-6"
                        >
                          {alreadyClaimed ? "Already Claimed!" : "Congratulations! 🎉"}
                        </Dialog.Title>
                        {prize && (
                          <div className="mt-4">
                            <p className="text-white text-center mb-4 text-lg leading-relaxed">
                              {prize.winnerMessage}
                            </p>
                            <div className="text-slate-400 text-center text-sm">
                              You can pick up your prize at the next Co-working Friday!<br/>
                              If you don't live in Berlin, please contact Carlo.
                            </div>
                          </div>
                        )}
                      </div>
                      {isWinner && !alreadyClaimed && (
                        <div className="flex flex-col items-center">
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                              `🎉 Just won a ${prize?.name} from the @SuperteamDE advent calendar!${
                                prize?.sponsor ? ` Huge thanks to our amazing sponsor ${prize.sponsor} for making this incredible prize possible!` : ''
                              }`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='bg-white shadow-2xl backdrop-blur-xl tracking-wide text-black px-6 py-3 rounded-md font-bold cursor-pointer flex items-center gap-2 hover:bg-slate-200 transition-colors'
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            {X_MSG}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 relative">
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 text-white/60 hover:text-white z-10 p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <Dialog.Title
                      as="h3"
                      className="text-2xl font-bold leading-6 text-white text-center m-4"
                    >
                      Not a Winner Today
                    </Dialog.Title>
                    <p className="text-white text-center p-4">
                      Better luck next time! Come back tomorrow for another chance to win.
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 