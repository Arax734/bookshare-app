import Image from "next/image";

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-[var(--background)] flex justify-center items-center z-0">
      <div className="relative w-24 h-24 animate-[pulse-scale_1.5s_ease-in-out_infinite]">
        <Image
          src="/bookshare-logo2.svg"
          alt="BookShare Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
