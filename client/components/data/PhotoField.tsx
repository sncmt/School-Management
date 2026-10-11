"use client";

import { useEffect, useState } from "react";
import { ImageUpload } from "./ImageUpload";

type Props = {
  // the photo already saved, if any (a signed link)
  currentUrl?: string | null;
  // the newly chosen photo, not uploaded yet
  file: File | null;
  onChange: (file: File | null) => void;
  alt?: string;
};

/**
 * Picks a photo inside a form. Nothing is uploaded here: the form uploads it
 * after the record is saved, because the photo is stored under the record's id.
 * Remove only undoes a new choice; a saved photo is removed on the record's page.
 */
export function PhotoField({ currentUrl = null, file, onChange, alt }: Props) {
  const preview = useObjectUrl(file);

  return (
    <ImageUpload
      imageUrl={preview ?? currentUrl}
      shape="circle"
      fit="cover"
      size={88}
      alt={alt}
      onUpload={async (chosen) => onChange(chosen)}
      onRemove={file ? async () => onChange(null) : undefined}
    />
  );
}

// a local link for showing the chosen file, freed when it changes
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}
