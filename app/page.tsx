import { PitchExperience } from "@/components/PitchExperience";

export default async function Page({ searchParams }: { searchParams: Promise<{ embed?: string | string[] }> }) {
  const { embed } = await searchParams;
  return <PitchExperience embedded={embed === "1"} />;
}
