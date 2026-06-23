import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpenText,
  Brain,
  Briefcase,
  Check,
  CloudRain,
  Download,
  FileText,
  GraduationCap,
  KeyRound,
  Laptop,
  Map,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Secret Spy Academy | Screen-Free Spy Adventure for Kids",
  description:
    "Replace screen time with an exciting spy adventure. Secret Spy Academy keeps children aged 8-11 entertained while building critical thinking and problem-solving skills.",
};

const digitalCheckoutLink = process.env.SPY_ACADEMY_DIGITAL_CHECKOUT_URL ?? "";
const printoutCheckoutLink = process.env.SPY_ACADEMY_PRINTOUT_CHECKOUT_URL ?? "";

const products = [
  {
    name: "Spy Academy Workbook-Digital Download",
    price: "$9.00",
    description: "Instant PDF download to print at home and start the mission today.",
    checkoutLink: digitalCheckoutLink,
    tone: "bg-[#a9d8d0]",
  },
  {
    name: "Spy Academy Workbook-Printout",
    price: "$19.99",
    description:
      "A physical copy of the workbook delivered within 3-7 days using standard NZ Post.",
    checkoutLink: printoutCheckoutLink,
    tone: "bg-[#f5c666]",
  },
];

const parentPainCards = [
  { title: "Screen-free", icon: Laptop, tone: "bg-[#a9d8d0]" },
  { title: "Educational", icon: BookOpenText, tone: "bg-[#f8d8b0]" },
  { title: "Engaging", icon: Sparkles, tone: "bg-[#eea38c]" },
  { title: "Independent", icon: ShieldCheck, tone: "bg-[#f5c666]" },
];

const adventureFeatures = [
  { title: "Investigate suspects", icon: Search, tone: "bg-[#a9d8d0]" },
  { title: "Search for hidden clues", icon: BadgeCheck, tone: "bg-[#f8d8b0]" },
  { title: "Crack secret codes", icon: KeyRound, tone: "bg-[#eea38c]" },
  { title: "Solve logic puzzles", icon: Brain, tone: "bg-[#f5c666]" },
  { title: "Piece together evidence", icon: FileText, tone: "bg-[#a9d8d0]" },
  { title: "Earn a Secret Agent certificate", icon: Trophy, tone: "bg-[#f8d8b0]" },
];

const previewCards = [
  { label: "Secret Codes", icon: KeyRound, tone: "bg-[#a9d8d0]" },
  { label: "Suspect Profiles", icon: FileText, tone: "bg-[#eea38c]" },
  { label: "Puzzle Challenges", icon: Brain, tone: "bg-[#f5c666]" },
];

const academyItems = [
  "Decode secret messages",
  "Solve mysteries",
  "Investigate suspects",
  "Follow clues",
  "Earn a certificate",
];

const learningBenefits = [
  { title: "Reading comprehension", icon: BookOpenText, tone: "bg-[#a9d8d0]" },
  { title: "Critical thinking", icon: Brain, tone: "bg-[#f8d8b0]" },
  { title: "Observation skills", icon: Search, tone: "bg-[#eea38c]" },
  { title: "Problem solving", icon: Sparkles, tone: "bg-[#f5c666]" },
  { title: "Logical reasoning", icon: Map, tone: "bg-[#a9d8d0]" },
  { title: "Inference and deduction", icon: ShieldCheck, tone: "bg-[#f8d8b0]" },
];

const steps = [
  {
    title: "Download the mission instantly",
    description: "Purchase, download and print at home.",
  },
  {
    title: "Become a Secret Agent",
    description: "Solve clues, decode messages and investigate suspects independently.",
  },
  {
    title: "Complete the mission",
    description: "Finish the adventure and earn a Secret Agent certificate.",
  },
];

const audiences = [
  { title: "Rainy afternoons", icon: CloudRain, tone: "bg-[#a9d8d0]" },
  { title: "School holidays", icon: Briefcase, tone: "bg-[#f8d8b0]" },
  { title: "Travel activities", icon: Map, tone: "bg-[#eea38c]" },
  { title: "Independent play at home", icon: ShieldCheck, tone: "bg-[#f5c666]" },
  { title: "Children aged 8-11", icon: GraduationCap, tone: "bg-[#a9d8d0]" },
  { title: "Unique gifts", icon: Award, tone: "bg-[#f8d8b0]" },
];

const faqs = [
  {
    question: "What age is this for?",
    answer: "Ages 8-11.",
  },
  {
    question: "Is this educational?",
    answer: "Children practise reading, logic and problem-solving skills.",
  },
  {
    question: "Is this a digital or printed product?",
    answer: "You can select to purchase the instant downloadable PDF that you can print yourself or select a printed option after clicking the download button on this webpage.",
  },
  {
    question: "How long does the mission take?",
    answer: "Most children spend between 2 and 4 hours completing the mission.",
  },
];

function StripeButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href="#choose-product"
      className={`tactile-button inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.35rem] bg-[#eea38c] px-6 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a9d8d0]/70 ${className}`}
    >
      {children}
      <ArrowRight className="h-5 w-5" />
    </a>
  );
}

function ProductChoiceModal() {
  return (
    <section
      id="choose-product"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-product-title"
      className="fixed inset-0 z-50 hidden items-center justify-center bg-[#2a2722]/42 px-4 py-6 backdrop-blur-sm target:flex"
    >
      <a
        href="#"
        className="absolute inset-0"
        aria-label="Close product chooser"
      />
      <div className="tactile-panel relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-5 shadow-tactile sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8d7c6b]">
              Choose your mission
            </p>
            <h2
              id="choose-product-title"
              className="mt-2 text-3xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-4xl"
            >
              Select your Spy Academy workbook
            </h2>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-[#6d6255]">
              Pick the version that works best for your family, then continue to
              Stripe to complete your purchase securely.
            </p>
          </div>
          <a
            href="#"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#fff8eb]/86 text-xl font-black text-[#2a2722] shadow-tactile transition hover:-translate-y-0.5"
            aria-label="Close product chooser"
          >
            ×
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-[1.75rem] bg-white/62 p-5 shadow-tactile"
            >
              <span
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${product.tone} text-[#2a2722] soft-inset`}
              >
                <FileText className="h-7 w-7" />
              </span>
              <h3 className="text-2xl font-black leading-tight text-[#2a2722]">
                {product.name}
              </h3>
              <p className="mt-3 text-4xl font-black tracking-tight text-[#2a2722]">
                {product.price}
              </p>
              <p className="mt-3 text-base font-medium leading-7 text-[#6d6255]">
                {product.description}
              </p>
              {product.checkoutLink ? (
                <a
                  href={product.checkoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tactile-button mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#eea38c] px-5 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a9d8d0]/70"
                >
                  Buy Now
                  <ArrowRight className="h-5 w-5" />
                </a>
              ) : (
                <span className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-[1.35rem] bg-[#fff8eb]/86 px-5 py-3 text-base font-black text-[#8d7c6b] shadow-tactile">
                  Checkout unavailable
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionIntro({
  kicker,
  title,
  children,
  align = "left",
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={`mb-7 space-y-3 ${align === "center" ? "mx-auto max-w-3xl text-center" : ""}`}>
      {kicker ? (
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8d7c6b]">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-3xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-4xl">
        {title}
      </h2>
      {children ? (
        <div className="text-base font-medium leading-7 text-[#6d6255] sm:text-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SpyAcademyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden pb-24 sm:pb-0">
      <div className="pointer-events-none absolute left-[-5rem] top-20 h-52 w-52 rounded-full bg-[#eea38c]/28 blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-[34rem] h-56 w-56 rounded-full bg-[#a9d8d0]/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-40 left-[12%] h-44 w-44 rounded-full bg-[#f5c666]/30 blur-3xl" />

      <section className="px-4 pb-12 pt-4 sm:px-6 sm:pb-16 lg:pt-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8eb]/86 px-4 py-2 text-sm font-black text-[#6d6255] shadow-tactile">
              <Sparkles className="h-4 w-4 text-[#d68972]" />
              ⭐ Instant Download • 🕵️ Ages 8-11 • 🚫 Screen-Free Fun
            </span>

            <div className="space-y-5">
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-[#2a2722] sm:text-6xl lg:text-7xl">
                When you hear, &quot;Can I have my iPad&quot; for the 100th time
                today...….
              </h1>
              <p className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-5xl">
                Hand them a mission instead.
              </p>
              <div className="max-w-2xl space-y-4 text-lg font-medium leading-8 text-[#6d6255] sm:text-xl">
                <p>
                  Secret Spy Academy transforms ordinary afternoons into exciting
                  spy adventures children can complete independently.
                </p>
                <p>
                  Through clues, codes, suspects and secret missions, your child
                  becomes the hero of their own story—building critical thinking,
                  imagination and confidence along the way.
                </p>
                <p>No screens. No batteries. No &quot;I&apos;m bored&quot; after five minutes.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <StripeButton className="w-full sm:w-auto">
                Download Mission Now
              </StripeButton>
              <a
                href="#inside-academy"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#fff8eb]/86 px-6 py-3 text-base font-black text-[#2a2722] shadow-tactile transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#eea38c]/55 active:translate-y-1 sm:w-auto"
              >
                See What&apos;s Inside
                <Search className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-2 top-4 z-10 flex h-20 w-20 rotate-6 items-center justify-center rounded-[1.6rem] bg-[#f5c666] text-[#2a2722] shadow-button soft-inset sm:h-24 sm:w-24">
              <BadgeCheck className="h-10 w-10" />
            </div>
            <div className="absolute -bottom-4 left-2 z-10 flex h-16 w-16 -rotate-6 items-center justify-center rounded-[1.35rem] bg-[#a9d8d0] text-[#2a2722] shadow-mint soft-inset sm:h-20 sm:w-20">
              <Search className="h-8 w-8" />
            </div>
            <div className="tactile-panel relative overflow-hidden rounded-[2.1rem] p-5 sm:p-7">
              <div className="rounded-[1.65rem] bg-[#fff8eb]/72 p-4 shadow-insetSoft">
                <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[1.45rem] bg-[#2a2722] p-5 text-[#fff8eb] shadow-tactile">
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#3b352d] to-transparent" />
                  <div className="relative flex items-center justify-between">
                    <span className="rounded-full bg-[#f5c666] px-4 py-2 text-sm font-black text-[#2a2722]">
                      Ages 8-11
                    </span>
                    <ShieldCheck className="h-9 w-9 text-[#a9d8d0]" />
                  </div>
                  <div className="relative mt-12 space-y-5 text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#f5c666] bg-[#fff8eb] text-[#2a2722]">
                      <Award className="h-12 w-12" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f5c666]">
                      Top Secret
                    </p>
                    <h2 className="text-4xl font-black leading-none tracking-tight">
                      Spy Academy
                    </h2>
                    <p className="mx-auto max-w-xs text-base font-bold leading-6 text-[#fff8eb]/78">
                      Mission files, coded clues and a printable certificate for
                      newly trained agents.
                    </p>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
                    {["Codes", "Clues", "Puzzles"].map((item) => (
                      <span
                        key={item}
                        className="rounded-2xl bg-[#fff8eb]/12 px-2 py-3 text-center text-xs font-black"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="tactile-panel rounded-[2rem] p-5 sm:p-8">
            <SectionIntro
              kicker="For busy parents"
              title="School holidays shouldn&apos;t mean endless screen time."
              align="center"
            >
              <div className="mx-auto max-w-3xl space-y-4">
                <p>You know the moment.</p>
                <p>
                  Your child has already watched TV, played games and asked for
                  the iPad for the tenth time before lunch.
                </p>
                <p>You need something that is:</p>
              </div>
            </SectionIntro>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {parentPainCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="rounded-[1.35rem] bg-white/64 p-5 text-center shadow-tactile transition hover:-translate-y-1"
                  >
                    <span
                      className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${card.tone} text-[#2a2722] soft-inset`}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <h3 className="text-xl font-black text-[#2a2722]">
                      {card.title}
                    </h3>
                  </article>
                );
              })}
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-bold leading-8 text-[#6d6255]">
              That&apos;s exactly why Secret Spy Academy was created.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            kicker="The experience"
            title="More than an activity book. It&apos;s an adventure."
            align="center"
          >
            <p>
              Secret Spy Academy is designed like an escape room on paper.
              Children don&apos;t simply complete worksheets—they become secret
              agents.
            </p>
          </SectionIntro>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adventureFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="tactile-panel rounded-[1.75rem] p-5 transition hover:-translate-y-1 hover:shadow-tactile"
                >
                  <span
                    className={`mb-7 flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${feature.tone} text-[#2a2722] shadow-tactile soft-inset`}
                  >
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="text-xl font-black leading-tight text-[#2a2722]">
                    {feature.title}
                  </h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="inside-academy" className="scroll-mt-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="tactile-panel rounded-[2rem] p-5 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
              <div>
                <SectionIntro kicker="Workbook preview" title="Inside the mission files" />
                <div className="rounded-[1.8rem] bg-[#fff8eb]/72 p-4 shadow-insetSoft">
                  <div className="flex aspect-[16/11] items-center justify-center rounded-[1.35rem] border-2 border-dashed border-[#d9c4a3] bg-white/70">
                    <div className="text-center">
                      <FileText className="mx-auto h-14 w-14 text-[#d68972]" />
                      <p className="mt-3 text-2xl font-black text-[#2a2722]">
                        Workbook Preview
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {previewCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="flex items-center gap-3 rounded-[1.35rem] bg-white/64 p-3 shadow-tactile transition hover:-translate-y-0.5"
                      >
                        <span
                          className={`flex h-12 w-12 flex-none items-center justify-center rounded-[1rem] ${card.tone} text-[#2a2722] soft-inset`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <p className="font-black text-[#3f382f]">{card.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/42 p-5 shadow-tactile sm:p-6">
                <h3 className="text-2xl font-black leading-tight text-[#2a2722]">
                  They&apos;ll stop asking for screens because they&apos;ll be too
                  busy saving the mission.
                </h3>
                <div className="mt-5 space-y-4 text-base font-medium leading-7 text-[#6d6255]">
                  <p>
                    Children quickly form a connection with the Academy, its
                    characters and fellow agents.
                  </p>
                  <p>
                    They eagerly follow clues, record evidence and uncover
                    secrets as they work through the mission.
                  </p>
                  <p>It&apos;s imaginative play reimagined for today&apos;s children.</p>
                </div>
                <ul className="mt-5 space-y-3">
                  {academyItems.map((item) => (
                    <li key={item} className="flex gap-3 text-base font-bold leading-7 text-[#5a5147]">
                      <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#a9d8d0] text-[#2a2722]">
                        <Check className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <StripeButton className="mt-7 w-full">Download Now</StripeButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            kicker="Learning benefits"
            title="The best part? They&apos;re learning without even realising it."
            align="center"
          >
            <p>
              When learning feels like play, children naturally stay engaged for
              longer.
            </p>
          </SectionIntro>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learningBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="tactile-panel rounded-[1.75rem] p-5 transition hover:-translate-y-1"
                >
                  <span
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${benefit.tone} text-[#2a2722] shadow-tactile soft-inset`}
                  >
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="text-xl font-black leading-tight text-[#2a2722]">
                    {benefit.title}
                  </h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro kicker="How it works" title="Three steps to agent status" />
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="tactile-panel rounded-[1.75rem] p-5 transition hover:-translate-y-1"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#f5c666] text-2xl font-black text-[#2a2722] shadow-button">
                    {index + 1}
                  </span>
                  <Map className="h-7 w-7 text-[#8d7c6b]" />
                </div>
                <h3 className="text-xl font-black leading-tight text-[#2a2722]">
                  {step.title}
                </h3>
                <p className="mt-3 text-base font-bold leading-7 text-[#6d6255]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro kicker="Who is this for?" title="Made for curious kids and busy days" align="center" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <article
                  key={audience.title}
                  className="tactile-panel rounded-[1.75rem] p-5 text-center transition hover:-translate-y-1"
                >
                  <span
                    className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] ${audience.tone} text-[#2a2722] shadow-tactile soft-inset`}
                  >
                    <Icon className="h-8 w-8" />
                  </span>
                  <h3 className="text-xl font-black leading-tight text-[#2a2722]">
                    {audience.title}
                  </h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <SectionIntro kicker="FAQ" title="Questions parents ask" align="center" />
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group tactile-panel rounded-[1.35rem] p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-black text-[#2a2722]">
                  {faq.question}
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f5c666] text-xl transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-base font-medium leading-7 text-[#6d6255]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#2a2722] via-[#3d352b] to-[#77afa6] p-6 text-center shadow-tactile sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[#f5c666] text-[#2a2722] shadow-button">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-[#fff8eb] sm:text-5xl">
              Ready to replace &quot;Can I have the iPad?&quot; with &quot;Can I
              solve one more clue?&quot;
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-7 text-[#fff8eb]/82 sm:text-lg">
              Give your child an unforgettable spy adventure they&apos;ll be
              talking about long after the mission ends.
            </p>
            <StripeButton className="mt-7 w-full max-w-sm bg-[#f5c666] sm:w-auto">
              Download Your Mission Now
            </StripeButton>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-[#fff8eb]/92 p-3 shadow-[0_-18px_28px_-24px_rgba(80,68,54,0.65)] backdrop-blur sm:hidden">
        <a
          href="#choose-product"
          className="tactile-button inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#eea38c] px-5 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a9d8d0]/70"
        >
          <Download className="h-5 w-5" />
          🕵️ Download Now
        </a>
      </div>
      <ProductChoiceModal />
    </main>
  );
}
