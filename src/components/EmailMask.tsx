/** @jsxImportSource react */
import { useState } from 'react';

interface EmailMaskProps {
  email: string;
  displayText?: string;
  className?: string;
}

export default function EmailMask({
  email,
  displayText = 'contact',
  className = '',
}: EmailMaskProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback: create temporary input element
      const input = document.createElement('input');
      input.value = email;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`email-mask ${className} transition-all duration-200 ${
        isHovered ? 'underline' : ''
      } ${isCopied ? 'opacity-50' : ''}`}
      aria-label={`Email: ${email}`}
    >
      {isCopied ? 'Copied!' : displayText}
    </button>
  );
}


