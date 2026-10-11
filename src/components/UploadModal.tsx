import React from "react";
import { Icon } from "../icons";

interface UploadModalProps {
    open: boolean;
    onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ open, onClose }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 animate-fadeIn select-none">
            <div className="w-[960px] max-w-full bg-dialog border border-line rounded-2xl shadow-studio overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-line">
                    <h2 className="text-[18px] font-medium text-tx">
                        Upload videos
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="w-9 h-9 rounded-full hover:bg-hover flex items-center justify-center text-tx focus:outline-none"
                            aria-label="Send feedback"
                        >
                            <Icon name="feedback" className="w-5 h-5" />
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

                {/* Drop zone body */}
                <div className="p-12 flex flex-col items-center justify-center text-center my-6">
                    <div className="w-36 h-36 rounded-full bg-input/60 border border-line flex items-center justify-center mb-6">
                        <Icon name="upload" className="w-16 h-16 text-tx3" />
                    </div>
                    <p className="text-[16px] font-medium text-tx mb-1">
                        Drag and drop video files to upload
                    </p>
                    <p className="text-[13px] text-tx3 mb-6">
                        Your videos will be private until you publish them.
                    </p>

                    <button
                        type="button"
                        className="px-6 py-2.5 rounded-full bg-filled text-filled-tx hover:bg-filled-h font-medium text-[14px] transition-colors focus:outline-none"
                    >
                        Select files
                    </button>
                </div>

                {/* Disclaimer footer */}
                <div className="px-8 py-4 text-center border-t border-line text-[12px] text-tx3">
                    By submitting your videos, you acknowledge that you agree to
                    Terms of Service and Community Guidelines.
                </div>
            </div>
        </div>
    );
};
