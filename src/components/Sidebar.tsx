import React from "react";
import { NavLink } from "react-router-dom";
import { Ic } from "./Ic";
import { AVATAR_SP } from "./avatar";

interface SidebarProps {
    onOpenSettings: () => void;
    onOpenFeedback: () => void;
    collapsed?: boolean;
}

const ITEMS: { to: string; go: string; icon: string; label: string }[] = [
    { to: "/", go: "dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/content", go: "content/videos", icon: "content", label: "Content" },
    {
        to: "/analytics",
        go: "analytics/overview",
        icon: "analytics",
        label: "Analytics",
    },
    { to: "/comments", go: "comments", icon: "community", label: "Community" },
    {
        to: "/subtitles",
        go: "subtitles",
        icon: "languages",
        label: "Languages",
    },
    {
        to: "/copyright",
        go: "copyright",
        icon: "copyright",
        label: "Content detection",
    },
    { to: "/earn", go: "earn", icon: "earn", label: "Earn" },
    {
        to: "/customization",
        go: "customization",
        icon: "customization",
        label: "Customization",
    },
    { to: "/audio", go: "audio", icon: "audio", label: "Audio library" },
];

const NI =
    "mx-[12px] flex h-[48px] flex-none cursor-pointer items-center gap-[24px] whitespace-nowrap rounded-[8px] text-[15px] leading-[24px] text-tx";

export const Sidebar: React.FC<SidebarProps> = ({
    onOpenSettings,
    onOpenFeedback,
    collapsed = false,
}) => {
    const pad = collapsed ? "justify-center px-0" : "px-[12px]";

    return (
        <nav className="fixed bottom-0 left-0 top-[64px] z-40 flex w-nav flex-col overflow-y-auto overflow-x-hidden bg-bg transition-[width] duration-200 ease-studio [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [body.lt_&]:shadow-[1px_0_0_rgba(0,0,0,0.1)]">
            <div
                className={`flex flex-none flex-col items-center ${collapsed ? "pb-[8px] pt-[16px]" : "pb-[16px] pt-[24px]"}`}
            >
                <a
                    className="block"
                    href="#"
                    target="_blank"
                    rel="noopener"
                    data-tip="View channel on YouTube"
                >
                    <img
                        className={`inline align-baseline rounded-full bg-thumb object-cover transition-[width,height] duration-200 ease-studio ${
                            collapsed
                                ? "h-[32px] w-[32px]"
                                : "h-[112px] w-[112px]"
                        }`}
                        src={AVATAR_SP}
                        width={112}
                        height={112}
                        alt=""
                        referrerPolicy="no-referrer"
                    />
                </a>
                {!collapsed && (
                    <>
                        <div className="mt-[14px] text-[15px] font-medium leading-[24px]">
                            Your channel
                        </div>
                        <div className="max-w-[220px] truncate text-[12px] leading-[16px] text-tx2">
                            SynthPulse
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-none flex-col">
                {ITEMS.map((it) => (
                    <NavLink
                        key={it.to}
                        to={it.to}
                        data-go={it.go}
                        className={({ isActive }) =>
                            `${NI} ${pad} ${isActive ? "bg-nav-on font-medium" : "hover:bg-row-h"}`
                        }
                    >
                        <Ic name={it.icon} />
                        {!collapsed && <span>{it.label}</span>}
                    </NavLink>
                ))}
            </div>

            <div className="mt-auto flex flex-col pb-[8px] pt-[16px]">
                <a
                    className={`${NI} ${pad} hover:bg-row-h`}
                    href="#"
                    data-act="settings"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenSettings();
                    }}
                >
                    <Ic name="settings" />
                    {!collapsed && <span>Settings</span>}
                </a>
                <a
                    className={`${NI} ${pad} hover:bg-row-h`}
                    href="#"
                    data-act="feedback"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenFeedback();
                    }}
                >
                    <Ic name="feedback" />
                    {!collapsed && <span>Send feedback</span>}
                </a>
            </div>
        </nav>
    );
};
