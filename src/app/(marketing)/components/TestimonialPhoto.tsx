'use client';

import React, { useState } from 'react';

interface TestimonialPhotoProps {
  src: string;
  alt: string;
  initials: string;
}

export default function TestimonialPhoto({ src, alt, initials }: TestimonialPhotoProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  return (
    <div className="testimonial-photo">
      {!showPlaceholder && (
        <img
          src={src}
          alt={alt}
          onError={() => setShowPlaceholder(true)}
        />
      )}
      {showPlaceholder && (
        <div
          className="testimonial-photo-placeholder"
          style={{ display: 'flex', position: 'absolute', inset: 0 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
