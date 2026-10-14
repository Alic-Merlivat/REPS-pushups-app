import React, { useState } from 'react';

interface PhonePlacementIllustrationProps {
  className?: string;
  imgClassName?: string;
}

export const PhonePlacementIllustration: React.FC<PhonePlacementIllustrationProps> = ({
  className = 'w-full h-auto',
  imgClassName = 'w-full h-auto object-cover select-none block',
}) => {
  const [imgSrc, setImgSrc] = useState('/setup-guide.jpg');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={imgSrc}
        alt="Phone placement setup guide for push-up tracking (1m distance)"
        onError={() => setImgSrc('https://i.postimg.cc/fbRMBW7h/REPS-explain.jpg')}
        className={imgClassName}
        loading="eager"
      />
    </div>
  );
};
