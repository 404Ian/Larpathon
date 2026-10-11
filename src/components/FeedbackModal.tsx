import React, { useState } from "react";
import { Icon } from "../icons";

interface FeedbackModalProps {
    open: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    open,
    onClose,
}) => {
    const [feedback, setFeedback] = useState("");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 animate-fadeIn select-none">
            <div className="w-[520px] max-w-full bg-dialog border border-line rounded-2xl shadow-studio overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-line">
                    <h2 className="text-[18px] font-medium text-tx">
                        Send feedback to Studio
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

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="text-[13px] font-medium text-tx block mb-2">
                            Describe your feedback (required)
                        </label>
                        <textarea
                            rows={5}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Tell us what's working well, what's not, or what you'd like to see..."
                            className="w-full bg-input border border-line rounded-xl p-3 text-[13px] text-tx placeholder:text-tx3 outline-none focus:border-blue transition-colors resize-none"
                        />
                        <p className="text-[11px] text-tx3 mt-1.5 leading-relaxed">
                            Please don't include any sensitive information like
                            passwords, addresses, or private channel
                            credentials.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-line flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-full border border-line hover:bg-hover text-tx text-[14px] font-medium focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={!feedback.trim()}
                        className="px-5 py-2 rounded-full bg-filled text-filled-tx hover:bg-filled-h disabled:opacity-50 text-[14px] font-medium transition-opacity focus:outline-none"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
