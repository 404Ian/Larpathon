import { Ic } from "./Ic";

/* Thin wrappers: they use src/icons/bulb.svg and compose.svg if present, otherwise the stand-ins in Ic.tsx */
export const BulbIcon = ({
    className = "h-[20px] w-[20px]",
}: {
    className?: string;
}) => <Ic name="bulb" className={className} />;
export const ComposeIcon = ({
    className = "h-[56px] w-[56px]",
}: {
    className?: string;
}) => <Ic name="compose" className={className} />;
