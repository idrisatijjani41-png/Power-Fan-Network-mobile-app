import 'package:cloud_firestore/cloud_firestore.dart';

class KycRecordModel {
  final int currentLevel;
  final bool faceVerified;
  final bool govIdVerified;
  final bool biometricVerified;
  final String? rejectionReason;

  KycRecordModel({
    required this.currentLevel,
    required this.faceVerified,
    required this.govIdVerified,
    required this.biometricVerified,
    this.rejectionReason,
  });

  factory KycRecordModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return KycRecordModel(
      currentLevel: (data['currentLevel'] as num?)?.toInt() ?? 0,
      faceVerified: data['faceVerified'] ?? false,
      govIdVerified: data['govIdVerified'] ?? false,
      biometricVerified: data['biometricVerified'] ?? false,
      rejectionReason: data['rejectionReason'],
    );
  }
}
