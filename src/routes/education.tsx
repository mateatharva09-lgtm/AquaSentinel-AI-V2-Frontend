import { createFileRoute, Link } from "@tanstack/react-router";
import { Bath, Droplet, Factory, Leaf, Recycle, ShowerHead, Sprout, Target, Toilet, Waves, WashingMachine, CloudRain, Bug, FlaskRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel } from "@/components/water/PageHeader";
import { PARAMETERS, PARAMETER_KEYS } from "@/lib/water/parameters";

export const Route = createFileRoute("/education")({
  head: () => ({
    meta: [
      { title: "Water Education Centre – AquaSentinel AI" },
      { name: "description", content: "Learn about water pollution, contamination, sanitation, conservation and UN SDG 6 targets." },
      { property: "og:title", content: "Water Education Centre – AquaSentinel AI" },
      { property: "og:description", content: "Water pollution, sanitation, conservation and UN SDG 6 explained simply." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EducationPage,
});

const TARGETS = [
  ["6.1", "Safe drinking water", "By 2030, achieve universal and equitable access to safe and affordable drinking water for all."],
  ["6.2", "Sanitation & hygiene", "Achieve access to adequate and equitable sanitation and hygiene for all and end open defecation, paying special attention to women, girls and people in vulnerable situations."],
  ["6.3", "Water quality", "Improve water quality by reducing pollution, eliminating dumping, minimising release of hazardous chemicals, halving untreated wastewater and increasing safe recycling and reuse."],
  ["6.4", "Water-use efficiency", "Substantially increase water-use efficiency across all sectors and ensure sustainable withdrawals to address water scarcity."],
  ["6.5", "Integrated management", "Implement integrated water resources management at all levels, including through transboundary cooperation."],
  ["6.6", "Ecosystems", "Protect and restore water-related ecosystems, including mountains, forests, wetlands, rivers, aquifers and lakes."],
  ["6.a", "International cooperation", "Expand cooperation and capacity-building support to developing countries in water- and sanitation-related activities."],
  ["6.b", "Community participation", "Support and strengthen the participation of local communities in improving water and sanitation management."],
] as const;

const STATS = [
  ["2.2 billion", "people lacked safely managed drinking water"],
  ["3.5 billion", "people lacked safely managed sanitation"],
  ["2.0 billion", "people lacked basic hygiene services"],
] as const;

const POLLUTION = [
  { icon: Factory, title: "Industrial discharge", text: "Factories can release heavy metals, solvents, dyes and hot water. Typical signs include unusual pH, high conductivity and low oxygen downstream." },
  { icon: Toilet, title: "Untreated sewage", text: "Human and animal waste carries pathogens and organic matter. Bacteria break the organic matter down and use up the oxygen, which can kill fish." },
  { icon: Sprout, title: "Agricultural runoff", text: "Fertilisers and manure add nitrogen and phosphorus, which feed algal blooms (eutrophication). Pesticides and eroded soil add to the problem." },
  { icon: CloudRain, title: "Urban stormwater", text: "Rain washes oil, litter, tyre particles and road salt from streets into drains and rivers, often raising turbidity and conductivity after storms." },
  { icon: Recycle, title: "Plastics & solid waste", text: "Dumped waste blocks drains, breaks down into microplastics and can leach chemicals into water." },
  { icon: Waves, title: "Thermal pollution", text: "Warm water from power plants or industry holds less oxygen and stresses aquatic life." },
];

const CONTAMINANTS = [
  { icon: Bug, title: "Microbiological", text: "Bacteria (e.g. E. coli, Vibrio cholerae), viruses and parasites cause diarrhoeal diseases. They are invisible to pH, turbidity, oxygen, conductivity and temperature meters — only microbiological tests detect them." },
  { icon: FlaskRound, title: "Chemical", text: "Arsenic, fluoride, nitrate, lead and pesticides can harm health over time. Many have no taste, smell or colour and need laboratory analysis." },
  { icon: Droplet, title: "Physical", text: "Suspended sediment, colour and temperature affect appearance, treatment and ecosystems. These are the properties field meters measure best." },
];

const CONSERVATION = [
  { icon: ShowerHead, title: "Shorter showers", text: "Cutting a shower by 2 minutes can save around 15–20 litres with a typical shower head." },
  { icon: Droplet, title: "Fix leaks quickly", text: "A dripping tap can waste thousands of litres a year. Check taps, pipes and toilet cisterns regularly." },
  { icon: Bath, title: "Turn off the tap", text: "Close the tap while brushing teeth, soaping hands or washing dishes." },
  { icon: WashingMachine, title: "Full loads only", text: "Run washing machines and dishwashers only when full, and choose eco programmes." },
  { icon: CloudRain, title: "Harvest rainwater", text: "Collect rainwater for gardens, cleaning or toilet flushing where it is safe and permitted." },
  { icon: Leaf, title: "Water plants wisely", text: "Water early or late to reduce evaporation, use mulch and choose native, drought-tolerant plants." },
  { icon: Recycle, title: "Reuse grey water", text: "Reuse rinse water from vegetables or a bucket in the shower for plants (without harsh soaps)." },
  { icon: Factory, title: "Never pour waste down drains", text: "Oils, paints, medicines and chemicals pollute rivers. Use proper disposal points." },
];

function EducationPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Water education centre"
        title="Learn about clean water and sanitation"
        description="Short, practical explanations of how water becomes polluted, why sanitation matters, and what everyone can do — connected to UN Sustainable Development Goal 6."
      />

      <Tabs defaultValue="sdg6" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-secondary p-1">
          <TabsTrigger value="sdg6">UN SDG 6</TabsTrigger>
          <TabsTrigger value="pollution">Water pollution</TabsTrigger>
          <TabsTrigger value="contamination">Contamination</TabsTrigger>
          <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
          <TabsTrigger value="conservation">Conservation</TabsTrigger>
          <TabsTrigger value="parameters">The 5 parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="sdg6" className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-ocean p-6 text-primary-foreground shadow-elevated md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">Goal 6</p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">Ensure availability and sustainable management of water and sanitation for all</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {STATS.map(([n, t]) => (
                <div key={n} className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur">
                  <p className="font-display text-2xl font-bold">{n}</p>
                  <p className="mt-1 text-sm text-primary-foreground/85">{t}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-primary-foreground/70">Source: UN Sustainable Development Goals Report 2024, using WHO/UNICEF JMP estimates for 2022.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {TARGETS.map(([n, t, d]) => (
              <div key={n} className="flex gap-4 rounded-xl border bg-card p-5 shadow-card">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-sm font-bold text-primary">{n}</span>
                <div>
                  <p className="font-semibold text-foreground">{t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <Panel title="How AquaSentinel AI connects to SDG 6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Target 6.3 calls for better water quality and less pollution, and target 6.b for community participation.
              Simple field measurements, recorded consistently and explained clearly, help students and communities notice
              changes early and decide when professional laboratory testing is needed. <Target className="inline size-4 text-eco" />
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="pollution">
          <CardGrid items={POLLUTION} intro="Water pollution is any change to water that harms people, wildlife or ecosystems. Most comes from a few main sources:" />
        </TabsContent>

        <TabsContent value="contamination" className="space-y-6">
          <CardGrid items={CONTAMINANTS} intro="Contaminants are usually grouped into three types. Knowing the type tells you which test can find it." />
          <Panel title="Why clear water is not always safe">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Water can look clear, smell normal and have a perfect pH but still contain harmful germs or chemicals such as arsenic.
              This is why AquaSentinel AI never says water is safe to drink. Use it to decide <em>what to test next</em>, and rely on
              accredited laboratories and local health authorities for drinking-water decisions.
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="sanitation" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Safely managed sanitation", "A private toilet whose waste is safely treated on site or transported and treated elsewhere, so it never reaches people or water sources."],
              ["Hygiene", "Handwashing with soap and water at critical times — after using the toilet and before handling food — is one of the most effective ways to prevent disease."],
              ["Wastewater treatment", "Treatment plants remove solids, organic matter and many pathogens before water returns to rivers. Untreated wastewater is a leading cause of low oxygen and contamination."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border bg-card p-5 shadow-card">
                <p className="font-semibold text-foreground">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <Panel title="The sanitation chain">
            <ol className="grid gap-3 md:grid-cols-5">
              {["Toilet / capture", "Containment", "Emptying & transport", "Treatment", "Safe reuse or disposal"].map((s, i) => (
                <li key={s} className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                  <span className="font-display text-lg font-bold">{i + 1}</span>
                  <p className="mt-1 font-medium">{s}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">If any link in the chain fails, waste can reach groundwater, rivers and drinking-water sources.</p>
          </Panel>
        </TabsContent>

        <TabsContent value="conservation">
          <CardGrid items={CONSERVATION} intro="Practical habits that save water at home, at school and in the community:" cols="xl:grid-cols-4" />
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4">
          <p className="text-sm text-muted-foreground">These are the five measurements AquaSentinel AI analyses. <Link to="/methodology" className="font-medium text-primary underline">See how they are scored</Link>.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {PARAMETER_KEYS.map((k) => {
              const p = PARAMETERS[k];
              return (
                <div key={k} className="rounded-xl border bg-card p-5 shadow-card">
                  <div className="flex items-baseline justify-between"><p className="font-semibold text-foreground">{p.label}</p><span className="font-mono text-xs text-muted-foreground">{p.unit}</span></div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                  <p className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">Reference: {p.referenceText}</p>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CardGrid({ items, intro, cols = "xl:grid-cols-3" }: { items: { icon: typeof Droplet; title: string; text: string }[]; intro: string; cols?: string }) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{intro}</p>
      <div className={`grid gap-4 sm:grid-cols-2 ${cols}`}>
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border bg-card p-5 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-5" /></span>
            <p className="mt-3 font-semibold text-foreground">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
