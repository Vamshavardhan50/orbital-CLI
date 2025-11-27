#! /usr/bin/env node

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";
import { login, logout, whoami } from "./commands/auth/login.js";

import { wakeUp } from "./commands/ai/wakeUp.js";
dotenv.config();

async function main() {
  console.log(
    chalk.red(
      figlet.textSync("Orbital CLI", {
        font: "Standard",
        horizontalLayout: "default",
      })
    )
  );

  console.log(chalk.green("Welcome to the Orbital CLI!\n"));
  const program = new Command("Orbital");

  program
    .version("0.0.1")
    .description("Orbital CLI - Device Flow Authentication");

  program.addCommand(wakeUp);
  program.addCommand(login);
  program.addCommand(logout);
  program.addCommand(whoami);

  program.action(() => {
    program.help();
  });
  program.parse();
}
main().catch((err) => {
  console.log(chalk.red("Error starting CLI: "), err);
  process.exit(1);
});
