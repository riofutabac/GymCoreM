import { AuthHeader } from "@/components/layout/AuthHeader";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <AuthHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}