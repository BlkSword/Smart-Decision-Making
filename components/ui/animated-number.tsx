'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatValue?: (value: number) => string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  className,
  formatValue,
  decimals = 0,
  prefix = '',
  suffix = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const startValueRef = useRef<number>(value);

  useEffect(() => {
    // 添加数值边界检查，防止异常值
    if (!isFinite(value) || isNaN(value)) {
      console.warn('Invalid value passed to AnimatedNumber:', value);
      return;
    }

    // 限制数值范围，防止过大或过小的值导致显示异常
    const clampedValue = Math.max(-Number.MAX_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, value));
    if (clampedValue !== value) {
      console.warn('Value clamped in AnimatedNumber:', value, '->', clampedValue);
    }

    if (clampedValue === displayValue) return;

    setIsAnimating(true);
    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeOutQuart 缓动函数
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const currentValue = startValueRef.current + (clampedValue - startValueRef.current) * easeOutQuart;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(clampedValue);
        setIsAnimating(false);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration, displayValue]);

  // 添加数值有效性检查
  const validDisplayValue = isFinite(displayValue) && !isNaN(displayValue) ? displayValue : 0;
  
  const formattedValue = formatValue
    ? formatValue(validDisplayValue)
    : `${prefix}${validDisplayValue.toFixed(decimals)}${suffix}`;

  return (
    <span
      className={cn(
        "transition-all duration-300",
        isAnimating && "scale-105",
        className
      )}
    >
      {formattedValue}
    </span>
  );
}

// 专门用于货币的动画组件
export function AnimatedCurrency({
  value,
  duration = 1000,
  className,
  currency = 'CNY',
  locale = 'zh-CN'
}: {
  value: number;
  duration?: number;
  className?: string;
  currency?: string;
  locale?: string;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      className={className}
      formatValue={formatCurrency}
    />
  );
}

// 用于百分比的动画组件
export function AnimatedPercentage({
  value,
  duration = 1000,
  className,
  decimals = 0
}: {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
}) {
  return (
    <AnimatedNumber
      value={value * 100}
      duration={duration}
      className={className}
      decimals={decimals}
      suffix="%"
    />
  );
}

// 用于计数的动画组件
export function AnimatedCounter({
  value,
  duration = 800,
  className,
  prefix = '',
  suffix = ''
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      className={className}
      decimals={0}
      prefix={prefix}
      suffix={suffix}
    />
  );
}