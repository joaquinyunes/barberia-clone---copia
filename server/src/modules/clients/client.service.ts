import { Types } from "mongoose";
import { randomInt } from "node:crypto";
import { AppError } from "../../lib/AppError.js";
import * as ledger from "../ledger/ledger.service.js";
import { getSettings } from "../settings/settings.model.js";
import { Membership } from "../commercial/commercial.models.js";
import { Client, normalizePhone } from "./client.model.js";

const slug = (s: string) => s.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "JACK";

export async function ensureReferralCode(client: InstanceType<typeof Client>) {
  if (client.referralCode) return client.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = `${slug(client.name.split(" ")[0])}${randomInt(10, 99)}`;
    if (!(await Client.exists({ referralCode: code }))) {
      client.referralCode = code;
      await client.save();
      return code;
    }
  }
  client.referralCode = `JACK${randomInt(1000, 9999)}`;
  await client.save();
  return client.referralCode;
}

/**
 * Busca el cliente por celular o lo crea. `trustEmail` solo desde el panel: un formulario
 * público no puede escribir el email de una ficha ajena (el registro vincula la cuenta por email).
 */
export async function findOrCreate(input: { name: string; phone: string; email?: string; referralCode?: string; source?: string; trustEmail?: boolean }) {
  const phone = normalizePhone(input.phone);
  let client = await Client.findOne({ phone });
  if (client) {
    if (client.blocked) throw AppError.forbidden("No es posible reservar online. Comunicate con la barbería.");
    if (input.trustEmail && input.email && !client.email) {
      client.email = input.email;
      await client.save();
    }
    return { client, isNew: false };
  }
  let referredBy: Types.ObjectId | undefined;
  if (input.referralCode) {
    const ref = await Client.findOne({ referralCode: input.referralCode.toUpperCase() });
    if (ref) referredBy = ref._id;
  }
  client = await Client.create({ name: input.name, phone, email: input.email, referredBy, source: referredBy ? "referido" : (input.source ?? "web") });
  await ensureReferralCode(client);
  return { client, isNew: true };
}

/** Tras cada visita: estadísticas, frecuencia, nivel y premio al referidor en la 1.ª visita. */
export async function afterVisit(clientId: unknown, at: Date, actor?: ledger.Actor) {
  const client = await Client.findById(clientId);
  if (!client) return;
  if (client.lastVisitAt && client.visits > 0) {
    const days = (at.getTime() - client.lastVisitAt.getTime()) / 86_400_000;
    client.avgFrequencyDays = client.avgFrequencyDays ? Math.round((client.avgFrequencyDays * (client.visits - 1) + days) / client.visits) : Math.round(days);
  }
  client.visits += 1;
  client.firstVisitAt ??= at;
  client.lastVisitAt = at;
  if (client.referredBy && !client.referralRewarded) {
    const settings = await getSettings();
    if (settings.referralReward > 0) {
      await ledger.post({ ownerType: "client", owner: client.referredBy, type: "referral_credit", amount: settings.referralReward, concept: `Referido: ${client.name}`, actor });
    }
    client.referralRewarded = true;
  }
  await client.save();
  await recomputeTier(client._id);
}

export async function recomputeTier(clientId: unknown) {
  const client = await Client.findById(clientId);
  if (!client) return;
  const settings = await getSettings();
  const [referrals, hasMembership] = await Promise.all([
    Client.countDocuments({ referredBy: client._id }),
    Membership.exists({ client: client._id, status: "active" }),
  ]);
  const seniority = client.firstVisitAt ? (Date.now() - client.firstVisitAt.getTime()) / 86_400_000 : 0;
  let tier = "normal";
  for (const t of settings.tiers) {
    // basta con cumplir UNA condición del nivel (no depende solo del dinero)
    const ok =
      (t.minVisits && client.visits >= t.minVisits) ||
      (t.minReferrals && referrals >= t.minReferrals) ||
      (t.minDaysSinceFirstVisit && seniority >= t.minDaysSinceFirstVisit) ||
      (t.withMembership && hasMembership) ||
      (!t.minVisits && !t.minReferrals && !t.minDaysSinceFirstVisit && !t.withMembership);
    if (ok && t.key) tier = t.key;
  }
  if (tier !== client.tier) {
    client.tier = tier;
    await client.save();
  }
  return tier;
}

export async function tierDiscountPct(tier: string) {
  const settings = await getSettings();
  return settings.tiers.find((t) => t.key === tier)?.discountPct ?? 0;
}

export async function creditLimitOf(client: { creditLimit?: number | null }) {
  if (typeof client.creditLimit === "number") return client.creditLimit;
  return (await getSettings()).clientCreditLimit;
}
