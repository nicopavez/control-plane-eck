import { MarketFraming } from "@/components/sections/MarketFraming";
import { InstallJourney } from "@/components/sections/InstallJourney";
import { RankedProblems } from "@/components/sections/RankedProblems";
import { PrototypeRationale } from "@/components/sections/PrototypeRationale";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { Close } from "@/components/sections/Close";

export default function HomePage() {
  return (
    <>
      <MarketFraming />
      <InstallJourney />
      <RankedProblems />
      <PrototypeRationale />
      <BeforeAfter />
      <Close />
    </>
  );
}
