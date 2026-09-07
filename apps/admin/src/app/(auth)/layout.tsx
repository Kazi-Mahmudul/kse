/** Centered full-height wrapper for the login screen. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-4">
      {children}
    </div>
  );
}
