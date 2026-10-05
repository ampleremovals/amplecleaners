"use client";

import Link from "next/link";
import { LegalPage } from "@/components/shared/LegalPage";
import { usePricing } from "@/components/shared/PricingProvider";

export default function TermsPage() {
  const { hourlyRate, minHours, depositPercentage } = usePricing();
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="5 October 2026"
      intro="These terms apply when you book a cleaning service with Ample Cleaners. By placing a booking you agree to them. If anything is unclear, call us on 0333 000 0000 before you book."
    >
      <section>
        <h2>Our services and prices</h2>
        <p>We offer Regular, Deep, End of Tenancy, Office and After-Builders cleaning. Regular Cleaning is charged at <strong>£{hourlyRate} per hour with a {minHours}-hour minimum</strong>, and the price you see when you book is the price you pay. Other services are quoted individually and the quote is fixed for what we agree. There are no hidden fees. We will not charge more than the quoted price without your agreement.</p>
      </section>

      <section>
        <h2>Booking, deposit and payment</h2>
        <ul>
          <li>Your booking is secured when you pay the deposit, which is <strong>{depositPercentage}% of the price</strong> shown on your quote. The remainder is invoiced when the clean is finished and is due within 7 days.</li>
          <li>You can pay by card (a small card-processing fee is added at checkout) or by bank transfer, which has no fee.</li>
          <li>For regular cleans, each visit is invoiced after it is completed — there is no subscription and you are never charged for a visit that did not happen.</li>
        </ul>
      </section>

      <section>
        <h2>Changing or cancelling</h2>
        <ul>
          <li>You can move or cancel a clean <strong>free of charge up to 48 hours before it is due to start</strong>, using the &quot;Manage my booking&quot; link in your messages.</li>
          <li>If you cancel at least 48 hours ahead, any deposit you have paid is refunded.</li>
          <li>Within 48 hours of the start time, please call us. We will always try to help; in that window we may be unable to refund the deposit because we have reserved a cleaner for you.</li>
          <li>You can stop a regular clean at any time; we will cancel your upcoming visits.</li>
          <li>We may need to reschedule if a cleaner becomes unavailable. We will offer a replacement cleaner or another date, and if we cannot, we will refund anything you have paid for that visit.</li>
        </ul>
      </section>

      <section>
        <h2>Your home and access</h2>
        <p>Please make sure we can get in at the agreed time and that the property is safe to work in. Tell us about pets, alarms, parking and anything fragile or sentimental. If we cannot gain access, we may charge for the booked time. Our cleaners are DBS-checked and bring the equipment needed unless agreed otherwise; tell us in advance if you want us to use your own products.</p>
      </section>

      <section>
        <h2>Our standard of work and complaints</h2>
        <p>We will carry out the service with reasonable care and skill. If you are not happy with a clean, tell us as soon as possible — ideally within 24 hours — and we will work with you to put it right, which may include returning to re-clean the area at no extra charge. Contact <a href="mailto:hello@amplecleaners.com">hello@amplecleaners.com</a> or call 0333 000 0000.</p>
      </section>

      <section>
        <h2>Damage and liability</h2>
        <p>We are fully insured. Please report any damage to us promptly so we can investigate and, where we are responsible, put it right. Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot legally be limited. Otherwise, our liability to you is limited to the losses that were a reasonably foreseeable result of our failure to take reasonable care, and we are not liable for loss of profit or indirect loss. Your legal rights as a consumer are not affected.</p>
      </section>

      <section>
        <h2>Your information</h2>
        <p>How we use your personal information is explained in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </section>

      <section>
        <h2>General</h2>
        <p>These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction, although if you live in Scotland or Northern Ireland you may also bring a claim in your local courts. We may update these terms; the version in force when you book applies to that booking.</p>
      </section>
    </LegalPage>
  );
}
