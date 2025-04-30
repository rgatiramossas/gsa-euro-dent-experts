import React, { useState } from 'react';
import { PhotoUpload } from './PhotoUpload';

interface PhotoUploaderProps {
  onPhotosSelected: (photos: FileList | null) => void;
  maxPhotos?: number;
  initialPhotos?: string[];
}

export function PhotoUploader({ 
  onPhotosSelected, 
  maxPhotos = 5,
  initialPhotos 
}: PhotoUploaderProps) {
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    initialPhotos ? initialPhotos.join(',') : undefined
  );

  const handlePhotoChange = (photos: FileList) => {
    onPhotosSelected(photos);
  };

  return (
    <PhotoUpload
      label="service-photos"
      onChange={handlePhotoChange}
      accept="image/*"
      multiple={true}
      preview={photoPreview}
      maxFiles={maxPhotos}
    />
  );
}