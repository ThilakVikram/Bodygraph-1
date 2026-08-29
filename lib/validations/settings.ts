import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const currencySettingSchema = z.object({
  currency: z.enum(CURRENCY_CODES),
});
export type CurrencySettingInput = z.infer<typeof currencySettingSchema>;
