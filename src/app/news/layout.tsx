import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Higher Education News",
  description:
    "The latest higher education news from across Asia: rankings, admissions, policy and university updates.",
  alternates: { canonical: "/news" },
  openGraph: { url: "/news", title: "Higher Education News | Asia University Rankings" },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
