import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from "react";
import { Ic } from "./Ic";

/* Icon button: .ib  (40px) / .ib.sm (32px) / .ib.oc (38px outlined) / .hb-menu (44px) */
const IB_SIZE = {
    md: "h-[40px] w-[40px]",
    sm: "h-[32px] w-[32px]",
    xl: "h-[44px] w-[44px]",
    oc: "ml-[10px] h-[38px] w-[38px] border border-solid border-line2",
};
export function IconBtn({
    size = "md",
    className = "",
    children,
    ...p
}: { size?: keyof typeof IB_SIZE } & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...p}
            className={`relative inline-flex flex-none cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-tx transition-colors duration-150 hover:bg-hover active:bg-tonal-h ${IB_SIZE[size]} ${className}`}
        >
            {children}
        </button>
    );
}

/* Pill button: .btn.tonal / .btn.outline / .btn.filled */
const BTN = {
    tonal: "bg-tonal leading-[36px] hover:bg-tonal-h",
    filled: "bg-filled text-filled-tx leading-[36px] hover:bg-filled-h",
    outline:
        "border border-solid border-line2 bg-transparent leading-[34px] hover:bg-hover",
};
export function Btn({
    variant = "tonal",
    className = "",
    children,
    ...p
}: { variant?: keyof typeof BTN } & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...p}
            className={`inline-flex h-[36px] flex-none cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-[18px] px-[16px] text-[14px] font-medium transition-colors duration-150 ${BTN[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

/* Round tonal icon button (.rbtn) */
export function RBtn({ name }: { name: string }) {
    return (
        <button className="inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full bg-tonal text-tx transition-colors duration-150 hover:bg-tonal-h">
            <Ic name={name} className="h-[20px] w-[20px]" />
        </button>
    );
}

/* Letter avatar (.lav) */
export function Avatar({
    letters,
    size,
    bg,
    style,
}: {
    letters: string;
    size: number;
    bg: string;
    style?: CSSProperties;
}) {
    return (
        <span
            className="inline-flex flex-none items-center justify-center rounded-full font-medium text-white"
            style={{
                width: size,
                height: size,
                background: bg,
                fontSize: Math.round(size * 0.4),
                ...style,
            }}
        >
            {letters}
        </span>
    );
}

/* Circular trend badge (.ti up / .ti dn) */
export function Trend({ dir }: { dir: "up" | "dn" }) {
    return (
        <svg
            viewBox="0 0 18 18"
            className={`h-[18px] w-[18px] flex-none ${dir === "up" ? "text-green" : "text-tx2"}`}
            aria-hidden
        >
            <circle cx="9" cy="9" r="9" fill="currentColor" />
            <path
                d={
                    dir === "up"
                        ? "M9 13V5M5.5 8.5 9 5l3.5 3.5"
                        : "M9 5v8M5.5 9.5 9 13l3.5-3.5"
                }
                fill="none"
                stroke="var(--card)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* Card (.card) */
export function Card({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`min-w-0 rounded-[12px] border border-solid border-cbd bg-card p-[24px] ${className}`}
        >
            {children}
        </section>
    );
}
export const CardTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="m-0 mb-[16px] text-[18px] font-bold leading-[24px]">
        {children}
    </h2>
);

/* Label / value row (.kv) */
export function Kv({
    label,
    children,
}: {
    label: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-[32px] items-center justify-between gap-[16px] text-[14px]">
            <span className="min-w-0">{label}</span>
            <span className="inline-flex items-center gap-[8px]">
                {children}
            </span>
        </div>
    );
}

/* Placeholder thumbnail (swap for real images) */
export function Thumb({
    a,
    b,
    className = "",
}: {
    a: string;
    b: string;
    className?: string;
}) {
    return (
        <div
            className={`h-full w-full ${className}`}
            style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
        />
    );
}
