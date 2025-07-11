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
    setLoading(true);
    setError(false);
  }, [isbn]);

  useEffect(() => {
    if (error && size === "L" && onError) {
      onError();
    }
  }, [error, size, onError]);

  if (!isbn || isbn === "") {
    return (
      <div className="relative aspect-[2/3] bg-[var(--gray-100)] flex items-center justify-center rounded-lg">
        <BookOpenIcon
          className={`${
            size === "S"
              ? "w-10 h-10"
              : size === "M"
              ? "w-14 h-14"
              : "w-20 h-20"
          } text-[var(--gray-300)]`}
        />
      </div>
    );
  }

  if (error && size === "L") {
    return (
      <div className="relative aspect-[2/3] bg-[var(--gray-100)] flex items-center justify-center rounded-lg">
        <BookOpenIcon className="w-20 h-20 text-[var(--gray-300)]" />
      </div>
    );
  }

  const verifyImageContent = (img: HTMLImageElement) => {
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

      {error && (size === "M" || size === "S") && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-100)]">
          <BookOpenIcon
            className={`${
              size === "S" ? "w-8 h-8" : "w-12 h-12"
            } text-[var(--gray-300)]`}
          />
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
          if (imgRef.current && verifyImageContent(imgRef.current)) {
            setTimeout(() => setLoading(false), 200);
          } else {
            setTimeout(() => {
              setLoading(false);
              setError(true);
            }, 200);
          }
        }}
        onError={() => {
          setTimeout(() => {
            setLoading(false);
            setError(true);
          }, 1000);
        }}
      />
    </div>
  );
}
