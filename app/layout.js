import "./globals.css";

export const metadata = {
  title: "Music Promotion Secretary",
  description: "Promote your music with smart support and simple tools."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}<footer className="container studio-ui" style={{padding:"18px 24px",fontSize:14}}><nav aria-label="Support and legal" style={{display:"flex",gap:18,flexWrap:"wrap"}}><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/data-deletion">Data deletion</a></nav><p style={{marginTop:12}}>Operated by Paul Ifeanyi Akotaibe · <a href="mailto:hello@drpaulslibrary.com">hello@drpaulslibrary.com</a></p></footer></body>
    </html>
  );
}
