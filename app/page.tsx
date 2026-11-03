import { PitchExperience } from "@/components/PitchExperience";
import { isEmbedded } from "@/lib/pitch/embed";

export default async function Page({ searchParams }: { searchParams: Promise<{ embed?: string | string[] }> }) {
  const { embed } = await searchParams;
  return <PitchExperience embedded={isEmbedded(embed)} />;
}
