import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CURRENCY } from "@/lib/constants";

/** The gym's configured currency (ISO 4217 code), memoized per request. */
export const getCurrency = cache(async (): Promise<string> => {
  const settings = await prisma.appSetting.findUnique({ where: { id: "app" } });
  return settings?.currency ?? CURRENCY;
});
