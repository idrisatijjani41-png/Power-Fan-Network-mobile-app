// ============================================================
// 8. SOCIAL MEDIA OAUTH / API VERIFICATION
// ============================================================
//
// POWER FAN NETWORK
// SERVER-AUTHORITATIVE SOCIAL REWARD SYSTEM
//
// Supported:
//   X
//   TikTok
//   YouTube
//   Telegram
//   Facebook / Instagram OAuth connection
//
// IMPORTANT:
// - Flutter never receives client secrets.
// - Flutter never creates VERIFIED records.
// - Flutter never creates reward transactions.
// - Flutter never changes FAN balance.
// - OAuth state is one-time and expires.
// - X uses OAuth 2.0 PKCE.
// - Rewards are granted only after server verification.
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

  // X PKCE
  codeVerifier?: string;

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

// ============================================================
// GENERATE PKCE VALUES
// ============================================================

function generatePkceVerifier(): string {
  return crypto
    .randomBytes(48)
    .toString("base64url");
}

function generatePkceChallenge(
  verifier: string,
): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

// ============================================================
// GET SOCIAL TASK CONFIG
// ============================================================

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
// START SOCIAL OAUTH
// ============================================================

export const startSocialOAuth =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      const platform =
        requirePlatform(data?.platform);

      if (!isValidString(data?.taskId)) {
        throwInvalid(
          "taskId is required.",
        );
      }

      const taskId =
        data.taskId.trim();

      const now =
        admin.firestore.Timestamp.now();

      const expiresAt =
        admin.firestore.Timestamp.fromMillis(
          Date.now() +
            10 * 60 * 1000,
        );

      const state =
        crypto
          .randomBytes(32)
          .toString("hex");

      let codeVerifier:
        | string
        | undefined;

      let authorizationUrl = "";

      // ======================================================
      // X
      // ======================================================

      if (platform === "x") {
        const clientId =
          process.env.X_CLIENT_ID;

        const redirectUri =
          process.env.X_REDIRECT_URI;

        if (
          !clientId ||
          !redirectUri
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "X OAuth is not configured.",
          );
        }

        codeVerifier =
          generatePkceVerifier();

        const codeChallenge =
          generatePkceChallenge(
            codeVerifier,
          );

        const scopes = [
          "users.read",
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
            code_challenge:
              codeChallenge,
            code_challenge_method:
              "S256",
          });

        authorizationUrl =
          "https://x.com/i/oauth2/authorize?" +
          params.toString();
      }

      // ======================================================
      // TIKTOK
      // ======================================================

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

        const scopes =
          "user.info.basic";

        const params =
          new URLSearchParams({
            client_key:
              clientKey,

            response_type:
              "code",

            scope:
              scopes,

            redirect_uri:
              redirectUri,

            state,
          });

        authorizationUrl =
          "https://www.tiktok.com/v2/auth/authorize/?" +
          params.toString();
      }

      // ======================================================
      // YOUTUBE / GOOGLE
      // ======================================================

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

        const scopes =
          "https://www.googleapis.com/auth/youtube.readonly";

        const params =
          new URLSearchParams({
            client_id:
              clientId,

            redirect_uri:
              redirectUri,

            response_type:
              "code",

            access_type:
              "offline",

            prompt:
              "consent",

            scope:
              scopes,

            state,
          });

        authorizationUrl =
          "https://accounts.google.com/o/oauth2/v2/auth?" +
          params.toString();
      }

      // ======================================================
      // FACEBOOK / INSTAGRAM
      // ======================================================

      if (
        platform === "facebook" ||
        platform === "instagram"
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
            client_id:
              clientId,

            redirect_uri:
              redirectUri,

            response_type:
              "code",

            state,
          });

        authorizationUrl =
          "https://www.facebook.com/v24.0/dialog/oauth?" +
          params.toString();
      }

      // ======================================================
      // TELEGRAM
      // ======================================================

      if (platform === "telegram") {
        const stateRef =
          db
            .collection("oauthStates")
            .doc(state);

        await stateRef.set({
          uid,
          platform,
          taskId,
          state,
          createdAt: now,
          expiresAt,
        });

        return {
          status:
            "TELEGRAM_REQUIRES_BOT_VERIFICATION",

          platform,
          taskId,
          state,
        };
      }

      // ======================================================
      // SAVE OAUTH STATE
      // ======================================================

      const stateRef =
        db
          .collection("oauthStates")
          .doc(state);

      const stateData:
        OAuthStateData = {
        uid,
        platform,
        taskId,
        state,
        createdAt: now,
        expiresAt,
      };

      if (codeVerifier) {
        stateData.codeVerifier =
          codeVerifier;
      }

      await stateRef.set(
        stateData,
      );

      return {
        status: "SUCCESS",
        platform,
        taskId,
        authorizationUrl,
      };
    });

// ============================================================
// 9. SOCIAL OAUTH CALLBACK
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

        const oauthError =
          typeof req.query.error === "string"
            ? req.query.error
            : null;

        if (oauthError) {
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
          db
            .collection("oauthStates")
            .doc(state);

        const stateDoc =
          await stateRef.get();

        if (!stateDoc.exists) {
          res
            .status(400)
            .send(
              "Invalid or already-used OAuth state.",
            );

          return;
        }

        const oauthState =
          stateDoc.data() as OAuthStateData;

        // ====================================================
        // EXPIRATION CHECK
        // ====================================================

        if (
          !oauthState.expiresAt ||
          oauthState.expiresAt.toMillis() <
            Date.now()
        ) {
          await stateRef.delete();

          res
            .status(400)
            .send(
              "OAuth session expired.",
            );

          return;
        }

        const {
          uid,
          platform,
          taskId,
          codeVerifier,
        } = oauthState;

        // ====================================================
        // ONE-TIME STATE
        // ====================================================

        await stateRef.delete();

        // ====================================================
        // X OAUTH 2.0 PKCE
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
            !redirectUri ||
            !codeVerifier
          ) {
            throw new Error(
              "X OAuth configuration is incomplete.",
            );
          }

          const basicAuth =
            Buffer
              .from(
                `${clientId}:${clientSecret}`,
              )
              .toString("base64");

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
                      codeVerifier,
                  }),
              },
            );

          if (!tokenResponse.ok) {
            const body =
              await tokenResponse.text();

            console.error(
              "X token error:",
              body,
            );

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

          // -----------------------------------------------
          // GET AUTHENTICATED X USER
          // -----------------------------------------------

          const meResponse =
            await fetch(
              "https://api.x.com/2/users/me",
              {
                headers: {
                  Authorization:
                    `Bearer ${token.access_token}`,
                },
              },
            );

          if (!meResponse.ok) {
            throw new Error(
              "X user lookup failed.",
            );
          }

          const me =
            await meResponse.json() as {
              data?: {
                id?: string;
                username?: string;
              };
            };

          const xUserId =
            me.data?.id;

          if (!xUserId) {
            throw new Error(
              "X user ID missing.",
            );
          }

          // -----------------------------------------------
          // STORE NON-SECRET ACCOUNT DATA
          // -----------------------------------------------

          await db
            .collection("users")
            .doc(uid)
            .collection("socialAccounts")
            .doc("x")
            .set(
              {
                platform: "x",

                platformUserId:
                  xUserId,

                username:
                  me.data?.username ||
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

          // -----------------------------------------------
          // VERIFY FOLLOW
          // -----------------------------------------------

          const configDoc =
            await db
              .collection("config")
              .doc("socialTasks")
              .get();

          const xConfig =
            configDoc.data()?.x;

          const targetUserId =
            xConfig?.targetUserId;

          if (!targetUserId) {
            throw new Error(
              "X targetUserId is not configured.",
            );
          }

          const followingUrl =
            new URL(
              `https://api.x.com/2/users/${encodeURIComponent(
                xUserId,
              )}/following`,
            );

          followingUrl.searchParams.set(
            "max_results",
            "1000",
          );

          const followingResponse =
            await fetch(
              followingUrl.toString(),
              {
                headers: {
                  Authorization:
                    `Bearer ${token.access_token}`,
                },
              },
            );

          if (!followingResponse.ok) {
            throw new Error(
              "X following verification failed.",
            );
          }

          const following =
            await followingResponse.json() as {
              data?: Array<{
                id?: string;
              }>;
            };

          const followsUs =
            (following.data || [])
              .some(
                (user) =>
                  user.id ===
                  targetUserId,
              );

          if (!followsUs) {
            res
              .status(400)
              .send(
                "X follow was not verified.",
              );

            return;
          }

          await createSocialVerification(
            uid,
            taskId,
            "x",
            targetUserId,
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
              "TikTok OAuth configuration is incomplete.",
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
            const body =
              await tokenResponse.text();

            console.error(
              "TikTok token error:",
              body,
            );

            throw new Error(
              "TikTok token exchange failed.",
            );
          }

          const token =
            await tokenResponse.json() as {
              access_token?: string;
              open_id?: string;
              refresh_token?: string;
              scope?: string;
            };

          if (
            !token.access_token ||
            !token.open_id
          ) {
            throw new Error(
              "TikTok authorization failed.",
            );
          }

          // Save public account identity only.
          await db
            .collection("users")
            .doc(uid)
            .collection("socialAccounts")
            .doc("tiktok")
            .set(
              {
                platform:
                  "tiktok",

                platformUserId:
                  token.open_id,

                connected: true,

                grantedScopes:
                  token.scope ||
                  null,

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
           * TikTok Login Kit proves authorization/login.
           * It does NOT by itself prove the user followed
           * Power Fan Network.
           *
           * Therefore NO reward is granted here.
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
              "Google OAuth configuration is incomplete.",
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
            };

          if (!token.access_token) {
            throw new Error(
              "YouTube access token missing.",
            );
          }

          // -----------------------------------------------
          // TARGET CHANNEL
          // -----------------------------------------------

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
              "YouTube targetChannelId is not configured.",
            );
          }

          // -----------------------------------------------
          // CHECK SUBSCRIPTION
          // -----------------------------------------------

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
              "YouTube subscription API failed.",
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
            res
              .status(400)
              .send(
                "YouTube subscription was not verified.",
              );

            return;
          }

          await createSocialVerification(
            uid,
            taskId,
            "youtube",
            targetChannelId,
          );
        }

        // ====================================================
        // FACEBOOK / INSTAGRAM
        // ====================================================

        if (
          platform === "facebook" ||
          platform === "instagram"
        ) {
          /*
           * OAuth authorization alone is NOT considered
           * proof that the user followed/liked the Power Fan
           * Network account.
           *
           * We record the connection only.
           *
           * Reward remains UNVERIFIED.
           *
           * This prevents fake rewards caused by treating
           * login as follow verification.
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
            "Social authorization completed.",
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
// 10. CREATE VERIFIED SOCIAL RECORD
// ============================================================
//
// ONLY trusted backend code calls this.
// Flutter cannot call it.
// ============================================================

async function createSocialVerification(
  uid: string,
  taskId: string,
  platform: SocialPlatform,
  evidenceId: string,
): Promise<void> {
  const configDoc =
    await db
      .collection("config")
      .doc("socialTasks")
      .get();

  const platformConfig =
    configDoc.data()?.[platform];

  const rewardAmount =
    Number(
      platformConfig?.reward || 0,
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

  const userRef =
    db
      .collection("users")
      .doc(uid);

  const verificationRef =
    userRef
      .collection("taskVerifications")
      .doc(taskId);

  const existing =
    await verificationRef.get();

  if (
    existing.exists &&
    existing.data()?.status ===
      "VERIFIED"
  ) {
    return;
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
    {
      merge: true,
    },
  );
}

// ============================================================
// 11. TELEGRAM MEMBERSHIP VERIFICATION
// ============================================================
//
// Telegram Bot API verifies actual membership.
// The client cannot mark itself as verified.
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
          "Telegram chatId is not configured.",
        );
      }

      const response =
        await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                chat_id:
                  chatId,

                user_id:
                  telegramUserId,
              }),
          },
        );

      if (!response.ok) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Telegram API request failed.",
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

      const status =
        result.result?.status;

      const isMember =
        status === "member" ||
        status === "administrator" ||
        status === "creator";

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
        status:
          "VERIFIED",

        platform:
          "telegram",

        taskId,
      };
    });
