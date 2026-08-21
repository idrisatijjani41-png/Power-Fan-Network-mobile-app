import 'package:flutter/material.dart';

class DailyTaskCard extends StatelessWidget {
  final VoidCallback onSocialTap;
  final VoidCallback onFollowAndEarn;
  final bool isClaimed;

  const DailyTaskCard({
    super.key,
    required this.onSocialTap,
    required this.onFollowAndEarn,
    this.isClaimed = false,
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
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.assignment_turned_in_rounded, color: Colors.green, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'DAILY TASK',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E0A3C)),
                      ),
                      Text('Follow us on social media', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      Text('Follow and get 50 FAN reward', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
              // Social Icons
              Row(
                children: [
                  _socialIcon('X', Colors.black),
                  _socialIcon('✈', const Color(0xFF29B6F6)),
                  _socialIcon('📸', const Color(0xFFE1306C)),
                  _socialIcon('▶', Colors.red),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: isClaimed ? null : onFollowAndEarn,
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: isClaimed ? Colors.grey : const Color(0xFF2C1065), width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              icon: Icon(
                isClaimed ? Icons.check_circle : Icons.card_giftcard_rounded,
                color: isClaimed ? Colors.grey : const Color(0xFF2C1065),
                size: 18,
              ),
              label: Text(
                isClaimed ? 'REWARD CLAIMED' : 'FOLLOW & EARN 50 FAN',
                style: TextStyle(
                  color: isClaimed ? Colors.grey : const Color(0xFF2C1065),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _socialIcon(String label, Color color) {
    return Container(
      margin: const EdgeInsets.only(left: 4),
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
