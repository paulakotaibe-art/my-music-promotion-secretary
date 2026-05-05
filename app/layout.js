import "./globals.css";

export const metadata = {
  title: "Music Promotion Secretary",
  description: "Promote your music with smart support and simple tools."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
