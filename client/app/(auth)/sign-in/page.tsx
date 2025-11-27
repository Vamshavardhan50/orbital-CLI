"use client";

import LoginForm from "@/components/login-form";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionData = {
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
} | null;

const page = () => {
  const [session, setSession] = useState<SessionData>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authClient.getSession();
        // Check if the response has data and extract it
        if (response && "data" in response && response.data) {
          setSession(response.data);
          // Redirect to home if user is already logged in
          router.push("/");
          return;
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  // Show login form only if user is not authenticated
  return (
    <div>
      <LoginForm />
    </div>
  );
};

export default page;
