export default function Login() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/library-image.jpeg')",
          filter: "blur(5px)",
          transform: "scale(1.1)",
        }}
      ></div>
      <div className="absolute inset-0 bg-black opacity-20 flex justify-center items-center"></div>
      <div className="relative z-10 flex justify-center items-center"></div>
    </main>
  );
}
