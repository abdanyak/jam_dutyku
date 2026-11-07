import './globals.css';

export const metadata = {
  title: 'Duty Tracker - Monitoring Jam Duty',
  description: 'Pantau jam duty Discord otomatis tanpa database eksternal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
