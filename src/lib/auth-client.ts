"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), emailOTPClient()],
});
export const { signIn, signUp, signOut, useSession } = authClient;

