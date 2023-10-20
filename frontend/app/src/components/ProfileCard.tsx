import React, { useContext, useEffect, useState } from "react";
import FileUploadModal from "./FileUpload";
import "./ProfileCard.css";
import { useNavigate, useParams } from "react-router-dom";
import { Resume, IndexedUser } from "../types";
import { ipfsDownload } from "../ipfs";
import { IoMdArrowBack } from "react-icons/io";
import "./App.css";
import { useWallet } from "../hooks/useWallet";
import { SupabaseContext } from "../contexts/SupabaseContext";
import { useResumeCache } from "../contexts/FileCacheContext";
import axios from "axios";
import SocialBadge from "./SocialBadge";
import Loading from "./Loading";
import Avatar, { genConfig } from "react-nice-avatar";
export default function ProfileCard() {
  const { cid } = useParams();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState({});
  const [progress, setProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const { address: walletAddress } = useWallet();
  const [loading, setLoading] = useState(false);
  const supabase = useContext(SupabaseContext);
  const resumeCache = useResumeCache();

  const getImage = (event: any) => {
    setCurrentImage(event.target.files[0]);
  };

  //@Sakshi, this is the logic for fetching the resume from IPFS
  const [error, setError] = useState("");
  const [fetchedProfile, setFetchedProfile] = useState<Resume>();
  const [indexedUser, setIndexedUser] = useState<IndexedUser[]>();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`https://api.web3.bio/profile/${cid}`);
        const user = response.data;
        console.log("user", user);
        setIndexedUser(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        let stageCid = cid;

        if (!stageCid) {
          console.log("No cid provided");
          setLoading(false);
          return;
        }
        if (stageCid === "self") {
          console.log(
            "No cid provided, but self, searching supabase for wallet address",
            walletAddress?.toLowerCase()
          );
          if (!walletAddress) {
            console.log("No wallet, nor cid provided to profile card");
            setLoading(false);
            return;
          }
          const { data } = await supabase
            .from("resumes")
            .select("cid")
            .eq("address", walletAddress.toLowerCase())
            .single();
          if (!data?.cid) throw new Error("No CID found for this address");
          console.log("CID:", data.cid);
          stageCid = data.cid;
        }
        console.log("Fetching resume from IPFS");
        const cacheEntry = resumeCache.get(stageCid);
        if (cacheEntry) {
          setFetchedProfile(cacheEntry);
          return;
        }
        const resume = await ipfsDownload(stageCid || "");
        console.log("Fetched resume from IPFS: ", resume);
        resumeCache.set(stageCid, {
          ...resume,
          expiry: Date.now() + 1000 * 60 * 5,
        });
        setFetchedProfile(resume);
        setLoading(false);
      } catch (error: any) {
        console.log(error);
        if (error.message === "No CID found for this address") {
          setLoading(false);
          navigate("/publish");
        }
      }
    };
    fetchProfile();
  }, []);
  console.log("Profile: ", fetchedProfile);

  let educationOrganization: any = [];
  let workOrganization: any = [];
  if (fetchedProfile?.organization) {
    educationOrganization = fetchedProfile?.organization?.filter(
      (organization) => organization.type === "education"
    );
    console.log(educationOrganization);
    workOrganization = fetchedProfile?.organization.filter(
      (organization) => organization.type === "work"
    );
    console.log(workOrganization);
  }

  const uploadImage = () => {};
  function formatUnixTimestamp(unixTimestamp: any) {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    return (
      date.toLocaleString("en-us", { month: "short" }) +
      ` ${day}${suffix}, ${date.getFullYear()}`
    );
  }
  let config;
  if (fetchedProfile) {
    config = genConfig(fetchedProfile?.firstName);
  }

  return (
    <>
      {/* {loading ? (
        <Loading />
      ) : ( */}
      <div className="bg-white w-full">
        <div
          className="flex text-[#73b6ff] text-[18px] mt-5 ml-5 font-semibold cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          <IoMdArrowBack className="mt-1" />
          <p>Back</p>
        </div>
        <div className=" flex flex-col gap-[32px]">
          <FileUploadModal
            getImage={getImage}
            uploadImage={uploadImage}
            modalOpen={modalOpen}
            setModalOpen={setModalOpen}
            currentImage={currentImage}
            progress={progress}
          />
          <div className="ml-10">
            <div className="  text-gray-800 font-montserrat h-fit mt-12 w-[700px] lg:p-10 p-6  card rounded-xl ">
              <div className="profile-info">
                <div>
                  <div className=" flex">
                    <div>
                      {indexedUser &&
                      indexedUser.find((item) => item.avatar !== null) ? (
                        <img
                          className="w-44 h-32 rounded-full"
                          src={
                            indexedUser.find(
                              (item) => item.avatar !== undefined
                            )!.avatar
                          }
                        />
                      ) : (
                        <Avatar
                          style={{ width: "8rem", height: "8rem" }}
                          className="rounded-full"
                          {...config}
                        />
                      )}
                    </div>
                    <div className="w-full flex justify-end mt-6 py-6">
                      <button
                        className="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 shadow-lg shadow-blue-500/50 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                        type="button"
                        onClick={() => {
                          navigate("/profileEdit");
                        }}
                      >
                        Edit profile
                      </button>
                    </div>
                  </div>
                  <div className="w-full flex justify-between gap-[215px]">
                    {" "}
                    <div className="">
                      {" "}
                      <h3 className=" text-[18px] font-sans whitespace-nowrap font-bold text-gray-600 mt-2">
                        {indexedUser && indexedUser[0].error! !== "Not Found"
                          ? `${indexedUser[0].displayName}`
                          : `${fetchedProfile?.firstName} ${fetchedProfile?.lastName}`}
                      </h3>
                      <p className=" text-[16px] font-sans font-medium text-gray-500">
                        {fetchedProfile?.description}
                      </p>
                      <p className=" text-[16px] font-sans  text-gray-500 ">
                        {fetchedProfile?.preferredLocation}
                      </p>
                      {fetchedProfile && (
                        <p className=" text-[16px] font-sans  text-gray-500 ">
                          <span className="font-bold">Skills</span>:&nbsp;
                          {fetchedProfile?.description}
                        </p>
                      )}
                    </div>
                    {/* <div className="w-full flex flex-col justify-end">
                      <p className=" text-[16px] font-sans  text-gray-600 ">
                        University
                      </p>
                      <p className=" text-[16px] font-sans  text-gray-600 ">
                        Techie Amigos
                      </p>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-gray-800 font-montserrat h-fit mt-12 w-[700px] lg:p-10 p-6  card rounded-xl">
              {workOrganization && workOrganization.length > 0 && (
                <div>
                  <h1 className="heading-2">Experience</h1>
                  <ul>
                    {workOrganization.map((item: any, index: any) => (
                      <li key={index} className="experience-card">
                        <div>
                          <br />
                          <img
                            className="experience-image"
                            src={item.image}
                            alt="company-logo"
                          />
                        </div>
                        <div>
                          <br />
                          <strong>{item.Job}</strong>
                          <br />
                          <h3>{item.Company}</h3>
                          <h4>{item.Timeline}</h4>
                          <p>{item.Place}</p>
                          <br />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {educationOrganization && educationOrganization.length > 0 && (
                <div>
                  <h1 className="heading-2">Organizations</h1>
                  <ul>
                    {educationOrganization.map((item: any, index: any) => (
                      <li key={index} className="experience-card">
                        <div>
                          <br />
                          <img
                            className="experience-image"
                            src="https://imgs.search.brave.com/m76M_P2x6d-LP9crPYcv9_x3EgIiE7fHS3LjbpOGEl8/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzAyLzAwLzk5Lzk5/LzM2MF9GXzIwMDk5/OTk3OF9pWVJISUVr/VWczWHJMY01RVFp6/R20wYTg4bWYzelQy/WS5qcGc"
                            alt="company-logo"
                          />
                        </div>
                        <div>
                          <br />
                          <strong>{item.organizationName}</strong>
                          <br />
                          <h3>{item.titleAtWork}</h3>
                          <p>
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "short",
                            }).format(
                              new Date(item.relationshipTimestamp.startDate)
                            )}
                            -
                            {new Intl.DateTimeFormat("en-US", {
                              year: "numeric",
                              month: "short",
                            }).format(
                              new Date(item.relationshipTimestamp.endDate)
                            )}
                          </p>
                          <br />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex text-center ml-10 justify-around text-gray-800 font-montserrat h-fit mt-12 w-[700px] lg:p-10 p-6  card rounded-xl">
            {indexedUser &&
              indexedUser[0].error! !== "Not Found" &&
              indexedUser!.map((data) => {
                const platform = data.platform.toLocaleLowerCase();
                const links = data.links;

                let link = null;

                // Iterate through the properties of the 'links' object
                for (const key in links) {
                  if (
                    links.hasOwnProperty(key) &&
                    key.toLocaleLowerCase() === platform
                  ) {
                    link = links[key];
                    break;
                  }
                }

                // If no matching link was found, use the first link available
                if (!link) {
                  for (const key in links) {
                    if (links.hasOwnProperty(key)) {
                      link = links[key];
                      break;
                    }
                  }
                }

                return (
                  <SocialBadge
                    key={platform}
                    icon={platform}
                    link={link ? link.link : ""}
                    handle={data.identity}
                  />
                );
              })}
          </div>

          {fetchedProfile?.attestationData &&
            fetchedProfile?.attestationData?.map(
              (attestation: any, key: any) => {
                const message = JSON.parse(attestation?.decodedDataJson);
                console.log("Attestaion Message:", message[0]?.value?.value);
                const unixTimestamp = attestation?.timeCreated;
                const formattedDate = formatUnixTimestamp(unixTimestamp);
                console.log(formattedDate);

                return (
                  <div
                    className="text-gray-800 font-montserrat h-fit mt-12 w-[700px]   card rounded-xl "
                    key={key}
                  >
                    <div className=" p-4 border-2 rounded-lg border-blue-300">
                      <a href="#" className="w-full text-center">
                        <h5 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 ">
                          Attestation
                        </h5>
                        <p className=" text-[16px] font-sans  text-gray-600 ">
                          Chain ID: {attestation?.chainID}
                        </p>
                      </a>
                      <div className=" flex gap-2 mb-[4px]">
                        <p className="text-[16px] font-sans font-bold text-gray-700 ">
                          Data:{" "}
                        </p>
                        <div>
                          <p className=" text-[16px] font-sans  text-gray-600 ">
                            Message: {message[0]?.valu?.value}
                          </p>
                          <p className=" text-[16px] font-sans  text-gray-600 ">
                            Recipient:{" "}
                            {attestation?.recipient.slice(0, 4) +
                              "...." +
                              attestation?.recipient.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className=" flex gap-2 mb-[4px]">
                        <p className=" text-[16px] font-sans font-bold text-gray-600 ">
                          Attester:{" "}
                        </p>
                        <div>
                          <p className=" text-[16px] font-sans  text-gray-600 ">
                            {attestation?.attester.slice(0, 4) +
                              "...." +
                              attestation?.attester.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className=" flex gap-2 mb-[4px]">
                        <p className="text-[16px] font-sans font-bold text-gray-700 ">
                          Issued:{" "}
                        </p>
                        <div>
                          <p className=" text-[16px] font-sans  text-gray-600 ">
                            {formattedDate}
                          </p>
                        </div>
                      </div>
                      <div className=" flex gap-2 mb-[4px]">
                        <p className="text-[16px] font-sans font-bold text-gray-700 ">
                          Expires:{" "}
                        </p>
                        <div>
                          <p className=" text-[16px] font-sans  text-gray-600 ">
                            {" "}
                            {attestation?.expirationTime}
                          </p>
                        </div>
                      </div>
                      {/* <div className="w-full flex justify-center">
                        <button
                          className="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 shadow-lg shadow-blue-500/50 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 "
                          type="submit"
                        >
                          Verify
                        </button>
                      </div> */}
                    </div>
                  </div>
                );
              }
            )}
        </div>
      </div>
      {/* )} */}
    </>
  );
}
