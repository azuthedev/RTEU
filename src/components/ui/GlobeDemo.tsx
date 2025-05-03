import { Globe } from "./globe"

export function GlobeDemo() {
  return (
    <div className="relative flex flex-col items-center justify-center h-[480px] md:h-[620px] w-full overflow-hidden bg-white">
      <div className="relative w-full max-w-7xl mx-auto">
        <h2 className="relative text-center text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-black to-gray-600 bg-clip-text text-transparent z-10 mt-0 md:mt-48">
          Travel Made Simple—Worldwide
        </h2>
        <p className="relative text-center text-gray-600 text-lg mb-2 max-w-2xl mx-auto px-4 z-10 md:translate-y-[30%]">
          Royal Transfer EU covers major cities and airports across the globe, bringing simple travel solutions right to you.
        </p>
        <div className="relative aspect-[2/1] w-full">
          <Globe className="scale-[1.2] md:scale-[1.4] translate-y-[10%] md:translate-y-[20%]" />
          {/* Mobile gradient */}
          <div className="md:hidden pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(255,255,255,0)_30%,rgba(255,255,255,1)_100%)]" />
          {/* Desktop gradient */}
          <div className="hidden md:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(255,255,255,0)_40%,rgba(255,255,255,1)_100%)]" />
          {/* Bottom fade gradient */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[-58px] h-48 bg-gradient-to-b from-transparent via-white/70 to-white" />
        </div>
      </div>
    </div>
  )
}