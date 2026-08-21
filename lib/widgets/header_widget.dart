import 'package:flutter/material.dart';

class HeaderWidget extends StatelessWidget {
  final bool hasNotification;
  final VoidCallback onNotificationTap;

  const HeaderWidget({
    super.key,
    this.hasNotification = true,
    required this.onNotificationTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'AFAM',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E0A3C),
                ),
              ),
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.notifications_none_rounded,
                      color: Color(0xFF1E0A3C),
                      size: 28,
                    ),
                    onPressed: onNotificationTap,
                  ),
                  if (hasNotification)
                    Positioned(
                      right: 12,
                      top: 12,
                      child: Container(
                        width: 9,
                        height: 9,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 2),
          const Text(
            'POWER FAN NETWORK',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E0A3C),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Mine FAN. Earn More',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }
}
