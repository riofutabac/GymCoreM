import { AuthHeader } from "@/components/layout/AuthHeader";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-amber-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-orange-300 to-yellow-200 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>
      
      <AuthHeader />
      <main className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      
      {/* Floating elements */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-orange-300 rounded-full opacity-40 animate-bounce" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-32 left-16 w-3 h-3 bg-amber-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-orange-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: '5s' }}></div>
    </div>
  );
}