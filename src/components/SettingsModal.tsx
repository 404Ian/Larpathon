import React, { useState } from "react";
import { Icon } from "../icons";

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}

const tabs = [
    "General",
    "Channel",
    "Upload defaults",
    "Permissions",
    "Community",
    "Agreements",
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
    open,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState("General");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 animate-fadeIn select-none">
            <div className="w-[840px] max-w-full bg-dialog border border-line rounded-2xl shadow-studio overflow-hidden flex flex-col h-[540px]">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-line">
                    <h2 className="text-[18px] font-medium text-tx">
                        Settings
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-hover flex items-center justify-center text-tx focus:outline-none"
                        aria-label="Close"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* Content with left tabs */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Tabs */}
                    <div className="w-[200px] border-r border-line py-2 flex flex-col">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 text-left text-[14px] transition-colors focus:outline-none ${
                                    activeTab === tab
                                        ? "font-medium text-tx bg-nav-on"
                                        : "text-tx2 hover:bg-hover hover:text-tx"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Pane */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === "General" && (
                            <div>
                                <h3 className="text-[15px] font-medium text-tx mb-2">
                                    Default currency
                                </h3>
                                <div className="max-w-[280px]">
                                    <div className="p-2.5 rounded-lg border border-line bg-input text-tx text-[14px]">
                                        USD - US Dollar
                                    </div>
                                </div>
                                <p className="text-[12px] text-tx3 mt-2">
                                    The currency used to show your estimated
                                    revenue in Analytics.
                                </p>
                            </div>
                        )}
                        {activeTab !== "General" && (
                            <div className="text-tx2 text-[14px]">
                                {activeTab} configuration options are available
                                here.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-line flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-full border border-line hover:bg-hover text-tx text-[14px] font-medium focus:outline-none"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-full bg-filled text-filled-tx hover:bg-filled-h text-[14px] font-medium focus:outline-none"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
