/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { generateBookingReference, normaliseUKPhone, formatDate } from "@/lib/utils";
import { regularCleaningPrice } from "@/lib/pricing";
import { getPricing } from "@/lib/pricing-config";
import { defaultTasks } from "@/lib/tasks-template";
import { generateQuoteConfirmToken } from "@/lib/tokens";
import { markQuoteSent, sendQuoteMessages } from "@/lib/bookings/quoteDelivery";
import { notifyCustomer, sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const SERVICE_TYPES: ServiceType[] = ["regular_cleaning", "deep_cleaning", "end_of_tenancy", "office_cleaning", "after_builders"];

export const bookingInputSchema = z.object({
  serviceType: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8),
  propertyType: z.enum(["flat", "house", "studio", "office", "other"]),
  bedrooms: z.number().int().min(0).max(10).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  frequency: z.enum(["one_off", "weekly", "fortnightly", "monthly"]).optional(),
  hours: z.number().min(1).max(24).optional(), // the minimum is enforced from Settings in createBooking
  line1: z.string().trim().min(2),
  line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().trim().min(3),
  cleanDate: z.string().optional(),
  cleanTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isFlexibleDate: z.boolean().optional(),
  specialInstructions: z.string().max(2000).optional(),
  /** Marketing attribution carried through the URL (utm_*, gclid, fbclid). Free text, length-capped. */
  attribution: z
    .object({
      utm_source: z.string().max(200).optional(), utm_medium: z.string().max(200).optional(), utm_campaign: z.string().max(200).optional(),
      utm_term: z.string().max(200).optional(), utm_content: z.string().max(200).optional(),
      gclid: z.string().max(200).optional(), fbclid: z.string().max(200).optional(),
    })
    .optional(),
  /** Admin-only: a hand-agreed price for services without a fixed rate. */
  quoteTotal: z.number().positive().max(100000).optional(),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export interface CreatedBooking {
  id: string;
  reference: string;
  total: number | null;
}

/**
 * Creates customer (reused by email), address and booking, with the audit
 * trail. Regular Cleaning is priced instantly from Settings (rate, min hours); any other
 * service only gets a price when an admin supplies `quoteTotal`.
 * The deposit % is stamped on the row at creation (Lesson 18).
 */
export async function createBooking(input: BookingInput, source: string, actor: "customer" | "admin"): Promise<CreatedBooking> {
  const supabase: any = createAdminClient();
  const phone = normaliseUKPhone(input.phone);

  const { data: existing } = await supabase.from("customers").select("id").ilike("email", input.email).maybeSingle();
  const customerId: string | undefined =
    existing?.id ?? (await supabase.from("customers").insert({ full_name: input.fullName, email: input.email, phone }).select("id").single()).data?.id;
  if (!customerId) throw new Error("Could not create customer");

  const { data: address, error: addrErr } = await supabase
    .from("addresses")
    .insert({ line_1: input.line1, line_2: input.line2 ?? null, city: input.city ?? null, postcode: input.postcode.toUpperCase() })
    .select("id")
    .single();
  if (addrErr || !address) throw new Error(`Address insert failed: ${addrErr?.message}`);

  const cfg = await getPricing();
  const isRegular = input.serviceType === "regular_cleaning";
  const hours = isRegular ? Math.max(cfg.minHours, input.hours ?? cfg.minHours) : null;
  let total: number | null = null;
  let lineItems: { description: string; quantity: number; unit_price: number; total: number }[] = [];
  if (isRegular && hours && input.quoteTotal == null) {
    total = regularCleaningPrice(hours, cfg);
    lineItems = [{ description: `Regular cleaning — ${hours} hours @ £${cfg.hourlyRate}/hr`, quantity: hours, unit_price: cfg.hourlyRate, total }];
  } else if (input.quoteTotal != null) {
    total = Math.round(input.quoteTotal * 100) / 100;
    lineItems = [{ description: SERVICE_LABELS[input.serviceType], quantity: 1, unit_price: total, total }];
  }

  const reference = generateBookingReference(input.serviceType);
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      reference,
      service_type: input.serviceType,
      customer_id: customerId,
      address_id: address.id,
      property_type: input.propertyType,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      frequency: isRegular ? (input.frequency ?? "weekly") : "one_off",
      clean_date: input.isFlexibleDate ? null : input.cleanDate || null,
      clean_time: input.cleanTime ?? null,
      is_flexible_date: input.isFlexibleDate ?? false,
      special_instructions: input.specialInstructions ?? null,
      status: "inquiry",
      source,
      tasks: defaultTasks(input.serviceType),
      quote_line_items: lineItems,
      quote_subtotal: total,
      quote_total: total,
      deposit_percentage: cfg.depositPercentage,
      utm_source: input.attribution?.utm_source ?? null, utm_medium: input.attribution?.utm_medium ?? null,
      utm_campaign: input.attribution?.utm_campaign ?? null, utm_term: input.attribution?.utm_term ?? null,
      utm_content: input.attribution?.utm_content ?? null, gclid: input.attribution?.gclid ?? null, fbclid: input.attribution?.fbclid ?? null,
    })
    .select("id, reference")
    .single();
  if (bookingErr || !booking) throw new Error(`Booking insert failed: ${bookingErr?.message}`);

  await Promise.allSettled([
    // They finished the form: stop any "unfinished booking" reminders.
    supabase.from("abandoned_leads").update({ converted_at: new Date().toISOString() }).eq("email", input.email.trim().toLowerCase()).is("converted_at", null),
    supabase.from("status_history").insert({ booking_id: booking.id, previous_status: null, new_status: "inquiry", changed_by: actor }),
    supabase.from("activity_log").insert({ booking_id: booking.id, action: "booking_created", metadata: { source, service_type: input.serviceType }, performed_by: actor }),
  ]);
  return { id: booking.id, reference: booking.reference, total };
}

export interface AfterCreateOptions {
  /** Email the admin that a booking arrived. */
  alertAdmin: boolean;
  /** Message the customer (instant quote if priced, otherwise an acknowledgement). */
  messageCustomer: boolean;
}

/**
 * Everything that should happen automatically the moment a booking exists:
 *  - admin gets an email (so enquiries never sit unseen);
 *  - a PRICED booking immediately gets the quote + "pay your deposit" link on
 *    email/SMS/WhatsApp (and the status moves to quote_sent);
 *  - an unpriced one gets a short acknowledgement instead.
 * Returns the quote path when one was sent, so the confirmation page can offer
 * "Pay your deposit now". Never throws — messaging failures are logged.
 */
export async function afterBookingCreated(bookingId: string, opts: AfterCreateOptions): Promise<{ quotePath: string | null }> {
  const supabase: any = createAdminClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, reference, status, service_type, clean_date, quote_total, deposit_percentage, special_instructions, customer:customers(full_name, email, phone), address:addresses(postcode)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { quotePath: null };

  const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
  const address = Array.isArray(b.address) ? b.address[0] : b.address;
  const service = SERVICE_LABELS[b.service_type as ServiceType];
  const firstName = String(customer?.full_name ?? "there").split(" ")[0];
  const total = Number(b.quote_total) || 0;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let quotePath: string | null = null;

  try {
    if (opts.messageCustomer && customer) {
      const token = generateQuoteConfirmToken(b.id);
      if (total > 0 && token) {
        quotePath = `/quote/${b.id}/${token}`;
        await markQuoteSent(supabase, b.id, b.status);
        await sendQuoteMessages({
          bookingId: b.id, token, reference: b.reference, serviceType: b.service_type, firstName,
          email: customer.email, phone: customer.phone, total, depositPercentage: Number(b.deposit_percentage) || 20,
        });
      } else {
        await notifyCustomer({
          context: "booking acknowledgement",
          email: customer.email,
          phone: customer.phone,
          subject: `We've got your ${service.toLowerCase()} request (${b.reference})`,
          html: emailShell({
            heading: "We've got your request ✨",
            reference: b.reference,
            bodyHtml: `<p>Hi ${firstName},</p><p>Thanks for choosing Ample Cleaners. We're putting together your fixed-price quote for your ${service.toLowerCase()} and will send it very shortly — no obligation.</p>`,
          }),
          sms: `Ample Cleaners: thanks ${firstName}! We've got your ${service.toLowerCase()} request and will send your fixed-price quote shortly. Ref ${b.reference}`,
          whatsapp: `Hi ${firstName}, thanks for choosing Ample Cleaners ✨ We've got your ${service.toLowerCase()} request and will send your fixed-price quote shortly.\n\nRef: ${b.reference}`,
        });
      }
    }

    if (opts.alertAdmin) {
      await sendEmailSafe({
        to: resendAdminEmail,
        subject: `New ${service} ${total > 0 ? "booking" : "enquiry"} — ${customer?.full_name ?? ""} (${b.reference})`,
        context: "admin: new booking alert",
        html: emailShell({
          heading: total > 0 ? "New booking" : "New enquiry — needs a quote",
          reference: b.reference,
          bodyHtml: `<p><strong>${customer?.full_name ?? "A customer"}</strong> · ${customer?.phone ?? ""} · ${customer?.email ?? ""}</p><p>${service}${b.clean_date ? ` on <strong>${formatDate(b.clean_date)}</strong>` : " (flexible date)"} · ${address?.postcode ?? ""}</p>${total > 0 ? `<p>Priced automatically at <strong>£${total.toFixed(2)}</strong> — the quote and deposit link have already gone to the customer.</p>` : `<p>This service needs a hand-built quote.</p>`}${b.special_instructions ? `<p style="background:#fffbeb;border-left:4px solid #b45309;padding:10px;">${String(b.special_instructions).replace(/</g, "&lt;")}</p>` : ""}`,
          cta: { label: total > 0 ? "Open booking" : "Build the quote", href: `${site}/admin/bookings/${b.id}` },
        }),
      });
    }
  } catch (e) {
    await createAdminClient().from("server_logs").insert({ level: "error", message: "after-booking automation failed", metadata: { bookingId, error: String(e) } });
  }
  return { quotePath };
}
