import { PitchExperience } from "@/components/PitchExperience";

type PageProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const mode = params.mode === "build" ? "build" : "pitch";
  return <PitchExperience mode={mode} />;
}
