import React from "react";
import { Icon } from "../icons";
import { mockData } from "../mock";

interface AskStudioDrawerProps {
    open: boolean;
    onClose: () => void;
}

export const AskStudioDrawer: React.FC<AskStudioDrawerProps> = ({
    open,
    onClose,
}) => {
    if (!open) return null;

    return (
        <aside
            id="ask"
            aria-label="Ask Studio"
            className="fixed top-header right-0 bottom-0 w-drawer bg-bg border-l border-line z-50 flex flex-col justify-between shadow-studio animate-slideInRight select-none"
        >
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-line">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="w-9 h-9 rounded-full hover:bg-hover flex items-center justify-center text-tx focus:outline-none"
                        aria-label="Chats"
                    >
                        <Icon name="bars" className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-[16px] text-tx">
                        Ask Studio
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="w-9 h-9 rounded-full hover:bg-hover flex items-center justify-center text-tx focus:outline-none"
                        aria-label="New conversation"
                    >
                        <Icon name="newchat" className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-hover flex items-center justify-center text-tx focus:outline-none"
                        aria-label="Close"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Body / Prompts */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
                <div>
                    <div className="mt-4 mb-6">
                        <h2 className="text-[22px] font-semibold text-tx leading-tight">
                            Hello, {mockData.S.name}
                        </h2>
                        <p className="text-[16px] text-tx2 mt-1">
                            How can I help you?
                        </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {[
                            "How can Ask Studio help me?",
                            "Create a thumbnail for my long-form video",
                            "Suggest new video ideas",
                            "Summarize my channel performance",
                            "More suggestions",
                        ].map((chip, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="w-full text-left p-3.5 rounded-xl border border-line bg-card hover:bg-hover hover:border-tx2/40 text-[13px] text-tx transition-all focus:outline-none flex items-center justify-between group"
                            >
                                <span>{chip}</span>
                                <Icon
                                    name="sparkle"
                                    className="w-4 h-4 text-tx3 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input & Disclaimer */}
                <div className="mt-6 pt-4 border-t border-line/60">
                    <div className="flex items-center bg-input border border-line rounded-2xl px-4 py-2.5 focus-within:border-blue transition-colors">
                        <input
                            type="text"
                            placeholder="Ask anything about your channel..."
                            className="w-full bg-transparent text-[13px] text-tx placeholder:text-tx3 outline-none"
                        />
                        <button
                            type="button"
                            className="text-tx3 hover:text-tx focus:outline-none ml-2"
                            aria-label="Send message"
                        >
                            <Icon name="send" className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-[11px] text-tx3 text-center mt-2 leading-relaxed">
                        AI can make mistakes. You are responsible for the
                        content you publish.
                    </p>
                </div>
            </div>
        </aside>
    );
};
