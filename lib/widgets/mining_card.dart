import 'package:flutter/material.dart';

class MiningCard extends StatelessWidget {
  final bool isMiningActive;
  final double currentRate;
  final String sessionTimeRemaining;
  final VoidCallback onStartMining;

  const MiningCard({
    super.key,
    required this.isMiningActive,
    required this.currentRate,
    required this.sessionTimeRemaining,
    required this.onStartMining,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      padding: const EdgeInsets.all(20.0),
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
          // Status Header
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.construction_rounded,
                  color: Color(0xFF43138D),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'STATUS: ',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Colors.black80,
                        ),
                      ),
                      Text(
                        isMiningActive ? 'MINING' : 'READY',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isMiningActive ? Colors.green : const Color(0xFF10B981),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isMiningActive ? 'Session in progress' : 'Start mining to earn FAN',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Rates & Timers Row
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.speed_rounded, color: Color(0xFF43138D), size: 28),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'MINING RATE',
                          style: TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${currentRate.toStringAsFixed(1)} FAN/H',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E0A3C)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.access_time_rounded, color: Color(0xFF43138D), size: 28),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SESSION TIME',
                          style: TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '$sessionTimeRemaining / 24:00:00',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E0A3C)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Start Mining Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: isMiningActive ? null : onStartMining,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2C1065),
                disabledBackgroundColor: Colors.grey.shade300,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.hardware_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    isMiningActive ? 'MINING IN PROGRESS' : 'START MINING',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
