import 'package:cloud_firestore/cloud_firestore.dart';

class MiningSessionModel {
  final String sessionId;
  final String uid;
  final DateTime sessionStart;
  final DateTime sessionEnd;
  final double baseRate;
  final double boostRate;
  final double totalRate;
  final double accumulatedReward;
  final String status; // ACTIVE, COMPLETED, CLAIMED

  MiningSessionModel({
    required this.sessionId,
    required this.uid,
    required this.sessionStart,
    required this.sessionEnd,
    required this.baseRate,
    required this.boostRate,
    required this.totalRate,
    required this.accumulatedReward,
    required this.status,
  });

  bool get isActive {
    final now = DateTime.now();
    return status == 'ACTIVE' && now.isBefore(sessionEnd);
  }

  Duration get remainingTime {
    final now = DateTime.now();
    if (now.isAfter(sessionEnd)) return Duration.zero;
    return sessionEnd.difference(now);
  }

  factory MiningSessionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return MiningSessionModel(
      sessionId: doc.id,
      uid: data['uid'] ?? '',
      sessionStart: (data['sessionStart'] as Timestamp).toDate(),
      sessionEnd: (data['sessionEnd'] as Timestamp).toDate(),
      baseRate: (data['baseRate'] as num?)?.toDouble() ?? 0.2,
      boostRate: (data['boostRate'] as num?)?.toDouble() ?? 0.0,
      totalRate: (data['totalRate'] as num?)?.toDouble() ?? 0.2,
      accumulatedReward: (data['accumulatedReward'] as num?)?.toDouble() ?? 0.0,
      status: data['status'] ?? 'COMPLETED',
    );
  }
}
