// Component that renders a media card for a user's profile page
// Such cards would be things like "interviews" "conference_talks" "podcasts" "videos"
import {SubmitHandler, useForm} from "react-hook-form";
import {useContext, useEffect, useState} from "react";
import {SupabaseContext} from "../../contexts/SupabaseContext";
import {Database} from "../../__generated__/supabase-types";
import {MessageWithViemSignature} from "./types";
import {useWallet} from "../../hooks/useWallet";
import useEthersWalletClient from "../../hooks/useEthersWalletClient";
import {getRandomImage} from "../Search";
import {BACKEND_URL} from "./EASConfigContext";
import {Checkbox} from "../../../@/components/ui/checkbox";
import {Label} from "../../../@/components/ui/label";

type VerificationRequest =
    Database["public"]["Tables"]["manual_review_inbox"]["Row"];

type ConfirmVerificationMessage = {
    account: string;
    accept: boolean;
    cid: string;
};

export const AdminManualVerificationInbox: React.FC = () => {
    const supabase = useContext(SupabaseContext);
    const [requests, setRequests] = useState<VerificationRequest[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const {data, error} = await supabase
                .from("manual_review_inbox")
                .select("*")
                .eq("status", "pending");

            if (error) {
                console.error(error);
                return;
            }

            console.log("data", data);
            setRequests(data);
        };
        fetchData();
        const intervalId = setInterval(fetchData, 30000); // Poll every 5 seconds
        return () => clearInterval(intervalId); // Clear interval on component unmount
    }, []);

    return (
        <div className="min-w-72 border-2 p-4 rounded-lg m-2">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Admin Inbox</h2>
            {requests.map((request) => (
                <InboxRow
                    cid={request.cid}
                    account={request.account}
                    // key={request.cid}
                />
            ))}
        </div>
    );
};

const InboxRow: React.FC<{ account: string; cid: string }> = ({
                                                                  account,
                                                                  cid,
                                                              }) => {
    const [jsonResponse, setJsonResponse] = useState("");
    const [error, setError] = useState("");
    const {address} = useWallet();
    // const { data: walletClient } = useWalletClient();
    const {data: walletClient} = useEthersWalletClient();
    const {
        handleSubmit,
        formState: {errors},
        register
    } = useForm<{accept: string}>({
        defaultValues: {
            accept: "on"
        }
    });

    const onConfirmManualVerificationRequest: SubmitHandler<{accept: string}> = async (
        data
    ) => {
        try {
            console.log("Confirming verification", data, account, cid)
            if (!account || account.length === 0) {
                setError(
                    "You must be connected w/ a browser wallet to request verification"
                );
                return;
            }


            if (!walletClient) {
                setError(
                    "You must be connected w/ a browser wallet to request verification"
                );
                return;
            }

            //TODO You'd create an attestation here

            const message: ConfirmVerificationMessage = {
                account: account?.toLowerCase(),
                cid,
                accept: data.accept === "on",
            };

            const signature = await walletClient.signMessage(JSON.stringify(message));

            const requestBody: MessageWithViemSignature<ConfirmVerificationMessage> =
                {
                    message,
                    signature,
                };

            console.log(message, signature, requestBody)
            const requestOptions = {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(requestBody),
            };

            console.log("Confirming verification", requestBody);

            const res = await fetch(
                `${BACKEND_URL}/eas/confirm-verification`,
                requestOptions
            ).then((response) => response.json());
            setJsonResponse(res);
            console.log("Finished confirming verification", res);
            setError("");
        } catch (e: any) {
            console.log("Failed to confirm verification", e);
            console.error(e);
            setError(JSON.stringify(e));
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onConfirmManualVerificationRequest)}
            className="flex items-center border-b p-4 hover:bg-gray-100 transition duration-150 ease-in-out"
        >
            <img
                className="border-2 mr-4 rounded w-24 h-24 object-cover"
                src={getRandomImage()}
                alt="MEDIA"
            />
            <div className="flex-grow flex flex-col">
                <p className="text-gray-700 mb-2">{cid}</p>
                <p className="text-gray-700">{account}</p>
            </div>
            <div className="flex-col justify-center align-middle     space-x-2">
                <div>Accept</div>
                <Checkbox {...register("accept")}
                          id={"accept_checkbox"}/>
            </div>
            <button
                type="submit"
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            >
                Submit
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
    );
};
