import 'package:cloud_firestore/cloud_firestore.dart';

class TransactionModel {
  final String transactionId;
  final String uid;
  final String type; // MINING, AD_BOOST, SOCIAL_REWARD, REFERRAL, MIGRATION
  final double amount;
  final DateTime timestamp;
  final String status; // SUCCESS, FAILED, PENDING

  TransactionModel({
    required this.transactionId,
    required this.uid,
    required this.type,
    required this.amount,
    required this.timestamp,
    required this.status,
  });

  factory TransactionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return TransactionModel(
      transactionId: doc.id,
      uid: data['uid'] ?? '',
      type: data['type'] ?? 'UNKNOWN',
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      timestamp: data['timestamp'] != null
          ? (data['timestamp'] as Timestamp).toDate()
          : DateTime.now(),
      status: data['status'] ?? 'SUCCESS',
    );
  }
}
