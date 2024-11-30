"use client";
import Image from "next/image";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Nav = () => {

  return (
    <>
      <div className="container items-center mx-auto py-5 flex justify-between xl:px-0 relative z-50">
        <Link href="/" className="ml-2 hover:opacity-100">
          <Image
            src={"/images/stLogoWithIcon.svg"}
            height={35}
            width={160}
            alt="Superteam logo"
          />
        </Link>
        
        <div className="block lg:hidden">
          <WalletMultiButton />
        </div>

        <ul
          className={`sm:flex bg-background hidden  sm:relative sm:w-auto sm:space-x-10 items-center`}
        >
          <WalletMultiButton />
        </ul>
      </div>
    </>
  );
};

export default Nav;

