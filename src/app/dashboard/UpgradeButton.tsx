"use client";
import { PaystackButton } from "react-paystack";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UpgradeButtonProps {
    userEmail: string;
    userId: string;
}

// Map Country Codes to Paystack Currencies & Amounts (~$3 USD equivalent)
const COUNTRY_CURRENCY_MAP: Record<string, { code: string; amount: number; label: string }> = {
    US: { code: "USD", amount: 300, label: "$3.00 USD" },
    GB: { code: "GBP", amount: 240, label: "£2.40 GBP" },
    KE: { code: "KES", amount: 39000, label: "KSh 390 KES" },
    NG: { code: "NGN", amount: 450000, label: "₦4,500 NGN" },
    GH: { code: "GHS", amount: 4500, label: "GH₵ 45 GHS" },
    ZA: { code: "ZAR", amount: 5500, label: "R 55 ZAR" },
    UG: { code: "UGX", amount: 11000, label: "USh 11,000 UGX" },
    TZ: { code: "TZS", amount: 750000, label: "TSh 7,500 TZS" },
    RW: { code: "RWF", amount: 380000, label: "RF 3,800 RWF" },
    EG: { code: "EGP", amount: 14500, label: "E£ 145 EGP" },
    // Major European countries map to EUR
    DE: { code: "EUR", amount: 280, label: "€2.80 EUR" },
    FR: { code: "EUR", amount: 280, label: "€2.80 EUR" },
    IT: { code: "EUR", amount: 280, label: "€2.80 EUR" },
    ES: { code: "EUR", amount: 280, label: "€2.80 EUR" },
    // Default fallback for everyone else
    DEFAULT: { code: "USD", amount: 300, label: "$3.00 USD" },
};

export default function UpgradeButton({ userEmail, userId }: UpgradeButtonProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [upgradeSuccess, setUpgradeSuccess] = useState(false);
    const [currencyData, setCurrencyData] = useState(COUNTRY_CURRENCY_MAP.DEFAULT);
    const [isDetecting, setIsDetecting] = useState(true);

    // 1. Detect User Location on Load
    useEffect(() => {
        fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((data) => {
                const countryCode = data.country_code;
                // If we have a match for their country, use it. Otherwise, use DEFAULT (USD).
                const detected = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP.DEFAULT;
                setCurrencyData(detected);
                setIsDetecting(false);
            })
            .catch(() => {
                // If IP detection fails (e.g., adblocker), fallback to USD
                setCurrencyData(COUNTRY_CURRENCY_MAP.DEFAULT);
                setIsDetecting(false);
            });
    }, []);

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

    const componentProps = {
        email: userEmail,
        amount: currencyData.amount,
        currency: currencyData.code,
        publicKey: publicKey,
        // 👇 THIS IS THE FIX: Include the dynamic label in the text prop
        text: isProcessing ? "Processing..." : `Upgrade to Pro - ${currencyData.label}`,
        onSuccess: async (reference: any) => {
            setIsProcessing(true);
            console.log("Payment successful:", reference);

            const { error } = await supabase
                .from("profiles")
                .update({ plan: "pro", tasks_used: 0 })
                .eq("id", userId);

            if (error) {
                console.error("Error updating profile:", error);
                alert("Payment successful but failed to upgrade account. Please contact support.");
            } else {
                setUpgradeSuccess(true);
                alert("Congratulations! Your account has been upgraded to Pro!");
            }
            setIsProcessing(false);
        },
        onClose: () => {
            alert("Payment window closed. Your upgrade was not completed.");
        },
    };

    if (upgradeSuccess) {
        return (
            <button disabled className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-sm cursor-not-allowed">
                Pro Plan Active
            </button>
        );
    }

    if (isDetecting) {
        return (
            <button disabled className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-sm cursor-wait">
                Detecting your location...
            </button>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-[#9BA1AE]">
                Detected currency: <span className="text-[#C98A2C] font-bold">{currencyData.code}</span>
            </p>
            <PaystackButton
                {...componentProps}
                className="w-full bg-[#C98A2C] hover:bg-[#B47A22] text-[#1B1B16] font-bold py-3 px-4 rounded-sm transition-colors disabled:opacity-50"
                disabled={isProcessing}
            >
                {/* Children are kept as fallback, but the 'text' prop now handles the main label */}
                {isProcessing ? "Processing..." : `Upgrade to Pro - ${currencyData.label}`}
            </PaystackButton>
        </div>
    );
}