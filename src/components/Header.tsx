import React, { useState } from "react";
import { PlaceholderLogo } from "./PlaceholderLogo";
import { useTheme } from "../context/ThemeContext";
import { Ic } from "./Ic";
import { Btn, IconBtn } from "./ui";
import { AVATAR_SP } from "./avatar";

interface HeaderProps {
    onToggleSidebar: () => void;
    onToggleAskStudio: () => void;
    onOpenUpload: () => void;
}

// gradient sparkle used by the Ask Studio button (mask taken from the original CSS)
const SPARK_MASK =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 1c.4 5.9 5.1 10.6 11 11-5.9.4-10.6 5.1-11 11-.4-5.9-5.1-10.6-11-11 5.9-.4 10.6-5.1 11-11Z'/%3E%3C/svg%3E\") center / contain no-repeat";

export const Header: React.FC<HeaderProps> = ({
    onToggleSidebar,
    onToggleAskStudio,
    onOpenUpload,
}) => {
    const { toggleTheme } = useTheme();
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    return (
        <header className="fixed inset-x-0 top-0 z-50 flex h-[64px] items-center bg-[var(--bg)] pl-[16px] pr-[24px] [body.lt_&]:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)]">
            <IconBtn
                size="xl"
                data-act="nav"
                data-tip="Menu"
                aria-label="Menu"
                type="button"
                onClick={onToggleSidebar}
            >
                <Ic name="menu" />
            </IconBtn>

            <PlaceholderLogo />

            <div
                className={`absolute left-1/2 top-[12px] flex h-[40px] w-[min(768px,40vw)] -translate-x-1/2 items-center rounded-[20px] border border-solid bg-[var(--input)] max-[1100px]:w-[min(420px,34vw)] ${
                    searchFocused
                        ? "border-[color:var(--blue)]"
                        : "border-transparent"
                }`}
            >
                <span className="flex w-[48px] justify-center text-[color:var(--tx2)]">
                    <Ic name="search" />
                </span>
                <input
                    id="sq"
                    className="h-[38px] min-w-0 flex-1 border-0 bg-transparent px-[2px] py-[1px] text-[15px] outline-none placeholder:text-[color:var(--tx2)]"
                    placeholder="Search across your channel"
                    autoComplete="off"
                    spellCheck={false}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                />
                {searchValue && (
                    <button
                        className="flex h-[38px] w-[40px] cursor-pointer items-center justify-center border-0 bg-transparent text-[color:var(--tx2)]"
                        data-act="sclear"
                        aria-label="Clear"
                        type="button"
                        onClick={() => setSearchValue("")}
                    >
                        <Ic name="close" className="h-[20px] w-[20px]" />
                    </button>
                )}
            </div>

            <span className="flex-1" />

            <IconBtn
                data-act="help"
                data-tip="Help"
                aria-label="Help"
                type="button"
            >
                <Ic name="help" />
            </IconBtn>

            <IconBtn
                data-act="notifs"
                data-tip="Notifications"
                aria-label="Notifications"
                type="button"
            >
                <Ic name="bell" />
                <span className="absolute right-[4px] top-[5px] h-[16px] min-w-[16px] rounded-[8px] bg-[#cc0000] px-[4px] text-center text-[11px] font-medium leading-[16px] text-white">
                    3
                </span>
            </IconBtn>

            <Btn
                variant="outline"
                className="ml-[8px] !gap-[8px] !pl-[12px] !pr-[16px]"
                data-act="ask"
                type="button"
                onClick={onToggleAskStudio}
            >
                <span
                    className="inline-flex h-[20px] w-[20px] flex-none bg-[image:var(--ai)]"
                    style={{ WebkitMask: SPARK_MASK, mask: SPARK_MASK }}
                />
                <span>Ask Studio</span>
            </Btn>

            <Btn
                variant="outline"
                className="ml-[8px]"
                data-act="create"
                type="button"
                onClick={onOpenUpload}
            >
                <Ic
                    name="create"
                    className="ml-[-4px] h-[24px] w-[24px] text-[color:var(--red)]"
                />
                <span>Create</span>
            </Btn>

            <button
                className="ml-[18px] mr-[1px] h-[32px] w-[32px] cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0"
                data-act="account"
                aria-label="Account"
                type="button"
                onClick={toggleTheme}
            >
                <img
                    className="block h-[32px] w-[32px] rounded-full bg-[var(--thumb)] object-cover"
                    src={AVATAR_SP}
                    width={32}
                    height={32}
                    alt=""
                    referrerPolicy="no-referrer"
                />
            </button>
        </header>
    );
};
