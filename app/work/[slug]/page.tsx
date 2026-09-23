import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CaseFrame } from "@/components/CaseFrame";
import { workBodies } from "@/content/bodies";
import { getWork, works } from "@/content/works";

export function generateStaticParams() {
  return works.map((work) => ({ slug: work.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return {};
  return {
    title: work.title,
    description: work.lede,
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWork(slug);
  const load = workBodies[slug];
  if (!work || !load) notFound();
  const { default: Body } = await load();
  return (
    <CaseFrame work={work}>
      <Body />
    </CaseFrame>
  );
}
