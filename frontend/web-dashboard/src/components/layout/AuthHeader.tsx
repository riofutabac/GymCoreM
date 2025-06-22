import Link from 'next/link';

export function AuthHeader() {
  return (
    <header className="py-4 px-6 border-b bg-background">
      <div className="container mx-auto">
        <Link href="/" className="text-2xl font-bold text-slate-800 hover:text-primary transition-colors">
          GymCore
        </Link>
      </div>
    </header>
  );
}