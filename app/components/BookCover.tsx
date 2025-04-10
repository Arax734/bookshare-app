import { useState, useEffect, useRef } from "react";
import { BookOpenIcon } from "./svg-icons/BookOpenIcon";

interface BookCoverProps {
  isbn?: string;
  title: string;
  size: "L" | "M" | "S";
  onError?: () => void;
}

export default function BookCover({
  isbn,
  title,
  size,
  onError,
}: BookCoverProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset states when ISBN changes
    setLoading(true);
    setError(false);
  }, [isbn]);

  useEffect(() => {
    // If there's an error and size is L, notify the parent component
    if (error && size === "L" && onError) {
      onError();
    }
  }, [error, size, onError]);

  // Return early if no ISBN provided
  if (!isbn) {
    return (
      <div className="relative aspect-[2/3] bg-[var(--gray-100)] flex items-center justify-center">
        <BookOpenIcon className="w-16 h-16 text-[var(--gray-300)]" />
      </div>
    );
  }

  // Return empty component if there's an error and size is L
  if (error && size === "L") {
    return null;
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
    <div className="relative aspect-[2/3] overflow-hidden bg-[var(--gray-50)] rounded-lg">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-100)]">
          <div className="w-8 h-8 border-t-2 border-b-2 border-[var(--primaryColor)] rounded-full animate-spin"></div>
        </div>
      )}

      {error && size === "M" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-100)]">
          <BookOpenIcon className="w-12 h-12 text-[var(--gray-300)]" />
        </div>
      )}

      <img
        ref={imgRef}
        src={`https://covers.openlibrary.org/b/isbn/${isbn.replace(
          /-/g,
          ""
        )}-${size}.jpg`}
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
    </div>
  );
}
