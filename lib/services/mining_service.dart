import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/mining_model.dart';

class MiningService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Stream active mining session directly from Firestore
  Stream<MiningSessionModel?> streamActiveSession(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('miningSessions')
        .doc('active')
        .snapshots()
        .map((doc) => doc.exists ? MiningSessionModel.fromFirestore(doc) : null);
  }

  // Trigger Start Mining via Secure Cloud Function
  Future<void> startMiningSession() async {
    try {
      final HttpsCallable callable = _functions.httpsCallable('startMiningSession');
      await callable.call();
    } on FirebaseFunctionsException catch (e) {
      throw Exception(e.message ?? 'Failed to start mining session.');
    }
  }
}
