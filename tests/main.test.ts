import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { drop } from "@mswjs/data";
import { Octokit } from "@octokit/rest";
import { CommentHandler } from "@ubiquity-os/plugin-sdk";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { ethers } from "ethers";
import { plugin } from "../src/plugin";
import { Context } from "../src/types/index";
import { db } from "./__mocks__/db";
import dbSeed from "./__mocks__/db-seed.json";
import { server } from "./__mocks__/node";
import commentCreatedPayload from "./__mocks__/payloads/comment-created.json";

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});

afterAll(() => server.close());

const eventName = "issue_comment.created";

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    JsonRpcProvider: jest.fn(() => ({
      resolveName: jest.fn(async () => "0x0000000000000000000000000000000000000001"),
    })),
    getAddress: (jest.requireActual("ethers") as typeof ethers).getAddress,
  },
}));

jest.unstable_mockModule("@ubiquity-os/plugin-sdk", () => ({
  postComment: jest.fn(),
}));

describe("Wallet command tests", () => {
  beforeEach(() => {
    drop(db);
    for (const dbTable of Object.keys(dbSeed)) {
      const tableName = dbTable as keyof typeof dbSeed;
      for (const dbRow of dbSeed[tableName]) {
        db[tableName].create(dbRow);
      }
    }
  });

  it("Should handle /wallet comment", async () => {
    const spy = jest.spyOn(Logs.prototype, "ok");

    // first we unset the wallet as the db is seeded with the wallet already set

    const context = {
      eventName: eventName,
      config: { registerWalletWithVerification: false },
      payload: {
        ...commentCreatedPayload,
        comment: {
          ...commentCreatedPayload.comment,
          body: "/wallet unset",
        },
      },
      command: null,
      octokit: new Octokit(),
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
      },
      logger: new Logs("debug"),
      commentHandler: new CommentHandler(),
    } as unknown as Context;
    await plugin(context);
    expect(spy).toHaveBeenCalledTimes(1);

    expect(spy).toHaveBeenLastCalledWith("Successfully unset wallet");

    context.payload.comment.body = "/wallet set my wallet to ubiquibot.eth";
    context.command = {
      name: "wallet",
      parameters: {
        walletAddress: "ubiquibot.eth",
        unset: false,
      },
    };
    await plugin(context);
    expect(spy).toHaveBeenCalledTimes(2);

    expect(spy).toHaveBeenLastCalledWith(
      "Successfully set wallet",
      expect.objectContaining({
        address: "0xefC0e701A824943b469a694aC564Aa1efF7Ab7dd",
        sender: "ubiquibot",
      })
    );
  }, 20000);

  it("Should handle wallet command", async () => {
    const spy = jest.spyOn(Logs.prototype, "ok");

    // first we unset the wallet as the db is seeded with the wallet already set

    const context = {
      eventName: eventName,
      config: { registerWalletWithVerification: false },
      payload: {
        ...commentCreatedPayload,
        comment: {
          ...commentCreatedPayload.comment,
          body: "/wallet unset",
        },
      },
      command: null,
      octokit: new Octokit(),
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
      },
      logger: new Logs("debug"),
      commentHandler: new CommentHandler(),
    } as unknown as Context;
    await plugin(context);
    expect(spy).toHaveBeenCalledTimes(1);

    expect(spy).toHaveBeenLastCalledWith("Successfully unset wallet");

    // Now set the wallet
    context.payload.comment.body = "@UbiquityOS set my wallet to ubiquibot.eth";
    context.command = {
      name: "wallet",
      parameters: {
        walletAddress: "ubiquibot.eth",
        unset: false,
      },
    };
    await plugin(context);
    expect(spy).toHaveBeenCalledTimes(2);

    expect(spy).toHaveBeenLastCalledWith(
      "Successfully set wallet",
      expect.objectContaining({
        address: "0xefC0e701A824943b469a694aC564Aa1efF7Ab7dd",
        sender: "ubiquibot",
      })
    );
  }, 20000);

  it("should warn if the wallet is already registered to the user", async () => {
    const spy = jest.spyOn(Logs.prototype, "warn");
    await plugin({
      eventName: eventName,
      config: { registerWalletWithVerification: false },
      payload: {
        ...commentCreatedPayload,
        comment: {
          ...commentCreatedPayload.comment,
          body: "/wallet 0xefC0e701A824943b469a694aC564Aa1efF7Ab7dd",
        },
      },
      command: {
        name: "wallet",
        parameters: {
          walletAddress: "0xefC0e701A824943b469a694aC564Aa1efF7Ab7dd",
        },
      },
      octokit: new Octokit(),
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
      },
      logger: new Logs("info"),
      commentHandler: new CommentHandler(),
    } as unknown as Context);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith("This wallet address is already registered to your account.");
  }, 20000);

  it("should warn if the wallet is already registered to another user", async () => {
    const spy = jest.spyOn(Logs.prototype, "warn");
    await plugin({
      eventName: eventName,
      config: { registerWalletWithVerification: false },
      payload: {
        ...commentCreatedPayload,
        comment: {
          ...commentCreatedPayload.comment,
          body: "/wallet 0x0000000000000000000000000000000000000002",
        },
      },
      command: {
        name: "wallet",
        parameters: {
          walletAddress: "0x0000000000000000000000000000000000000002",
        },
      },
      octokit: new Octokit(),
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
      },
      logger: new Logs("info"),
      commentHandler: new CommentHandler(),
    } as unknown as Context);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith("This wallet address is already registered to another user.");
  }, 20000);
});
