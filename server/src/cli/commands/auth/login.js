import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";
import path from "path";
import os from "os";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";
import prisma from "../../../lib/db.js";
import {
  getStoredToken,
  isTokenExpired,
  clearStoredToken,
  requireAuth,
  storeToken,
  CONFIG_DIR,
  TOKEN_FILE,
} from "../../../lib/token.js";
dotenv.config();

const URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;

//=============================
//TOKEN MANAGEMENT
//=============================

export async function loginAction(opts) {
  const options = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });

  const serverUrl = options.serverUrl || URL;
  const clientId = options.clientId || CLIENT_ID;

  intro(chalk.bold("🔏 Auth CLI Login"));

  //TODO:Change this with token management
  const existingToken = await getStoredToken();
  const expired = await isTokenExpired();

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already logged in. Do you want to re-authenticate?",
      initialValue: false,
    });

    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login cancelled.");
      process.exit(0);
    }
  }
  const authClient = createAuthClient({
    baseURL: serverUrl,
    clientId,
    plugins: [deviceAuthorizationClient()],
  });
  const spinner = yoctoSpinner({ text: "Requesting device authorizatiion" });
  spinner.start();

  try {
    const { data, error } = await authClient.device.code({
      client_id: clientId,
      scope: "openid profile email ",
    });
    spinner.stop();

    if (error || !data) {
      logger.error(
        `Failed to get device authorization: ${error.error_description}`
      );
      process.exit(1);
    }

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      interval = 5,
    } = data;

    console.log(chalk.cyan("Device Authorization Required."));

    console.log(
      `\nPlease visit ${chalk.underline.cyan(
        verification_uri || verification_uri_complete
      )}`
    );
    console.log(`Enter the code: ${chalk.bold.yellow(user_code)}\n`);

    const shouldOpen = await confirm({
      message: "Open Browser automatically",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      const urlToOpen = verification_uri_complete || verification_uri;
      open(urlToOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization ${Math.floor(expires_in / 60)} minutes...`
      )
    );

    const token = await pollToToken(
      authClient,
      device_code,
      clientId,
      interval
    );

    if (token) {
      const saved = await storeToken(token);

      if (!saved) {
        console.log(
          chalk.yellow("\n warning: Could not save authentication token \n")
        );
        console.log(chalk.yellow("You may need to login again on next use."));
      }

      //todo: fetch user info and display
      outro(chalk.green("Login successful!"));

      console.log(
        chalk.gray(`
        \n Token saved to ${TOKEN_FILE}
      `)
      );
      console.log(
        chalk.gray("You can now use the CLI with your authenticated session.")
      );
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Login failed: ${error.message}`));
    process.exit(1);
  }
}

async function pollToToken(
  authClient,
  deviceCode,
  clientId,
  InitialIntervalue
) {
  let pollingInterval = InitialIntervalue;
  const spinner = yoctoSpinner({
    text: "Waiting for user authorization...",
    color: "cyan",
  });
  let dots = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(
        `Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`
      );

      if (!spinner.isSpinning) spinner.start();

      try {
        const { data, error } = await authClient.device.token({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          fetchOptions: {
            headers: {
              "user-agent": `My CLI`,
            },
          },
        });

        if (data?.access_token) {
          console.log(
            chalk.yellow("Your access token is: "),
            data.access_token
          );
          spinner.stop();
          resolve(data);
          return;
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              // Continue polling
              break;
            case "slow_down":
              pollingInterval += 5;
              break;
            case "access_denied":
              console.error(chalk.red("Access denied by user."));
              return;
            case "expired_token":
              console.error(
                chalk.red("Device code has expired.Please try again.")
              );
              return;
            default:
              spinner.stop();
              logger.error(
                chalk.red(
                  `Error during token polling: ${error.error_description}`
                )
              );
              process.exit(1);
          }
        }
      } catch (error) {
        spinner.stop();
        logger.error(chalk.red(`Network error: ${error.message}`));
        process.exit(1);
      }
      setTimeout(poll, pollingInterval * 1000);
    };
    setTimeout(poll, pollingInterval * 1000);
  });
}

// ============================================
// LOGOUT COMMAND
// ============================================

export async function logoutAction() {
  intro(chalk.bold("👋 Logout"));

  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow("You're not logged in."));
    process.exit(0);
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to logout?",
    initialValue: false,
  });

  if (isCancel(shouldLogout) || !shouldLogout) {
    cancel("Logout cancelled");
    process.exit(0);
  }

  const cleared = await clearStoredToken();

  if (cleared) {
    outro(chalk.green("✅ Successfully logged out!"));
  } else {
    console.log(chalk.yellow("⚠️  Could not clear token file."));
  }
}

// ============================================
// WHOAMI COMMAND
// ============================================

export async function whoamiAction(opts) {
  const token = await requireAuth();
  if (!token?.access_token) {
    console.log("No access token found. Please login.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // Output user session info
  console.log(
    chalk.bold.greenBright(`\n👤 User: ${user.name}
📧 Email: ${user.email}
👤 ID: ${user.id}`)
  );
}

// ======================
// COMMANDER SETUP
// =================

export const login = new Command("login")
  .description("Login to your Better Auth")
  .option("--server-url <url>", "Authentication server URL", URL)
  .option("--client-id <id>", "OAuth Client ID", CLIENT_ID)
  .action(loginAction);

export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .action(whoamiAction);
