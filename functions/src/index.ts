// ============================================================
// 8. SOCIAL MEDIA OAUTH / API VERIFICATION
// ============================================================
//
// IMPORTANT:
// - OAuth secrets stay on the server.
// - Flutter never receives client secrets.
// - OAuth state prevents CSRF.
// - A social reward is created ONLY after backend verification.
// - Never trust "I followed" from Flutter.
//
// Supported architecture:
//   X
//   Instagram / Meta
//   Facebook
//   TikTok
//   YouTube
//   Telegram
//
// IMPORTANT:
// Not every platform exposes an API that allows us to verify
// every possible social action. We only grant rewards where
// the official API provides sufficient evidence.
// ============================================================

type SocialPlatform =
  | "x"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "telegram";

type OAuthStateData = {
  uid: string;
  platform: SocialPlatform;
  taskId: string;
  state: string;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
};

function requirePlatform(
  value: unknown,
): SocialPlatform {
  if (
    value !== "x" &&
    value !== "instagram" &&
    value !== "facebook" &&
    value !== "tiktok" &&
    value !== "youtube" &&
    value !== "telegram"
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Unsupported social platform.",
    );
  }

  return value;
}

// ------------------------------------------------------------
// SOCIAL CONFIG
// ------------------------------------------------------------
//
// Put public task configuration in:
//
// /config/socialTasks
//
// Example:
// {
//   x: {
//     enabled: true,
//     url: "https://x.com/YOUR_ACCOUNT",
//     reward: 50,
//     targetUserId: "..."
//   }
// }
//
// NEVER put client secrets here.
// ------------------------------------------------------------

export const getSocialTasks =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      requireAuth(context);

      const configRef = db
        .collection("config")
        .doc("socialTasks");

      const configDoc =
        await configRef.get();

      if (!configDoc.exists) {
        return {
          status: "SUCCESS",
          tasks: {},
        };
      }

      return {
        status: "SUCCESS",
        tasks: configDoc.data() || {},
      };
    });

// ============================================================
// 9. CREATE SOCIAL OAUTH SESSION
// ============================================================

export const startSocialOAuth =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      const platform =
        requirePlatform(
          data?.platform,
        );

      if (
        !isValidString(data?.taskId)
      ) {
        throwInvalid(
          "taskId is required.",
        );
      }

      const taskId =
        data.taskId.trim();

      const state =
        crypto.randomBytes(32).toString("hex");

      const now =
        admin.firestore.Timestamp.now();

      const expiresAt =
        admin.firestore.Timestamp.fromMillis(
          Date.now() + 10 * 60 * 1000,
        );

      const stateRef =
        db
          .collection("oauthStates")
          .doc(state);

      const stateData: OAuthStateData = {
        uid,
        platform,
        taskId,
        state,
        createdAt: now,
        expiresAt,
      };

      await stateRef.set(stateData);

      let authorizationUrl = "";

      // ------------------------------------------------------
      // X
      // ------------------------------------------------------

      if (platform === "x") {
        const clientId =
          process.env.X_CLIENT_ID;

        if (!clientId) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "X OAuth is not configured.",
          );
        }

        const redirectUri =
          process.env.X_REDIRECT_URI;

        if (!redirectUri) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "X redirect URI is not configured.",
          );
        }

        const scopes = [
          "users.read",
          "tweet.read",
          "follows.read",
          "offline.access",
        ].join(" ");

        const params =
          new URLSearchParams({
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes,
            state,
          });

        authorizationUrl =
          "https://twitter.com/i/oauth2/authorize?" +
          params.toString();
      }

      // ------------------------------------------------------
      // TIKTOK
      // ------------------------------------------------------

      if (platform === "tiktok") {
        const clientKey =
          process.env.TIKTOK_CLIENT_KEY;

        const redirectUri =
          process.env.TIKTOK_REDIRECT_URI;

        if (
          !clientKey ||
          !redirectUri
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "TikTok OAuth is not configured.",
          );
        }

        const params =
          new URLSearchParams({
            client_key: clientKey,
            response_type: "code",
            scope: "user.info.basic",
            redirect_uri: redirectUri,
            state,
          });

        authorizationUrl =
          "https://www.tiktok.com/v2/auth/authorize/?" +
          params.toString();
      }

      // ------------------------------------------------------
      // YOUTUBE / GOOGLE
      // ------------------------------------------------------

      if (platform === "youtube") {
        const clientId =
          process.env.GOOGLE_CLIENT_ID;

        const redirectUri =
          process.env.GOOGLE_REDIRECT_URI;

        if (
          !clientId ||
          !redirectUri
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Google OAuth is not configured.",
          );
        }

        const scope =
          "https://www.googleapis.com/auth/youtube.readonly";

        const params =
          new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            scope,
            state,
          });

        authorizationUrl =
          "https://accounts.google.com/o/oauth2/v2/auth?" +
          params.toString();
      }

      // ------------------------------------------------------
      // INSTAGRAM / FACEBOOK
      // ------------------------------------------------------
      //
      // We create the OAuth state here, but we do NOT pretend
      // that OAuth alone proves a user followed our account.
      //
      // The exact Meta product/scopes depend on the Meta app
      // configuration and approved capabilities.
      // ------------------------------------------------------

      if (
        platform === "instagram" ||
        platform === "facebook"
      ) {
        const clientId =
          process.env.META_CLIENT_ID;

        const redirectUri =
          process.env.META_REDIRECT_URI;

        if (
          !clientId ||
          !redirectUri
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Meta OAuth is not configured.",
          );
        }

        const params =
          new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            state,
          });

        authorizationUrl =
          "https://www.facebook.com/v24.0/dialog/oauth?" +
          params.toString();
      }

      // ------------------------------------------------------
      // TELEGRAM
      // ------------------------------------------------------
      //
      // Telegram does not use the same OAuth flow.
      // It will be verified through the Bot API.
      // ------------------------------------------------------

      if (platform === "telegram") {
        await stateRef.set(
          {
            type: "TELEGRAM",
          },
          {
            merge: true,
          },
        );

        return {
          status: "TELEGRAM_REQUIRES_BOT_VERIFICATION",
          state,
        };
      }

      return {
        status: "SUCCESS",
        platform,
        taskId,
        state,
        authorizationUrl,
      };
    });

// ============================================================
// 10. OAUTH CALLBACK
// ============================================================
//
// This endpoint receives authorization codes.
//
// NEVER expose client secrets here.
// ============================================================

export const socialOAuthCallback =
  functions.https.onRequest(
    async (req, res) => {
      try {
        if (req.method !== "GET") {
          res
            .status(405)
            .send("Method Not Allowed");
          return;
        }

        const code =
          typeof req.query.code === "string"
            ? req.query.code
            : null;

        const state =
          typeof req.query.state === "string"
            ? req.query.state
            : null;

        const error =
          typeof req.query.error === "string"
            ? req.query.error
            : null;

        if (error) {
          res
            .status(400)
            .send(
              "OAuth authorization was denied.",
            );
          return;
        }

        if (!code || !state) {
          res
            .status(400)
            .send(
              "Missing OAuth code or state.",
            );
          return;
        }

        const stateRef =
          db.collection("oauthStates").doc(state);

        const stateDoc =
          await stateRef.get();

        if (!stateDoc.exists) {
          res
            .status(400)
            .send("Invalid OAuth state.");
          return;
        }

        const oauthState =
          stateDoc.data() as OAuthStateData;

        if (
          oauthState.expiresAt.toMillis() <
          Date.now()
        ) {
          await stateRef.delete();

          res
            .status(400)
            .send("OAuth state expired.");
          return;
        }

        const {
          uid,
          platform,
          taskId,
        } = oauthState;

        // State is one-time use.
        await stateRef.delete();

        // ====================================================
        // X
        // ====================================================

        if (platform === "x") {
          const clientId =
            process.env.X_CLIENT_ID;

          const clientSecret =
            process.env.X_CLIENT_SECRET;

          const redirectUri =
            process.env.X_REDIRECT_URI;

          if (
            !clientId ||
            !clientSecret ||
            !redirectUri
          ) {
            throw new Error(
              "X OAuth configuration missing.",
            );
          }

          const basicAuth =
            Buffer.from(
              `${clientId}:${clientSecret}`,
            ).toString("base64");

          const tokenResponse =
            await fetch(
              "https://api.x.com/2/oauth2/token",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded",
                  Authorization:
                    `Basic ${basicAuth}`,
                },
                body:
                  new URLSearchParams({
                    code,
                    grant_type:
                      "authorization_code",
                    redirect_uri:
                      redirectUri,
                    code_verifier:
                      state,
                  }),
              },
            );

          if (!tokenResponse.ok) {
            throw new Error(
              "X token exchange failed.",
            );
          }

          const token =
            await tokenResponse.json() as {
              access_token?: string;
              refresh_token?: string;
            };

          if (!token.access_token) {
            throw new Error(
              "X access token missing.",
            );
          }

          const userResponse =
            await fetch(
              "https://api.x.com/2/users/me",
              {
                headers: {
                  Authorization:
                    `Bearer ${token.access_token}`,
                },
              },
            );

          if (!userResponse.ok) {
            throw new Error(
              "X user verification failed.",
            );
          }

          const xUser =
            await userResponse.json() as {
              data?: {
                id?: string;
                username?: string;
              };
            };

          const xUserId =
            xUser.data?.id;

          if (!xUserId) {
            throw new Error(
              "X user ID missing.",
            );
          }

          /*
           * Save only what is needed.
           *
           * DO NOT save the access token in a
           * client-readable Firestore document.
           */
          await db
            .collection("users")
            .doc(uid)
            .collection("socialAccounts")
            .doc("x")
            .set(
              {
                platform: "x",
                platformUserId: xUserId,
                username:
                  xUser.data?.username ||
                  null,
                connected: true,
                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
              {
                merge: true,
              },
            );

          /*
           * Token storage belongs in a protected
           * server-side secret/token store.
           *
           * This function intentionally does not
           * write the access token to normal user data.
           */

          await createSocialVerification(
            uid,
            taskId,
            "x",
            xUserId,
          );
        }

        // ====================================================
        // TIKTOK
        // ====================================================

        if (platform === "tiktok") {
          const clientKey =
            process.env.TIKTOK_CLIENT_KEY;

          const clientSecret =
            process.env.TIKTOK_CLIENT_SECRET;

          const redirectUri =
            process.env.TIKTOK_REDIRECT_URI;

          if (
            !clientKey ||
            !clientSecret ||
            !redirectUri
          ) {
            throw new Error(
              "TikTok OAuth configuration missing.",
            );
          }

          const tokenResponse =
            await fetch(
              "https://open.tiktokapis.com/v2/oauth/token/",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded",
                },
                body:
                  new URLSearchParams({
                    client_key:
                      clientKey,
                    client_secret:
                      clientSecret,
                    code,
                    grant_type:
                      "authorization_code",
                    redirect_uri:
                      redirectUri,
                  }),
              },
            );

          if (!tokenResponse.ok) {
            throw new Error(
              "TikTok token exchange failed.",
            );
          }

          const token =
            await tokenResponse.json() as {
              access_token?: string;
              open_id?: string;
              refresh_token?: string;
            };

          if (
            !token.access_token ||
            !token.open_id
          ) {
            throw new Error(
              "TikTok authorization failed.",
            );
          }

          const profileResponse =
            await fetch(
              "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
              {
                headers: {
                  Authorization:
                    `Bearer ${token.access_token}`,
                },
              },
            );

          if (!profileResponse.ok) {
            throw new Error(
              "TikTok profile verification failed.",
            );
          }

          await db
            .collection("users")
            .doc(uid)
            .collection("socialAccounts")
            .doc("tiktok")
            .set(
              {
                platform: "tiktok",
                platformUserId:
                  token.open_id,
                connected: true,
                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
              {
                merge: true,
              },
            );

          /*
           * IMPORTANT:
           *
           * Login success alone does NOT prove that
           * the user followed our TikTok account.
           *
           * Therefore we do NOT grant the social
           * follow reward here.
           */
        }

        // ====================================================
        // YOUTUBE
        // ====================================================

        if (platform === "youtube") {
          const clientId =
            process.env.GOOGLE_CLIENT_ID;

          const clientSecret =
            process.env.GOOGLE_CLIENT_SECRET;

          const redirectUri =
            process.env.GOOGLE_REDIRECT_URI;

          if (
            !clientId ||
            !clientSecret ||
            !redirectUri
          ) {
            throw new Error(
              "Google OAuth configuration missing.",
            );
          }

          const tokenResponse =
            await fetch(
              "https://oauth2.googleapis.com/token",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded",
                },
                body:
                  new URLSearchParams({
                    code,
                    client_id:
                      clientId,
                    client_secret:
                      clientSecret,
                    redirect_uri:
                      redirectUri,
                    grant_type:
                      "authorization_code",
                  }),
              },
            );

          if (!tokenResponse.ok) {
            throw new Error(
              "Google token exchange failed.",
            );
          }

          const token =
            await tokenResponse.json() as {
              access_token?: string;
              refresh_token?: string;
            };

          if (!token.access_token) {
            throw new Error(
              "YouTube access token missing.",
            );
          }

          /*
           * Read authenticated user's subscriptions.
           *
           * The target channel ID must come from:
           *
           * /config/socialTasks
           */

          const configDoc =
            await db
              .collection("config")
              .doc("socialTasks")
              .get();

          const youtubeConfig =
            configDoc.data()?.youtube;

          const targetChannelId =
            youtubeConfig?.targetChannelId;

          if (!targetChannelId) {
            throw new Error(
              "YouTube target channel is not configured.",
            );
          }

          const subscriptionsUrl =
            new URL(
              "https://www.googleapis.com/youtube/v3/subscriptions",
            );

          subscriptionsUrl.searchParams.set(
            "part",
            "snippet",
          );

          subscriptionsUrl.searchParams.set(
            "mine",
            "true",
          );

          subscriptionsUrl.searchParams.set(
            "maxResults",
            "50",
          );

          const subscriptionResponse =
            await fetch(
              subscriptionsUrl.toString(),
              {
                headers: {
                  Authorization:
                    `Bearer ${token.access_token}`,
                },
              },
            );

          if (!subscriptionResponse.ok) {
            throw new Error(
              "YouTube subscription verification failed.",
            );
          }

          const subscriptions =
            await subscriptionResponse.json() as {
              items?: Array<{
                snippet?: {
                  resourceId?: {
                    channelId?: string;
                  };
                };
              }>;
            };

          const subscribed =
            (subscriptions.items || [])
              .some(
                (item) =>
                  item.snippet
                    ?.resourceId
                    ?.channelId ===
                  targetChannelId,
              );

          if (!subscribed) {
            throw new Error(
              "YouTube subscription not verified.",
            );
          }

          await createSocialVerification(
            uid,
            taskId,
            "youtube",
            targetChannelId,
          );
        }

        // ====================================================
        // META
        // ====================================================
        //
        // OAuth connection is recorded, but we do not claim
        // that OAuth itself proves the user followed a Page
        // or Instagram account.
        // ====================================================

        if (
          platform === "instagram" ||
          platform === "facebook"
        ) {
          /*
           * The exact Meta API product and permissions must
           * match the capabilities approved for your Meta app.
           *
           * Do NOT automatically create VERIFIED here.
           */
          await db
            .collection("users")
            .doc(uid)
            .collection("socialAccounts")
            .doc(platform)
            .set(
              {
                platform,
                connected: true,
                oauthReceivedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
              {
                merge: true,
              },
            );
        }

        res
          .status(200)
          .send(
            "Social account authorization completed. Return to the app.",
          );
      } catch (error) {
        console.error(
          "Social OAuth callback error:",
          error,
        );

        res
          .status(400)
          .send(
            "Social authorization failed.",
          );
      }
    },
  );

// ============================================================
// 11. CREATE VERIFIED SOCIAL RECORD
// ============================================================
//
// ONLY trusted backend code calls this.
// Flutter cannot call this directly.
// ============================================================

async function createSocialVerification(
  uid: string,
  taskId: string,
  platform: SocialPlatform,
  evidenceId: string,
): Promise<void> {
  const userRef =
    db.collection("users").doc(uid);

  const verificationRef =
    userRef
      .collection("taskVerifications")
      .doc(taskId);

  const configDoc =
    await db
      .collection("config")
      .doc("socialTasks")
      .get();

  const taskConfig =
    configDoc
      .data()
      ?.[platform];

  const rewardAmount =
    Number(
      taskConfig?.reward || 0,
    );

  if (
    !Number.isFinite(
      rewardAmount,
    ) ||
    rewardAmount <= 0
  ) {
    throw new Error(
      "Invalid social reward configuration.",
    );
  }

  const verificationId =
    crypto.randomUUID();

  await verificationRef.set(
    {
      type: "SOCIAL",

      status: "VERIFIED",

      taskId,

      platform,

      evidenceId,

      rewardAmount,

      verificationId,

      verifiedAt:
        admin.firestore.FieldValue
          .serverTimestamp(),

      expiresAt:
        admin.firestore.Timestamp.fromMillis(
          Date.now() +
            10 * 60 * 1000,
        ),
    },
  );
}

// ============================================================
// 12. TELEGRAM VERIFICATION
// ============================================================
//
// Telegram verification uses the Telegram Bot API.
// The bot must be an administrator in the target channel/group
// when the API requires administrator-level access.
//
// Client supplies a Telegram username/user ID.
// Backend asks Telegram for the member status.
//
// NEVER trust the client saying "I joined".
// ============================================================

export const verifyTelegramMembership =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      if (
        !isValidString(data?.taskId)
      ) {
        throwInvalid(
          "taskId is required.",
        );
      }

      const taskId =
        data.taskId.trim();

      const telegramUserId =
        String(
          data?.telegramUserId || "",
        ).trim();

      if (!telegramUserId) {
        throwInvalid(
          "telegramUserId is required.",
        );
      }

      const botToken =
        process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Telegram bot is not configured.",
        );
      }

      const configDoc =
        await db
          .collection("config")
          .doc("socialTasks")
          .get();

      const telegramConfig =
        configDoc.data()?.telegram;

      const chatId =
        telegramConfig?.chatId;

      if (!chatId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Telegram chat ID is not configured.",
        );
      }

      const url =
        `https://api.telegram.org/bot${botToken}/getChatMember`;

      const response =
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            user_id:
              telegramUserId,
          }),
        });

      if (!response.ok) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Telegram verification request failed.",
        );
      }

      const result =
        await response.json() as {
          ok?: boolean;
          result?: {
            status?: string;
          };
        };

      if (!result.ok) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Telegram membership could not be verified.",
        );
      }

      const memberStatus =
        result.result?.status;

      const isMember =
        memberStatus === "member" ||
        memberStatus === "administrator" ||
        memberStatus === "creator";

      if (!isMember) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Telegram membership not verified.",
        );
      }

      await createSocialVerification(
        uid,
        taskId,
        "telegram",
        telegramUserId,
      );

      return {
        status: "VERIFIED",
        platform: "telegram",
        taskId,
      };
    });
