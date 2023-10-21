import { ConnectButton } from "@rainbow-me/rainbowkit";
import React, { useState, useEffect, useContext } from "react";
import LoginWithEmail from "./LoginWithEmail";
import { User } from "@supabase/supabase-js";
import { SupabaseContext } from "../contexts/SupabaseContext";
import { decryptWithDeviceKey } from "../library/embedded_wallet";
import { useAccount, useWalletClient } from "wagmi";
import { useWallet } from "../hooks/useWallet";
import { wipeKeys } from "../utils/XMTPHelpers";
import EmailLoginButton from "./EmailLoginButton";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  // const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [deviceKey, setDeviceKey] = useState("");
  const { isSignedIn, isConnected } = useWallet();
  return (
    <nav className="border-gray-400 border-b-2 mb-4">
      <div className="container">
        <div className="flex justify-between gap-[20px] p-4 ">
          <a href="/" className="flex">
            {/* <img
              src="https://flowbite.com/docs/images/logo.svg"
              className="h-8 mr-3"
              alt="Logo"
            /> */}
            <span className="text-2xl tracking-tighter font-semibold whitespace-nowrap" style={{letterSpacing: "0.25em"}}>
              DILI
            </span>
          </a>
          <div className="flex gap-2 ml-auto">
            {!isSignedIn && (
              <ConnectButton chainStatus={"none"} showBalance={false} />
            )}

            {!isConnected && (
              <EmailLoginButton
                setIsOpen={setIsOpen}
                // isSignedIn={isSignedIn}
                // setIsSignedIn={setIsSignedIn}
                setDeviceKey={setDeviceKey}
                user={user}
                setUser={setUser}
              />
            )}
          </div>
        </div>
      </div>
      {isOpen && (
        <LoginWithEmail
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          // setIsSignedIn={setIsSignedIn}
          user={user}
          setUser={setUser}
        />
      )}
    </nav>
  );
};

export default Navbar;
