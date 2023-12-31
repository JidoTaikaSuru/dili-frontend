import React, { useContext, useEffect, useRef, useState } from "react";
// import * as supabase from '@supabase/supabase-js'
import { SupabaseContext } from "../contexts/SupabaseContext";
import {
  startup,
  createNewWallet,
  decryptWithDeviceKey,
  decryptWithPin,
} from "../library/embedded_wallet";
import { User } from "@supabase/supabase-js";
import { AiOutlineClose } from "react-icons/ai";
import { useWallet } from "../hooks/useWallet";

interface ILoginWithEmail {
  setIsOpen: (val: boolean) => void;
  isOpen: boolean;
  user: User | null;
  setUser: (val: User | null) => void;
}

const LoginWithEmail: React.FC<ILoginWithEmail> = ({
  setIsOpen,
  isOpen,
  user,
  setUser,
}) => {
  const { setLocalAccount } = useWallet();
  const supabase = useContext(SupabaseContext);
  const formRef = useRef<HTMLDivElement | null>(null);
  const { setIsSignedIn } = useWallet();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    pin: "",
  });

  const login = async () => {
    if (!supabase) {
      startup();
    }
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    const privateKey = decryptWithPin(
      formData.pin,
      user!.user_metadata.pin_salt,
      user!.user_metadata.pin_encrypted_private_key
    );
    setLocalAccount(privateKey);
    setIsOpen(false);
    setIsSignedIn(true);
    setUser(user);
  };

  const signUp = async () => {
    const signupdata = createNewWallet(formData.pin);
    console.log(
      "🚀 ~ file: LoginWithEmail.tsx:30 ~ signUp ~ signupdata:",
      signupdata
    );
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: signupdata,
      },
    });
    const privateKey = decryptWithDeviceKey(
      localStorage.getItem("deviceprivatekey")!,
      signupdata!.device_encrypted_private_key
    );

    setLocalAccount(privateKey);
    console.log("🚀 ~ file: LoginWithEmail.tsx:51 ~ signUp ~ data:", data);
    setIsOpen(false);
    setIsSignedIn(true);
    setUser(data.user);
  };

  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data: { user } }) => {
  //     if (user) {
  //       console.log("user", user);
  //       const exampleData = decryptWithDeviceKey(
  //         user!.user_metadata.device_encrypted_private_key,
  //         localStorage.getItem("deviceprivatekey")!
  //       );
  //       setDeviceKey(localStorage.getItem("deviceprivatekey") ?? "");
  //       console.log(
  //         "🚀 ~ file: LoginWithEmail.tsx:30 ~ login ~ exampleData:",
  //         exampleData
  //       );
  //       setIsSignedIn(true);

  //       setUser(user!);
  //     } else {
  //       // alert("Error Accessing User");
  //     }
  //   });
  // }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clickedElement = e.target as HTMLElement;
    const clickedElementId = clickedElement.id;
    if (clickedElementId === "login") {
      await login();
    } else {
      await signUp();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    function handleEvent(event: MouseEvent) {
      const clickedElement = event.target as HTMLElement;
      const clickedElementId = clickedElement.id;
      console.log(
        "🚀 ~ file: LoginWithEmail.tsx:122 ~ handleEvent ~ clickedElementId:",
        clickedElementId
      );

      if (clickedElementId === "bg") {
        closeModal();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleEvent);
    } else {
      document.removeEventListener("mousedown", handleEvent);
    }

    return () => {
      document.removeEventListener("mousedown", handleEvent);
    };
  }, [isOpen, formRef]);

  return (
    <div
      id="bg"
      ref={formRef}
      className="fixed inset-0 flex bg-gray-200 bg-opacity-80 items-center justify-center z-10 divide-y divide-gray-200"
    >
      {/* <form
        id="form"
        className="py-16 relative border-2 bg-gradient-to-r from-gray-700/30 via-gray-900/30 to-black/30 bg-opacity-40 backdrop-blur-3xl  px-20 rounded-lg text-base leading-6 space-y-4  text-gray-700 sm:text-lg sm:leading-7"
      >
        <AiOutlineClose
          className="absolute left-8 top-8 cursor-pointer"
          onClick={closeModal}
        />

        <div className="relative mb-3">
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            E-mail
          </label>
          <input
            autoComplete="off"
            type="text"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="bg-gray-50 border focus:outline-none border-gray-300 text-gray-900 text-sm rounded-lg   block w-full p-2.5  dark:border-gray-600  placeholder:tracking-tight"
            placeholder="vitalik@eth.com"
            required
          />
        </div>
        <div className="relative mb-3">
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="bg-gray-50 border focus:outline-none border-gray-300 text-gray-900 text-sm rounded-lg   block w-full p-2.5  dark:border-gray-600  placeholder:tracking-tight  "
            required
          />
        </div>
        <div className="relative ">
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Pin
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            placeholder=""
            value={formData.pin}
            onChange={handleChange}
            className="bg-gray-50 border focus:outline-none border-gray-300 text-gray-900 text-sm rounded-lg   block w-full p-2.5  dark:border-gray-600  placeholder:tracking-tight  "
            required
          />
        </div>

        <div className="flex gap-4 pt-4 justify-center ">
          <button
            type="submit"
            id="signup"
            onClick={handleSubmit}
            className="bg-[#0e76fd] hover:scale-105 transition duration-200 text-white rounded-md px-4 tracking-tighter text-lg py-1"
          >
            Sign Up
          </button>
          <button
            type="submit"
            id="login"
            onClick={handleSubmit}
            className="bg-[#0e76fd] hover:scale-105 transition duration-200 text-white rounded-md px-4 tracking-tighter text-lg py-1"
          >
            Login
          </button>
        </div>
      </form> */}
      <form
        id="form"
        className="mx-auto border-2 bg-indigo-600 bg-opacity-40 backdrop-blur-3xl rounded-xl max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold sm:text-3xl text-gray-800">
            Get started!
          </h1>

          <p className="mt-4 text-white">
            Join us in redefining professional connections through our
            decentralized solution, where trust and transparency are the
            cornerstones of your networking experience.
          </p>
        </div>

        <form action="" className="mx-auto mb-0 mt-8 max-w-md space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>

            <div className="relative">
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-200 p-4 pe-12 text-sm shadow-sm"
                placeholder="Enter email"
                required
              />

              <span className="absolute inset-y-0 end-0 grid place-content-center px-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-200 p-4 pe-12 text-sm shadow-sm"
                placeholder="Enter password"
              />

              <span className="absolute inset-y-0 end-0 grid place-content-center px-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="pin" className="sr-only">
              Pin
            </label>

            <div className="relative">
              <input
                type="password"
                id="pin"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-200 p-4 pe-12 text-sm shadow-sm"
                placeholder="Enter pin"
                required
              />

              <span className="absolute inset-y-0 end-0 grid place-content-center px-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="submit"
              id="signup"
              className="inline-block rounded-lg tracking-tight hover:scale-105 transition duration-200 ease-in-out bg-blue-900 px-5 py-3 text-sm font-medium text-white"
              onClick={handleSubmit}
            >
              Sign up
            </button>

            <button
              type="submit"
              id="login"
              onClick={handleSubmit}
              className="inline-block rounded-lg tracking-tight hover:scale-105 transition duration-200 ease-in-out bg-blue-900 px-5 py-3 text-sm font-medium text-white"
            >
              Login
            </button>
          </div>
        </form>
      </form>
    </div>
  );
};
export default LoginWithEmail;
