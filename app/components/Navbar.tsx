import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="flex justify-center items-center bg-[var(--secondaryColor)] p-2">
      <Image
        src="/bookshare-logo-text.svg"
        alt="BookShare"
        width={150}
        height={50}
      />
      <Image
        className="hidden"
        src="/bookshare-logo.svg"
        alt="BookShare"
        width={150}
        height={150}
      />
    </nav>
  );
}
