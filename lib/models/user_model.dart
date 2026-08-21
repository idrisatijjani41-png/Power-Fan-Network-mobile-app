import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String uid;
  final String email;
  final double fanBalance;
  final double afamBalance;
  final String referralCode;
  final String? referredBy;
  final int referralCount;
  final int kycLevel;
  final int consecutiveCheckIns;
  final DateTime? lastCheckInDate;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.fanBalance,
    required this.afamBalance,
    required this.referralCode,
    this.referredBy,
    required this.referralCount,
    required this.kycLevel,
    required this.consecutiveCheckIns,
    this.lastCheckInDate,
    required this.createdAt,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return UserModel(
      uid: doc.id,
      email: data['email'] ?? '',
      fanBalance: (data['fanBalance'] as num?)?.toDouble() ?? 0.0,
      afamBalance: (data['afamBalance'] as num?)?.toDouble() ?? 0.0,
      referralCode: data['referralCode'] ?? '',
      referredBy: data['referredBy'],
      referralCount: (data['referralCount'] as num?)?.toInt() ?? 0,
      kycLevel: (data['kycLevel'] as num?)?.toInt() ?? 0,
      consecutiveCheckIns: (data['consecutiveCheckIns'] as num?)?.toInt() ?? 0,
      lastCheckInDate: data['lastCheckInDate'] != null
          ? (data['lastCheckInDate'] as Timestamp).toDate()
          : null,
      createdAt: data['createdAt'] != null
          ? (data['createdAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'fanBalance': fanBalance,
      'afamBalance': afamBalance,
      'referralCode': referralCode,
      'referredBy': referredBy,
      'referralCount': referralCount,
      'kycLevel': kycLevel,
      'consecutiveCheckIns': consecutiveCheckIns,
      'lastCheckInDate': lastCheckInDate != null
          ? Timestamp.fromDate(lastCheckInDate!)
          : null,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
