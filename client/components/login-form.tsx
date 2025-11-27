"use client";

import { useRouter } from "next/navigation"; // <-- FIXED
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import Image from "next/image";

const LoginForm = () => {
  const router = useRouter();
  const [isloading, setIsloading] = useState(false);

  const handleSignIn = async () => {
    if (isloading) return;
    setIsloading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "http://localhost:3000",
      });
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 justify-center items-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Image src={"/login.svg"} alt="login" height={300} width={300} />
        <h1 className="text-6xl font-extrabold text-indigo-400">
          Welcome Back! to Orbital Cli
        </h1>
        <p className="text-base font-medium text-zinc-400">
          Login to your account for allowing device flow
        </p>
      </div>

      <Card
        className="border-dashed border-2 cursor-pointer transition-colors hover:bg-accent/5"
        role="button"
        tabIndex={0}
        onClick={handleSignIn}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSignIn();
          }
        }}
      >
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                variant={"outline"}
                className="w-full h-full"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignIn();
                }}
                disabled={isloading}
              >
                <Image
                  src={"/github.svg"}
                  alt="github-icon"
                  width={25}
                  height={25}
                  className="dark:invert"
                />
                {isloading ? "Signing in..." : "Continue with Github"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
