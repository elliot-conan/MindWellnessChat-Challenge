'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquareHeart, Sparkles, Brain, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <span className="text-xl font-semibold">MindfulChat</span>
            <Badge variant="outline" className="hidden md:flex ml-2">
              Wellness Challenge
            </Badge>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="container px-4 py-12 md:py-24 lg:py-32 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          <Badge className="mb-4" variant="outline">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
            Mental Wellness Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Support for your <span className="text-primary">mental wellbeing</span> journey
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-[700px] mx-auto">
            Connect with mental health professionals through secure messaging. Get the support you need, whenever you need it.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Button asChild size="lg" className="w-full">
            <Link href="/auth/sign-up">
              <MessageSquareHeart className="mr-2 h-5 w-5" />
              Start Chatting
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/auth/login">
              <ArrowRight className="mr-2 h-5 w-5" />
              Sign In
            </Link>
          </Button>
        </div>
      </section>




      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6 mt-auto">
        <div className="container px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <span className="font-semibold">MindfulChat</span>
            <span className="text-muted-foreground text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
