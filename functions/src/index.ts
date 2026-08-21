import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();

const db = admin.firestore();

/*
 * ============================================================
 * POWER FAN NETWORK - SERVER AUTHORITATIVE REWARD SYSTEM
 * ============================================================
 *
 * IMPORTANT:
 * - Client NEVER writes balances.
 * - Client NEVER creates reward transactions.
 * - Client NEVER confirms its own task.
 * - Rewards are granted only by trusted backend logic.
 * - Ad rewards use AdMob Server-Side Verification (SSV).
 * - Social rewards require a trusted verification record.
 */

// ============================================================
// SECURITY / CONFIG
// ============================================================

const MAX_ADS_PER_DAY = 7;

const MINING_DURATION_MS = 24 * 60 * 60 * 1000;

// Keep these values server-side.
// Change them to the actual economics of the app.
const MINING_BASE_RATE = 0.2;
const MINING_BOOST_RATE = 0.2;

// ============================================================
// COMMON HELPERS
// ============================================================

function requireAuth(
  context: functions.https.CallableContext,
): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication is required.",
    );
  }

  return context.auth.uid;
}

function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function dayKey(): string {
  const now = new Date();

  return now.toISOString().slice(0, 10);
}

function throwInvalid(message: string): never {
  throw new functions.https.HttpsError(
    "invalid-argument",
    message,
  );
}

// ============================================================
// 1. START MINING SESSION
// ============================================================

export const startMiningSession =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      const userRef = db.collection("users").doc(uid);

      const sessionRef = userRef
        .collection("miningSessions")
        .doc("active");

      return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User account does not exist.",
          );
        }

        const existingSession =
          await transaction.get(sessionRef);

        const now = admin.firestore.Timestamp.now();

        if (existingSession.exists) {
          const session = existingSession.data();

          if (
            session &&
            session.sessionEnd &&
            session.sessionEnd.toMillis() > now.toMillis() &&
            session.status === "ACTIVE"
          ) {
            throw new functions.https.HttpsError(
              "already-exists",
              "An active mining session already exists.",
            );
          }
        }

        const sessionStart = now;

        const sessionEnd =
          admin.firestore.Timestamp.fromMillis(
            sessionStart.toMillis() +
              MINING_DURATION_MS,
          );

        const sessionData = {
          uid,
          sessionStart,
          sessionEnd,

          // Server authoritative values.
          baseRate: MINING_BASE_RATE,
          boostRate: MINING_BOOST_RATE,
          totalRate:
            MINING_BASE_RATE +
            MINING_BOOST_RATE,

          accumulatedReward: 0,

          status: "ACTIVE",

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        };

        transaction.set(
          sessionRef,
          sessionData,
        );

        return {
          status: "SUCCESS",
          sessionStart:
            sessionStart.toMillis(),
          sessionEnd:
            sessionEnd.toMillis(),
        };
      });
    });

// ============================================================
// 2. CLAIM / FINALIZE MINING REWARD
// ============================================================

export const claimMiningReward =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      const userRef =
        db.collection("users").doc(uid);

      const sessionRef =
        userRef
          .collection("miningSessions")
          .doc("active");

      return db.runTransaction(async (transaction) => {
        const sessionDoc =
          await transaction.get(sessionRef);

        if (!sessionDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "No mining session found.",
          );
        }

        const session =
          sessionDoc.data();

        if (!session) {
          throw new functions.https.HttpsError(
            "internal",
            "Invalid mining session.",
          );
        }

        if (session.status !== "ACTIVE") {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Mining session is not active.",
          );
        }

        const now =
          admin.firestore.Timestamp.now();

        const endTime =
          session.sessionEnd;

        if (!endTime) {
          throw new functions.https.HttpsError(
            "internal",
            "Mining session has no end time.",
          );
        }

        // User cannot claim before 24 hours.
        if (
          now.toMillis() <
          endTime.toMillis()
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Mining session has not finished yet.",
          );
        }

        const baseRate =
          Number(session.baseRate) || 0;

        const boostRate =
          Number(session.boostRate) || 0;

        const totalRate =
          baseRate + boostRate;

        /*
         * Reward is calculated by the server.
         *
         * This is deliberately NOT accepted from
         * the Flutter client.
         */
        const reward =
          Number(
            (totalRate * 24).toFixed(8),
          );

        if (
          !Number.isFinite(reward) ||
          reward <= 0
        ) {
          throw new functions.https.HttpsError(
            "internal",
            "Invalid mining reward.",
          );
        }

        const userDoc =
          await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User account not found.",
          );
        }

        const transactionRef =
          userRef
            .collection("transactions")
            .doc();

        // ONE atomic transaction:
        // balance + transaction + session completion.
        transaction.update(userRef, {
          fanBalance:
            admin.firestore.FieldValue.increment(
              reward,
            ),

          totalMiningRewards:
            admin.firestore.FieldValue.increment(
              reward,
            ),

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.set(
          transactionRef,
          {
            type: "MINING_REWARD",
            amount: reward,
            currency: "FAN",

            sessionId: "active",

            status: "SUCCESS",

            createdAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
        );

        transaction.update(
          sessionRef,
          {
            status: "COMPLETED",

            accumulatedReward:
              reward,

            completedAt:
              admin.firestore.FieldValue.serverTimestamp(),

            updatedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
        );

        return {
          status: "SUCCESS",
          rewardGranted: reward,
        };
      });
    });

// ============================================================
// 3. CREATE AD SESSION
// ============================================================
//
// The app requests a server-generated nonce BEFORE showing
// a rewarded ad.
//
// The nonce is later sent to AdMob as custom_data.
//
// This prevents the client from simply saying:
// "I watched an ad."
// ============================================================

export const createAdSession =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      const nonce = crypto
        .randomBytes(32)
        .toString("hex");

      const ref = db
        .collection("users")
        .doc(uid)
        .collection("adSessions")
        .doc(nonce);

      await ref.set({
        uid,
        nonce,

        status: "PENDING",

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        status: "SUCCESS",
        nonce,
      };
    });

// ============================================================
// 4. ADMOB SERVER-SIDE VERIFICATION
// ============================================================
//
// AdMob calls this HTTP endpoint directly.
//
// NEVER call this from Flutter.
//
// The callback signature is verified using Google's
// AdMob public verification keys.
// ============================================================

const ADMOB_KEYS_URL =
  "https://gstatic.com/admob/reward/verifier-keys.json";

type AdMobKey = {
  keyId: number;
  pem: string;
};

let cachedAdMobKeys:
  Map<number, crypto.KeyObject> | null = null;

let cachedKeysAt = 0;

async function getAdMobKeys(
  forceRefresh = false,
): Promise<Map<number, crypto.KeyObject>> {
  const now = Date.now();

  // Google says cached public keys should not be
  // cached for more than 24 hours.
  if (
    !forceRefresh &&
    cachedAdMobKeys &&
    now - cachedKeysAt <
      23 * 60 * 60 * 1000
  ) {
    return cachedAdMobKeys;
  }

  const response =
    await fetch(ADMOB_KEYS_URL);

  if (!response.ok) {
    throw new Error(
      "Unable to download AdMob verification keys.",
    );
  }

  const json =
    (await response.json()) as {
      keys?: AdMobKey[];
    };

  if (
    !json.keys ||
    !Array.isArray(json.keys) ||
    json.keys.length === 0
  ) {
    throw new Error(
      "AdMob verification keys are empty.",
    );
  }

  const map =
    new Map<number, crypto.KeyObject>();

  for (const key of json.keys) {
    if (
      !key ||
      typeof key.keyId !== "number" ||
      typeof key.pem !== "string"
    ) {
      continue;
    }

    try {
      map.set(
        key.keyId,
        crypto.createPublicKey(
          key.pem,
        ),
      );
    } catch {
      // Ignore malformed key.
    }
  }

  if (map.size === 0) {
    throw new Error(
      "No valid AdMob public keys found.",
    );
  }

  cachedAdMobKeys = map;
  cachedKeysAt = now;

  return map;
}

// ============================================================
// VERIFY ADMOB SIGNATURE
// ============================================================

async function verifyAdMobCallback(
  req: functions.https.Request,
): Promise<{
  valid: boolean;
  transactionId: string;
  userId: string;
  rewardAmount: number;
  rewardItem: string;
  adUnit: string;
  customData: string;
}> {
  const rawUrl =
    req.originalUrl || req.url;

  const questionIndex =
    rawUrl.indexOf("?");

  if (questionIndex < 0) {
    throw new Error(
      "Missing query string.",
    );
  }

  const queryString =
    rawUrl.substring(
      questionIndex + 1,
    );

  const signatureMarker =
    "&signature=";

  const signatureIndex =
    queryString.indexOf(
      signatureMarker,
    );

  if (signatureIndex < 0) {
    throw new Error(
      "Missing AdMob signature.",
    );
  }

  /*
   * IMPORTANT:
   * Do not rebuild or reorder the query string.
   *
   * Google signs the original content before
   * &signature= and &key_id=.
   */
  const signedContent =
    queryString.substring(
      0,
      signatureIndex,
    );

  const afterSignature =
    queryString.substring(
      signatureIndex +
        signatureMarker.length,
    );

  const keyMarker =
    "&key_id=";

  const keyIndex =
    afterSignature.indexOf(
      keyMarker,
    );

  if (keyIndex < 0) {
    throw new Error(
      "Missing AdMob key_id.",
    );
  }

  const signatureText =
    afterSignature.substring(
      0,
      keyIndex,
    );

  const keyIdText =
    afterSignature.substring(
      keyIndex +
        keyMarker.length,
    );

  const keyId =
    Number(keyIdText);

  if (
    !Number.isSafeInteger(keyId)
  ) {
    throw new Error(
      "Invalid AdMob key_id.",
    );
  }

  const signature =
    Buffer.from(
      signatureText,
      "base64url",
    );

  let keys =
    await getAdMobKeys();

  let publicKey =
    keys.get(keyId);

  // Refresh once if Google rotated keys.
  if (!publicKey) {
    keys =
      await getAdMobKeys(true);

    publicKey =
      keys.get(keyId);
  }

  if (!publicKey) {
    throw new Error(
      "Unknown AdMob verification key.",
    );
  }

  const verifier =
    crypto.createVerify(
      "SHA256",
    );

  verifier.update(
    Buffer.from(
      signedContent,
      "utf8",
    ),
  );

  verifier.end();

  const valid =
    verifier.verify(
      {
        key: publicKey,
        dsaEncoding: "der",
      },
      signature,
    );

  if (!valid) {
    throw new Error(
      "Invalid AdMob signature.",
    );
  }

  // Parse values ONLY after signature verification.
  const params =
    new URLSearchParams(
      queryString,
    );

  const transactionId =
    params.get(
      "transaction_id",
    );

  const userId =
    params.get("user_id");

  const rewardAmountText =
    params.get("reward_amount");

  const rewardItem =
    params.get("reward_item");

  const adUnit =
    params.get("ad_unit");

  const customData =
    params.get("custom_data");

  if (
    !transactionId ||
    !userId ||
    !rewardAmountText ||
    !rewardItem ||
    !adUnit ||
    !customData
  ) {
    throw new Error(
      "Incomplete AdMob SSV callback.",
    );
  }

  const rewardAmount =
    Number(rewardAmountText);

  if (
    !Number.isFinite(rewardAmount) ||
    rewardAmount <= 0
  ) {
    throw new Error(
      "Invalid reward amount.",
    );
  }

  return {
    valid: true,
    transactionId,
    userId,
    rewardAmount,
    rewardItem,
    adUnit,
    customData,
  };
}

// ============================================================
// 5. GRANT VERIFIED ADMOB REWARD
// ============================================================

export const admobRewardSsv =
  functions.https.onRequest(
    async (req, res) => {
      if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const verification =
          await verifyAdMobCallback(req);

        if (!verification.valid) {
          res.status(401).send("Invalid");
          return;
        }

        const {
          transactionId,
          userId,
          rewardAmount,
          adUnit,
          customData,
        } = verification;

        /*
         * custom_data should contain:
         * {
         *   uid: "...",
         *   nonce: "..."
         * }
         *
         * It was created by our server before the ad
         * was shown.
         */
        let custom: {
          uid?: string;
          nonce?: string;
        };

        try {
          custom =
            JSON.parse(
              decodeURIComponent(
                customData,
              ),
            );
        } catch {
          res.status(400).send(
            "Invalid custom data",
          );
          return;
        }

        if (
          custom.uid !== userId ||
          !isValidString(custom.nonce)
        ) {
          res.status(400).send(
            "Invalid reward identity",
          );
          return;
        }

        const uid =
          custom.uid;

        const userRef =
          db.collection("users").doc(uid);

        const adSessionRef =
          userRef
            .collection("adSessions")
            .doc(custom.nonce);

        const globalEventRef =
          db.collection("adRewardEvents")
            .doc(transactionId);

        await db.runTransaction(
          async (transaction) => {
            /*
             * Idempotency:
             * If AdMob retries the same transaction,
             * DO NOT reward again.
             */
            const existingEvent =
              await transaction.get(
                globalEventRef,
              );

            if (existingEvent.exists) {
              return;
            }

            const sessionDoc =
              await transaction.get(
                adSessionRef,
              );

            if (!sessionDoc.exists) {
              throw new Error(
                "Unknown ad session.",
              );
            }

            const session =
              sessionDoc.data();

            if (
              !session ||
              session.status !==
                "PENDING"
            ) {
              throw new Error(
                "Ad session already used.",
              );
            }

            const userDoc =
              await transaction.get(
                userRef,
              );

            if (!userDoc.exists) {
              throw new Error(
                "User does not exist.",
              );
            }

            /*
             * Daily limit is checked server-side.
             */
            const today =
              dayKey();

            const dailyRef =
              userRef
                .collection("adSessions")
                .doc(`daily_${today}`);

            const dailyDoc =
              await transaction.get(
                dailyRef,
              );

            const currentCount =
              Number(
                dailyDoc.data()?.count || 0,
              );

            if (
              currentCount >=
              MAX_ADS_PER_DAY
            ) {
              throw new Error(
                "Daily ad limit reached.",
              );
            }

            /*
             * Validate the ad unit against your
             * server configuration.
             *
             * Recommended:
             * store the real AdMob ad unit in:
             *
             * /config/rewards
             *
             * field:
             * rewardedAdUnitId
             */
            const configRef =
              db
                .collection("config")
                .doc("rewards");

            const configDoc =
              await transaction.get(
                configRef,
              );

            const config =
              configDoc.data();

            const expectedAdUnit =
              config?.rewardedAdUnitId;

            const expectedAmount =
              Number(
                config?.adRewardAmount,
              );

            if (
              !expectedAdUnit ||
              !Number.isFinite(
                expectedAmount,
              )
            ) {
              throw new Error(
                "Reward configuration is missing.",
              );
            }

            if (
              adUnit !==
              expectedAdUnit
            ) {
              throw new Error(
                "Unexpected AdMob ad unit.",
              );
            }

            if (
              rewardAmount !==
              expectedAmount
            ) {
              throw new Error(
                "Unexpected AdMob reward amount.",
              );
            }

            const transactionRef =
              userRef
                .collection("transactions")
                .doc();

            /*
             * ATOMIC:
             * 1. increment balance
             * 2. create transaction
             * 3. consume ad session
             * 4. update daily count
             * 5. create global idempotency record
             */

            transaction.update(
              userRef,
              {
                fanBalance:
                  admin.firestore.FieldValue
                    .increment(
                      rewardAmount,
                    ),

                totalAdRewards:
                  admin.firestore.FieldValue
                    .increment(
                      rewardAmount,
                    ),

                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
            );

            transaction.set(
              transactionRef,
              {
                type: "AD_REWARD",
                amount: rewardAmount,
                currency: "FAN",

                adMobTransactionId:
                  transactionId,

                adUnit,

                status: "SUCCESS",

                createdAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
            );

            transaction.update(
              adSessionRef,
              {
                status: "CLAIMED",

                claimedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),

                adMobTransactionId:
                  transactionId,
              },
            );

            transaction.set(
              dailyRef,
              {
                count:
                  currentCount + 1,

                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
              {
                merge: true,
              },
            );

            transaction.set(
              globalEventRef,
              {
                uid,

                transactionId,

                rewardAmount,

                adUnit,

                createdAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              },
            );
          },
        );

        /*
         * Google expects HTTP 200.
         */
        res.status(200).send("OK");
      } catch (error) {
        console.error(
          "AdMob SSV error:",
          error,
        );

        /*
         * Do NOT grant a reward when verification fails.
         */
        res.status(400).send("Rejected");
      }
    },
  );

// ============================================================
// 6. CLAIM VERIFIED SOCIAL/TASK REWARD
// ============================================================
//
// IMPORTANT:
//
// This function does NOT trust:
//   data.completed = true
//
// It requires a verification document created by a
// trusted backend integration.
//
// Example:
//
// /users/{uid}/taskVerifications/{taskId}
//
// {
//   status: "VERIFIED",
//   rewardAmount: 50,
//   expiresAt: ...,
//   verificationId: "..."
// }
//
// The Flutter client must NOT be allowed to create
// or modify these documents.
// ============================================================

export const claimVerifiedTaskReward =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      const uid = requireAuth(context);

      if (
        !data ||
        !isValidString(data.taskId)
      ) {
        throwInvalid(
          "A valid taskId is required.",
        );
      }

      const taskId =
        data.taskId.trim();

      const userRef =
        db.collection("users").doc(uid);

      const verificationRef =
        userRef
          .collection("taskVerifications")
          .doc(taskId);

      const claimRef =
        userRef
          .collection("taskClaims")
          .doc(taskId);

      return db.runTransaction(
        async (transaction) => {
          const verificationDoc =
            await transaction.get(
              verificationRef,
            );

          if (!verificationDoc.exists) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Task has not been verified.",
            );
          }

          const verification =
            verificationDoc.data();

          if (
            !verification ||
            verification.status !==
              "VERIFIED"
          ) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Task verification is not valid.",
            );
          }

          const expiresAt =
            verification.expiresAt;

          if (
            expiresAt &&
            expiresAt.toMillis() <
              Date.now()
          ) {
            throw new functions.https.HttpsError(
              "deadline-exceeded",
              "Task verification has expired.",
            );
          }

          const claimDoc =
            await transaction.get(
              claimRef,
            );

          if (claimDoc.exists) {
            throw new functions.https.HttpsError(
              "already-exists",
              "This task reward has already been claimed.",
            );
          }

          const rewardAmount =
            Number(
              verification.rewardAmount,
            );

          if (
            !Number.isFinite(
              rewardAmount,
            ) ||
            rewardAmount <= 0
          ) {
            throw new functions.https.HttpsError(
              "internal",
              "Invalid server reward configuration.",
            );
          }

          const userDoc =
            await transaction.get(
              userRef,
            );

          if (!userDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "User account does not exist.",
            );
          }

          const txRef =
            userRef
              .collection("transactions")
              .doc();

          transaction.update(
            userRef,
            {
              fanBalance:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              totalTaskRewards:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              totalRewards:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          transaction.set(
            txRef,
            {
              type: "TASK_REWARD",
              taskId,
              amount: rewardAmount,
              currency: "FAN",

              verificationId:
                verification.verificationId ||
                null,

              status: "SUCCESS",

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          transaction.set(
            claimRef,
            {
              status: "CLAIMED",

              rewardAmount,

              verificationId:
                verification.verificationId ||
                null,

              claimedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          /*
           * Consume verification so the same proof
           * cannot be reused.
           */
          transaction.update(
            verificationRef,
            {
              status: "CONSUMED",

              consumedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          return {
            status: "SUCCESS",
            rewardGranted: rewardAmount,
          };
        },
      );
    });

// ============================================================
// 7. SOCIAL REWARD
// ============================================================
//
// This is intentionally NOT a fake "user clicked follow"
// verification.
//
// The actual social platform integration must create the
// VERIFIED document first.
//
// Once verified, this function safely pays it.
// ============================================================

export const claimSocialReward =
  functions
    .runWith({
      enforceAppCheck: true,
    })
    .https.onCall(async (data, context) => {
      if (
        !data ||
        !isValidString(data.taskId)
      ) {
        throwInvalid(
          "A valid social taskId is required.",
        );
      }

      /*
       * Reuse the same secure reward engine.
       */
      const uid =
        requireAuth(context);

      const taskId =
        data.taskId.trim();

      const userRef =
        db.collection("users").doc(uid);

      const verificationRef =
        userRef
          .collection("taskVerifications")
          .doc(taskId);

      const claimRef =
        userRef
          .collection("taskClaims")
          .doc(taskId);

      return db.runTransaction(
        async (transaction) => {
          const verificationDoc =
            await transaction.get(
              verificationRef,
            );

          if (!verificationDoc.exists) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Social task has not been verified.",
            );
          }

          const verification =
            verificationDoc.data();

          if (
            !verification ||
            verification.status !==
              "VERIFIED" ||
            verification.type !==
              "SOCIAL"
          ) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Invalid social verification.",
            );
          }

          const claimDoc =
            await transaction.get(
              claimRef,
            );

          if (claimDoc.exists) {
            throw new functions.https.HttpsError(
              "already-exists",
              "Social reward already claimed.",
            );
          }

          const rewardAmount =
            Number(
              verification.rewardAmount,
            );

          if (
            !Number.isFinite(
              rewardAmount,
            ) ||
            rewardAmount <= 0
          ) {
            throw new functions.https.HttpsError(
              "internal",
              "Invalid social reward.",
            );
          }

          const txRef =
            userRef
              .collection("transactions")
              .doc();

          transaction.update(
            userRef,
            {
              fanBalance:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              totalSocialRewards:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              totalRewards:
                admin.firestore.FieldValue
                  .increment(
                    rewardAmount,
                  ),

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          transaction.set(
            txRef,
            {
              type: "SOCIAL_REWARD",

              taskId,

              amount: rewardAmount,

              currency: "FAN",

              verificationId:
                verification.verificationId ||
                null,

              status: "SUCCESS",

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          transaction.set(
            claimRef,
            {
              status: "CLAIMED",

              rewardAmount,

              verificationId:
                verification.verificationId ||
                null,

              claimedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          transaction.update(
            verificationRef,
            {
              status: "CONSUMED",

              consumedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
          );

          return {
            status: "SUCCESS",
            rewardGranted: rewardAmount,
          };
        },
      );
    });
