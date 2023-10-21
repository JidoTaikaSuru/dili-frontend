import { FC, useContext, useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";

import { SupabaseContext } from "../contexts/SupabaseContext";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../@/components/ui/select";
import { Label } from "../../@/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../@/components/ui/avatar";
import { Card } from "../../@/components/ui/card";
import { Input } from "../../@/components/ui/input";
import "./Search.css";
import { useResumeCache } from "../contexts/FileCacheContext";
import { loadCidIntoCache } from "../cache";
import { Client, useClient } from "@xmtp/react-sdk";
import { ethers } from "ethers";
import axios from "axios";

import { useWallet } from "../hooks/useWallet";
import { useWalletClient } from "wagmi";
import useEthersWalletClient from "../hooks/useEthersWalletClient";
import ConnectionRequest from "./ConnectionRequest";

type FormData = {
  message: string;
  type: string;
};

const getImageUrls = () => {
  const getImageURL = (gender: string, n: number) =>
    `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

  const getImageURLs = (gender: string) => {
    const imageURLs = [];
    for (let i = 1; i <= 100; i++) {
      imageURLs.push(getImageURL(gender, i));
    }
    return imageURLs;
  };

  const womenImageURLs = getImageURLs("women");
  const menImageURLs = getImageURLs("men");
  return [...womenImageURLs, ...menImageURLs];
};

type SearchForm = {
  searchTerm: string;
};

export const clickHandler = (
  to: string,
  walletClient: any,
  client: any,
  formData: FormData
) => {
  console.log("client", client);

  return (event: React.MouseEvent) => {
    constconnectReq(to, walletClient, client, formData);
    event.preventDefault();
  };
};
let clientPreferedEngine = "localhost:3005/api/";

const constconnectReq = async (
  to: string,
  walletClient: any,
  client: any,
  formData: FormData
) => {
  const address = (await walletClient.getAddress()).toString();

  const message =
    "connection_request_from_" +
    address +
    "_to_" +
    to +
    "_______random_salt_" +
    Math.random() +
    "_" +
    formData.type +
    " " +
    formData.message;
  console.log("🚀 ~ file: Search.tsx:47 ~ constconnectReq ~ client:", client);

  if (!walletClient) throw new Error("Wallet client not initialized");
  if (!client) {
    toast(`Please connect to XMTP`, {
      position: "bottom-right",
      autoClose: 10000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
    });
    throw new Error("xmtp client missing");
  }
  // if (!client) ;

  if (address !== client?.address)
    throw new Error(
      "xmtp client not equal to useWallet " + address + "!===" + client?.address
    );
  console.log(
    "🚀 ~ file: Search.tsx:81 ~ walletClient.signMessage() with address",
    address
  );

  const firstWord = message.split(" ")[0];

  const connection_message_hash = ethers
    .sha256(ethers.toUtf8Bytes(firstWord))
    .toString();

  // const signature = await walletClient.signMessage({
  //     account: address,
  //     message: connection_message_hash,
  //   });
  const signature = await walletClient?.signMessage(connection_message_hash);

  const url =
    "http://" + clientPreferedEngine + "dili/announceconnectionrequest";

  //bookmark
  let scoreres = await axios({
    method: "post",
    url: url,
    data: {
      from: client?.address,
      request_hash: connection_message_hash,
      from_signature: signature,
    },
  });

  if (!client) {
    // TODO gotta push user to connect to xmtp first
  }
  let isOnNetwork = false;
  try {
    //@ts-ignore

    isOnNetwork = await client?.canMessage(to);
    console.log("🚀 ~ file: Search.tsx:51 ~ constconnectReq ~ to:", to);
    if (isOnNetwork) {
      const newConversation = await client?.conversations.newConversation(to);
      //@ts-ignore
      await newConversation.send(message);
      console.log("YAY sent connection request via message " + message);
    } else {
      console.error("Can't COnnect user is not on XMTP ");
    }
  } catch (error) {
    console.log("🚀 ~ file: Search.tsx:61 ~ constconnectReq ~ error:", error);
  }
};

export const Search: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    control,
  } = useForm<SearchForm>({});
  const supabase = useContext(SupabaseContext);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    message: "",
  });
  const [data, setData] = useState<any[]>([]);
  const imageUrls = getImageUrls();
  const resumeCache = useResumeCache();
  const { client } = useClient();
  // const { address } = useWallet();

  // const { data: walletClient } = useWalletClient();
  const { data: walletClient } = useEthersWalletClient();
  console.log("useClient() xmptpppp: client?.address " + client?.address);

  //let clientPreferedEngine="159.203.132.121:3005/api/" //TODO change this to using standard settings

  // Load the cache with resumes after searching
  useEffect(() => {
    // Iterate over data and load the cache
    data.forEach(async (user) => {
      let cid = user.cid;
      if (!cid && !user.address) return; //Nothing to search for
      if (!cid && user.address) {
        try {
          const { data: resumeCid } = await supabase
            .from("resumes")
            .select("*")
            .eq("pk", user.address)
            .single();
          cid = resumeCid?.cid;
        } catch (e: any) {
          console.error("Error fetching resume CID: ", e.message);
          return;
        }
      }
      if (!cid) return; //Nothing to search for
      await loadCidIntoCache(cid, supabase, resumeCache);
    });
  }, [data]);

  const onSubmit: SubmitHandler<SearchForm> = async (data) => {
    const { searchTerm } = data;

    // const { data6, error6 } = await supabase.from('people_search').select("text").textSearch('text', `cat`)
    // const { data7, error7 } = await supabase.from('people_search').select("text").textSearch('text', `dog & cat`)
    // const { data8, error8 } = await supabase.from('people_search').select("text").textSearch('text', `'dog' & !'cat'`)
    const term = searchTerm
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .join("&");
    console.log("Searching for: ", term);
    const { data: results, error } = await supabase
      .from("people_search")
      .select(
        `
                  pk,
                  json->"address",
                  json->"profileImage",
                  json->"preferredname",
                  json->"preferredtitle",
                  json->"preferredlocation",
                  json->"cid"`
      )
      .textSearch("text ", term)
      .eq("on_xmtp", "true")
      .order("trust_score", { ascending: false });

    //TODO Make this search more robust
    console.log("results: ", results);

    if (error) {
      setError(JSON.stringify(error));
      return;
    }

    setData(results);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
    if (typeof e === "string") {
      setFormData({
        ...formData,
        type: e,
      });
    } else {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        message: value,
      });
    }
  };

  return (
    <div className={"p-4 space-y-2"}>
      <form onSubmit={handleSubmit(onSubmit)} className={"p-4 rounded"}>
        <Input type="text" placeholder="Search" {...register("searchTerm")} />
      </form>
      {data.map((user) => {
        console.log(user);
        const randomIndex = Math.floor(Math.random() * imageUrls.length);
        const randomImage = imageUrls[randomIndex];
        return (
          <Card
            key={user.pk}
            className={`
            overflow-hidden
            ${"bg-white"}
            rounded
            w-[370px] 
            shadow-lg 
            
            p-4  
            transition-transform 
            transform hover:scale-105`}
          >
            <div
              className={`flex 
              items-center 
              justify-between
              space-x-4`}
            >
              <Link
                className={`flex 
                  items-center 
                  space-x-4
                  w-2/3
                  ${"bg-white"}
                  `}
                to={`/profile/${user.pk}`}
              >
                <Avatar className="w-14 h-14">
                  <AvatarImage
                    src={user.profileImage || randomImage}
                    sizes={""}
                  />

                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col w-1/2">
                  <span className="text-xl tracking-tighter">
                    {user.preferredname || user.address || "Anonymous User"}
                  </span>{" "}
                  <span className="text-sm tracking-tight text-gray-500 truncate w-full">
                    {user.preferredtitle?.slice(0, 24)}
                  </span>
                </div>
              </Link>
              {/* <div className="flex ">
                <button
                  onClick={clickHandler(user.address, walletClient, client)}
                  className="px-4 w-fit mt-1 h-fit hover:scale-105 transition duration-200 text-lg rounded-xl font-semibold tracking-tighter bg-[#0e76fd] text-white py-1.5"
                >
                  Connect
                </button>
              </div> */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="px-4 w-fit mt-1 h-fit hover:scale-105 transition duration-200 text-lg rounded-xl font-semibold tracking-tighter bg-[#0e76fd] text-white py-1.5">
                    Connect
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Send a connection request</DialogTitle>
                    <DialogDescription>
                      Write a message for your connection and select your
                      connection reason.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid w-full items-center justify-center gap-4 py-4">
                    <div className="flex  items-center gap-11">
                      <Label htmlFor="username" className="text-right">
                        Type
                      </Label>
                      <Select
                        value={formData.type}
                        name="type"
                        onValueChange={handleChange}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Connection type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Consulting_gig">
                              Consulting gig
                            </SelectItem>
                            <SelectItem value="Interview_request">
                              Interview request
                            </SelectItem>
                            <SelectItem value="Expert_Opinion">
                              Expert Opinion
                            </SelectItem>
                            <SelectItem value="Recruiting">
                              Recruiting
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex  justify-center items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Message
                      </Label>
                      <Input
                        value={formData.message}
                        onChange={handleChange}
                        required
                        id="message"
                        placeholder="Type your message here."
                        className="col-span-3 
                        "
                      />
                    </div>
                  </div>
                  <div className="flex w-full items-end justify-end">
                    <button
                      onClick={clickHandler(
                        user.address,
                        walletClient,
                        client,
                        formData
                      )}
                      className="px-4 w-fit mt-1 h-fit hover:scale-105 transition duration-200 text-lg rounded-xl font-semibold tracking-tighter bg-[#0e76fd] text-white py-1.5"
                    >
                      Send a request
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
              {/* <ConnectionRequest /> */}
            </div>
          </Card>
        );
      })}
      <ToastContainer />
    </div>
  );
};
