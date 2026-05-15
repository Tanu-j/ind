export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  popular?: boolean;
  description: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 100,
    priceUsd: 9,
    description: "100 URL submissions — great for small sites",
  },
  {
    id: "growth",
    name: "Growth",
    credits: 500,
    priceUsd: 29,
    popular: true,
    description: "500 URLs — best value for blogs & stores",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2000,
    priceUsd: 79,
    description: "2,000 URLs — agencies & high-volume publishers",
  },
  {
    id: "agency",
    name: "Agency",
    credits: 10000,
    priceUsd: 299,
    description: "10,000 URLs — bulk indexing at scale",
  },
];

export function getCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
