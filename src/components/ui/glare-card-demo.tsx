import { GlareCard } from "./glare-card";

export function GlareCardDemo() {
  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
      <GlareCard className="flex flex-col items-start justify-end py-8 px-6 relative">
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src="https://i.imgur.com/BUpN7Wn.jpeg"
          alt="Trusted Service - Luxury sedan driving on a scenic road, showcasing Royal Transfer EU's reliable transportation service"
        />
        <div className="relative z-10">
        <h2 className="font-bold text-white text-2xl text-left [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]">Trusted Service</h2>
        <p className="font-normal text-base text-neutral-200 mt-4 text-[16px] [text-shadow:_0_1px_1px_rgb(0_0_0_/_40%)]">
          Thousands of travelers trust us every year for easy, worry-free airport transfers and rides.
        </p>
        </div>
      </GlareCard>
      <GlareCard className="flex flex-col items-start justify-end py-8 px-6 relative">
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src="https://i.imgur.com/DKdfE4r.jpeg"
          alt="Professional Drivers - Well-dressed chauffeur standing next to a premium vehicle, representing Royal Transfer EU's experienced and courteous drivers"
        />
        <div className="relative z-10">
          <h2 className="font-bold text-white text-2xl text-left [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]">Professional Drivers</h2>
          <p className="font-normal text-base text-neutral-200 mt-4 text-[16px] [text-shadow:_0_1px_1px_rgb(0_0_0_/_40%)]">
            Helpful, polite drivers with full training and licenses—safe travel every time.
          </p>
        </div>
      </GlareCard>
      <GlareCard className="flex flex-col items-start justify-end py-8 px-6 relative">
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src="https://i.imgur.com/0jlOuEe.jpeg"
          alt="Premium Experience - Interior of a luxury vehicle with elegant leather seats, showcasing Royal Transfer EU's commitment to comfort and high-quality transportation"
        />
        <div className="relative z-10">
        <h2 className="font-bold text-white text-2xl text-left [text-shadow:_0_1px_1px_rgb(0_0_0_/_80%)]">Premium Experience</h2>
        <p className="font-normal text-base text-neutral-200 mt-4 text-[16px] [text-shadow:_0_1px_1px_rgb(0_0_0_/_40%)]">
          Experience luxury transportation with our premium fleet and professional service.
        </p>
          </div>
      </GlareCard>
    </div>
  );
}