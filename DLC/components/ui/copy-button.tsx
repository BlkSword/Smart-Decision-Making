"use client";

import { useState } from 'react';
import { Button } from './button';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface CopyButtonProps {
  text: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
  className?: string;
}

export function CopyButton({
  text,
  onSuccess,
  onError,
  variant = 'outline',
  size = 'sm',
  children,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(text);
      
      if (success) {
        setCopied(true);
        onSuccess?.();
        
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } else {
        onError?.('复制失败，请手动复制');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      onError?.('复制失败，请手动复制');
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size}
      className={className}
      disabled={copied}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {children || '复制'}
        </>
      )}
    </Button>
  );
}