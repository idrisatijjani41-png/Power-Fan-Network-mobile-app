import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/kyc_model.dart';

class KycService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  Stream<KycRecordModel> streamKycStatus(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('kyc')
        .doc('status')
        .snapshots()
        .map((doc) => KycRecordModel.fromFirestore(doc));
  }

  Future<void> triggerKycEvaluation() async {
    try {
      final HttpsCallable callable = _functions.httpsCallable('evaluateKycStatus');
      await callable.call();
    } catch (e) {
      rethrow;
    }
  }
}
