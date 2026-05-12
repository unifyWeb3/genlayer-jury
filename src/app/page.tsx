import { Docket, DocketFoot } from "@/components/Docket";
import { Hero } from "@/components/Hero";
import { Trinity } from "@/components/Trinity";
import { Modes } from "@/components/Modes";
import { Simulator } from "@/components/Simulator";
import { Casebook } from "@/components/Casebook";
import { Appeal } from "@/components/Appeal";
import { FinalCta } from "@/components/FinalCta";

export default function Home() {
  return (
    <>
      <Docket />
      <main>
        <Hero />
        <Trinity />
        <Modes />
        <Simulator />
        <Casebook />
        <Appeal />
        <FinalCta />
      </main>
      <DocketFoot />
    </>
  );
}
