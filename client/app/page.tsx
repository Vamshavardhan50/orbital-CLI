"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function Home() {
  const [session, setSession] = useState<SessionData>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      try {
        const response = await authClient.getSession();
        // Check if the response has data and extract it
        if (response && "data" in response && response.data) {
          setSession(response.data);
        } else {
          setSession(null);
          // Redirect to sign-in if no session after loading is complete
          setTimeout(() => router.push("/sign-in"), 100);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
        setSession(null);
        // Redirect to sign-in on error after loading is complete
        setTimeout(() => router.push("/sign-in"), 100);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* User Profile Card */}
          <Card className="bg-gray-900 border-gray-500 border-dashed">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-yellow-400 overflow-hidden">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-yellow-400 text-black text-2xl font-bold">
                        {(session.user.name || session.user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-gray-900"></div>
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-400 mb-1">
                    Welcome, {session.user.name || "User"}!
                  </h2>
                  <p className="text-gray-400 text-sm">Authenticated User</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Card */}
          <Card className="bg-gray-900 border-gray-500 border-dashed">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">EMAIL ADDRESS</p>
                <p className="text-white">{session.user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out Button */}
          <Button
            onClick={async () => {
              await authClient.signOut();
              setSession(null);
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-md"
          >
            Sign Out
          </Button>

          {/* Session Status */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">Session Active</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Spinner />
    </div>
  );
}
