export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f5f7] p-4">
      {children}
    </div>
  );
}
