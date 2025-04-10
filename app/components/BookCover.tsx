import { useState, useEffect, useRef } from "react";
import { BookOpenIcon } from "./svg-icons/BookOpenIcon";

interface BookCoverProps {
  isbn?: string;
  title: string;
}

export default function BookCover({ isbn, title }: BookCoverProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset states when ISBN changes
    setLoading(true);
    setError(false);
  }, [isbn]);

  if (!isbn) {
    return (
      <div className="relative aspect-[2/3] bg-[var(--gray-100)] flex items-center justify-center">
        <BookOpenIcon className="w-16 h-16 text-[var(--gray-300)]" />
      </div>
    );
  }

  // Function to verify the image dimensions
  const verifyImageContent = (img: HTMLImageElement) => {
    // If width or height is below threshold, consider it a missing cover
    // OpenLibrary returns a tiny 1x1 pixel when no cover exists
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      setError(true);
      return false;
    }
    return true;
  };

  return (
    <div className="relative aspect-[2/3] overflow-hidden bg-[var(--gray-50)]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-100)]">
          <div className="w-8 h-8 border-t-2 border-b-2 border-[var(--primaryColor)] rounded-full animate-spin"></div>
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-100)]">
          <BookOpenIcon className="w-16 h-16 text-[var(--gray-300)]" />
        </div>
      ) : (
        <img
          ref={imgRef}
          src={`https://covers.openlibrary.org/b/isbn/${isbn.replace(
            /-/g,
            ""
          )}-M.jpg`}
          alt={`Okładka: ${title}`}
          className={`object-cover w-full h-full transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => {
            // Check if the image has valid dimensions
            if (imgRef.current && verifyImageContent(imgRef.current)) {
              // Only set loading to false if the image is valid
              setTimeout(() => setLoading(false), 200);
            } else {
              // If image is invalid (tiny placeholder), show fallback
              setTimeout(() => {
                setLoading(false);
                setError(true);
              }, 200);
            }
          }}
          onError={() => {
            // Handle actual loading errors
            setTimeout(() => {
              setLoading(false);
              setError(true);
            }, 1000);
          }}
        />
      )}
    </div>
  );
}
