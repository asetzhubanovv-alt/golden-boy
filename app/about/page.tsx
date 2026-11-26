import type { Metadata } from "next";
import AboutContent from "@/components/about-content";

export const metadata: Metadata = {
  title: "Біз туралы — Amanat",
  description:
    "Университет қауымдастығында жоғалған және табылған заттарды іздеу, хабарландыру жариялау ережелері мен жауаптар.",
  openGraph: {
    title: "Біз туралы — Amanat",
    description: "Заттардың иесіне қайта оралуына көмектесеміз.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
