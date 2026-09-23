import { Plates } from "@/components/Plates";
import { site } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <h1 className="statement">{site.line}</h1>
      <Plates />
    </>
  );
}
