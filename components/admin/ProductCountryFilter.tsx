"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CountryCombobox } from "@/components/admin/SupplierFiltersBar";

interface Props {
  value: string;
  countries: string[];
}

export function ProductCountryFilter({ value, countries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(nextCountry: string) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextCountry) next.set("country", nextCountry);
    else next.delete("country");
    next.delete("page");

    startTransition(() => {
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  return (
    <CountryCombobox label="Country" value={value} countries={countries} onChange={handleChange} />
  );
}
