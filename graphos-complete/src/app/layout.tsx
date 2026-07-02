import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "CouncilIA — Strategic Intelligence Chamber",
    description: "Validate high-stakes decisions with a council of 7 specialized AI perspectives. Adversarial deliberation for board-level insights.",
    metadataBase: new URL("https://www.councilia.com"),
    openGraph: {
        title: "CouncilIA — Simulate outcomes before you commit.",
        description: "Adversarial AI deliberation for strategic decision support.",
        url: "https://www.councilia.com",
        siteName: "CouncilIA",
        locale: "en_US",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
            </head>
            <body className="bg-bg text-text min-h-screen">
                {children}
            </body>
        </html>
    );
}