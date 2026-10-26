/**
 * Avatar generation and image compression utility
 */

// Generate a sleek SVG data-uri avatar based on userId seed
export function generateDefaultAvatar(userId: string): string {
  const seed = userId.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;
  const initial = (userId.trim().charAt(0) || '?').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 75%, 45%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 85%, 25%)" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="30" fill="url(#g)" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
    <text x="50" y="62" font-family="-apple-system, system-ui, sans-serif" font-size="38" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Compress and crop user photo to square Base64 JPEG
export function compressUserPhoto(file: File, maxDim = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        const targetDim = Math.min(minSide, maxDim);
        canvas.width = targetDim;
        canvas.height = targetDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Draw centered square crop
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetDim, targetDim);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Format 24-hour remaining countdown
export function getRemainingTimeFormatted(expiresAt: number): {
  text: string;
  shortLabel: string;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
  pctRemaining: number;
} {
  const totalDuration = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return {
      text: 'In eliminazione...',
      shortLabel: 'Scaduto',
      hours: 0,
      minutes: 0,
      seconds: 0,
      isUrgent: true,
      pctRemaining: 0,
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pctRemaining = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
  const isUrgent = hours < 1; // less than 1h remaining

  let text = '';
  let shortLabel = '';

  if (hours >= 1) {
    shortLabel = `Scade tra ${hours}h`;
    text = minutes > 0 ? `Scade tra ${hours}h ${minutes}m` : `Scade tra ${hours}h`;
  } else if (minutes >= 1) {
    shortLabel = `Scade tra ${minutes}m`;
    text = `Scade tra ${minutes}m`;
  } else {
    shortLabel = 'Scade tra <1m';
    text = `Scade tra ${seconds}s`;
  }

  return {
    text,
    shortLabel,
    hours,
    minutes,
    seconds,
    isUrgent,
    pctRemaining,
  };
}
