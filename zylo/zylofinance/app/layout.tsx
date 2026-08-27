import "./globals.css";

export const metadata = {
  title: 'Zylo — XRP, working on Flare',
  description: 'Move XRP onto Flare as FXRP, put it to work, and take it back out. Gasless, social login, no seed phrase.',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-black text-white antialiased">{children}</body>
    </html>
  );
};

export default Layout;
