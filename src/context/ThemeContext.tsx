import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dk" | "lt";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dk",
    toggleTheme: () => {},
    setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [theme, setThemeState] = useState<Theme>("dk");

    useEffect(() => {
        // Synchronize body class
        document.body.className = theme;
    }, [theme]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "dk" ? "lt" : "dk"));
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
