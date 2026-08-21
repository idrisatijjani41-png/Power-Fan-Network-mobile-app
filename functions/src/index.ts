import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. START MINING SESSION (Server Authoritative)
export const startMiningSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = context.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const activeSessionRef = userRef.collection("miningSessions").doc("active");

  return db.runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(activeSessionRef);

    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      const now = admin.firestore.Timestamp.now();
      
      if (sessionData && sessionData.sessionEnd.toMillis() > now.toMillis()) {
        throw new functions.https.HttpsError("already-exists", "Active mining session in progress.");
      }
    }

    const startTime = admin.firestore.Timestamp.now();
    const endTime = admin.firestore.Timestamp.fromMillis(startTime.toMillis() + 24 * 60 * 60 * 1000); // 24 Hours

    const newSession = {
      uid: uid,
      sessionStart: startTime,
      sessionEnd: endTime,
      baseRate: 0.2,
      boostRate: 0.2, // Default calculated rate
      totalRate: 0.4,
      accumulatedReward: 0.0,
      status: "ACTIVE",
    };

    transaction.set(activeSessionRef, newSession);
    return { status: "SUCCESS", message: "Mining session started" };
  });
});

// 2. VERIFY AD WATCH & APPLY BOOST
export const verifyAdWatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const uid = context.auth.uid;
  const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const dailyAdRef = db.collection("users").doc(uid).collection("adSessions").doc(todayDate);

  return db.runTransaction(async (transaction) => {
    const adDoc = await transaction.get(dailyAdRef);
    let adsWatched = 0;

    if (adDoc.exists) {
      adsWatched = adDoc.data()?.count || 0;
    }

    if (adsWatched >= 7) {
      throw new functions.https.HttpsError("resource-exhausted", "Maximum 7 ads per day reached.");
    }

    transaction.set(dailyAdRef, { count: adsWatched + 1, lastWatched: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return { status: "SUCCESS", adsWatchedToday: adsWatched + 1 };
  });
});

// 3. CLAIM DAILY SOCIAL TASK REWARD (Idempotent)
export const claimSocialReward = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const uid = context.auth.uid;
  const taskId = data.taskId || "daily_social_task";
  const rewardAmount = 50.0; // Server Configured

  const taskClaimRef = db.collection("users").doc(uid).collection("dailyTasks").doc(taskId);
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const claimDoc = await transaction.get(taskClaimRef);

    if (claimDoc.exists && claimDoc.data()?.status === "CLAIMED") {
      throw new functions.https.HttpsError("already-exists", "Reward has already been claimed.");
    }

    // Increment user balance securely
    transaction.update(userRef, {
      fanBalance: admin.firestore.FieldValue.increment(rewardAmount),
    });

    // Record task completion
    transaction.set(taskClaimRef, {
      status: "CLAIMED",
      rewardAmount: rewardAmount,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Audit Transaction Log
    const txRef = userRef.collection("transactions").doc();
    transaction.set(txRef, {
      type: "SOCIAL_REWARD",
      amount: rewardAmount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "SUCCESS",
    });

    return { status: "SUCCESS", rewardGranted: rewardAmount };
  });
});
