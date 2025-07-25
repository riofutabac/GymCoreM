'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}

export function AuthCard({ title, description, className, children, ...rest }: AuthCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className={cn("w-full max-w-md mx-4 bg-background shadow-lg border", className)} {...rest}>
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <Card 
        className={cn(
          "w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 relative overflow-hidden",
          className
        )} 
        {...rest}
      >
        
        
        <CardHeader className="text-center space-y-4 relative z-10 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 tracking-tight">
              {title}
            </CardTitle>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <CardDescription className="text-gray-600 text-base leading-relaxed">
              {description}
            </CardDescription>
          </motion.div>
          
          {/* Decorative line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "3rem" }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="h-1 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full mx-auto"
          ></motion.div>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {children}
          </motion.div>
        </CardContent>
        
        {/* Floating decoration */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-orange-300 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute bottom-6 left-4 w-1.5 h-1.5 bg-amber-400 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </Card>
    </motion.div>
  );
}
