import { HomeView } from "@/components/home/HomeView";

/** Control (variant A). Variant B is served from /lp/b via a middleware rewrite — see lib/experiments.ts. */
export default function HomePage() {
  return <HomeView variant="a" />;
}
