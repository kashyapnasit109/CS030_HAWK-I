import { useMemo } from "react";

interface SpeedometerGaugeProps {
  speed: number;
  speedLimit?: number;
  maxSpeed?: number;
  size?: number;
  className?: string;
}

export function SpeedometerGauge({
  speed = 0,
  speedLimit = 40,
  maxSpeed = 120,
  size = 200,
  className = "",
}: SpeedometerGaugeProps) {
  const isViolation = speed > speedLimit;
  const radius = size * 0.38;
  const strokeWidth = size * 0.06;
  const center = size / 2;

  // Arc angles: 135deg (bottom left) to 405deg (bottom right) -> 270deg total span
  const angleRange = 270;
  const startAngle = 135;

  const currentPercent = Math.min(Math.max(speed / maxSpeed, 0), 1);
  const currentAngle = startAngle + currentPercent * angleRange;
  const limitPercent = Math.min(Math.max(speedLimit / maxSpeed, 0), 1);

  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(angleRange / 360) * circumference} ${circumference}`;

  // Needle tip coordinates
  const needleAngleRad = (currentAngle * Math.PI) / 180;
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleAngleRad);
  const needleY = center + needleLength * Math.sin(needleAngleRad);

  // Ticks
  const ticks = useMemo(() => {
    const list = [];
    const count = 12;
    for (let i = 0; i <= count; i++) {
      const p = i / count;
      const angle = (startAngle + p * angleRange) * (Math.PI / 180);
      const innerR = radius - (i % 3 === 0 ? 12 : 6);
      const outerR = radius - 2;
      const x1 = center + innerR * Math.cos(angle);
      const y1 = center + innerR * Math.sin(angle);
      const x2 = center + outerR * Math.cos(angle);
      const y2 = center + outerR * Math.sin(angle);
      const value = Math.round(p * maxSpeed);
      list.push({ x1, y1, x2, y2, value, isMajor: i % 3 === 0 });
    }
    return list;
  }, [radius, center, startAngle, angleRange, maxSpeed]);

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`} className="overflow-visible">
        {/* Background Track Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          transform={`rotate(135 ${center} ${center})`}
          strokeLinecap="round"
        />

        {/* Legal Zone Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(16, 185, 129, 0.4)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(limitPercent * (angleRange / 360)) * circumference} ${circumference}`}
          transform={`rotate(135 ${center} ${center})`}
          strokeLinecap="round"
        />

        {/* Active Speed Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isViolation ? "#F43F5E" : "#3B82F6"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${(currentPercent * (angleRange / 360)) * circumference} ${circumference}`}
          transform={`rotate(135 ${center} ${center})`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Ticks */}
        {ticks.map((t, idx) => (
          <line
            key={idx}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isMajor ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.15)"}
            strokeWidth={t.isMajor ? 2 : 1}
          />
        ))}

        {/* Needle Line */}
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke={isViolation ? "#F43F5E" : "#3B82F6"}
          strokeWidth={3}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Center Pivot */}
        <circle cx={center} cy={center} r={6} fill="#FFFFFF" />
        <circle cx={center} cy={center} r={3} fill={isViolation ? "#F43F5E" : "#3B82F6"} />
      </svg>

      {/* Digital Speedometer Center Readout */}
      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className={`text-4xl lg:text-5xl font-mono font-black tracking-tight tabular-nums ${
          isViolation ? "text-hawk-burgundy drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" : "text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        }`}>
          {speed.toFixed(1)}
        </div>
        <div className="text-[10px] font-mono font-bold tracking-widest text-hawk-muted uppercase">
          KM / H
        </div>
      </div>
    </div>
  );
}
