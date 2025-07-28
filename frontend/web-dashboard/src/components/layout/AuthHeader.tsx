import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AuthHeader() {
  return (
    <header className="py-6 px-6 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
        >
          <div className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
            <ArrowLeft size={20} />
          </div>
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-600">
            GymCore
          </span>
        </Link>
        
        {/* Decorative elements */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Sistema Activo</span>
          </div>
        </div>
      </div>
    </header>
  );
}