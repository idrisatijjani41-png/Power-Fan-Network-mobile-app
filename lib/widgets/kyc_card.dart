import 'package:flutter/material.dart';

class KycCard extends StatelessWidget {
  final VoidCallback onCompleteKyc;
  final int currentKycLevel;

  const KycCard({
    super.key,
    required this.onCompleteKyc,
    required this.currentKycLevel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF2C1065),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'K',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'KYC VERIFICATION (Level $currentKycLevel)',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E0A3C)),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Verify your identity to secure your account',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
          OutlinedButton(
            onPressed: onCompleteKyc,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF2C1065)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            child: Row(
              children: const [
                Text(
                  'COMPLETE KYC',
                  style: TextStyle(color: Color(0xFF2C1065), fontSize: 10, fontWeight: FontWeight.bold),
                ),
                Icon(Icons.chevron_right, size: 14, color: Color(0xFF2C1065)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
