"use client";

export default function BackgroundVideo() {
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src="/movies/library-movie.mp4"
      autoPlay
      loop
      muted
      playsInline
      style={{
        filter: "blur(3px)",
        transform: "scale(1.02)",
      }}
    />
  );
}
