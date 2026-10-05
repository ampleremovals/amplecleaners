import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Ample Cleaners collects, uses and protects your personal information." };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="5 October 2026"
      intro="This explains what personal information Ample Cleaners collects when you book a clean, apply to work with us, or use our website and app, why we collect it, who we share it with, and the rights you have. We keep it in plain English."
    >
      <section>
        <h2>Who we are</h2>
        <p>Ample Cleaners is the controller of your personal information. You can contact us about anything in this policy at <a href="mailto:hello@amplecleaners.com">hello@amplecleaners.com</a> or on 0333 000 0000.</p>
      </section>

      <section>
        <h2>What we collect</h2>
        <p><strong>If you book a clean:</strong></p>
        <ul>
          <li>Your name, email address and phone number.</li>
          <li>The address and property details of the clean, access notes and anything you tell us.</li>
          <li>Your booking history, quotes, invoices and payment status. Card details are entered on Stripe&apos;s secure page and never reach or are stored by us.</li>
          <li>Records of the messages we send you (email, SMS and WhatsApp) and your ratings and feedback.</li>
        </ul>
        <p className="mt-3"><strong>If you apply to clean for us or work with us:</strong></p>
        <ul>
          <li>Your contact details, postcode, experience, availability and the areas you can cover.</li>
          <li>Right-to-work and DBS check documents, and bank details for pay.</li>
          <li>Your location when you clock in and out of a job, before-and-after photos taken during jobs, and your job and pay history.</li>
        </ul>
        <p className="mt-3"><strong>When you use our website:</strong> basic, privacy-friendly usage statistics (pages visited, device type) from Vercel Web Analytics, which does not use cookies or track you across other sites. We use only the cookies strictly necessary to keep our admin and cleaner sign-ins working.</p>
      </section>

      <section>
        <h2>Why we use it, and our legal basis</h2>
        <ul>
          <li><strong>To provide the service you asked for</strong> — quoting, booking, matching a cleaner, sending reminders, taking payment and invoicing (contract).</li>
          <li><strong>To keep our records and meet our legal duties</strong> — for example accounting and tax records (legal obligation).</li>
          <li><strong>To keep customers and cleaners safe and run a reliable business</strong> — vetting cleaners, preventing fraud, security, fixing problems and improving the service (legitimate interests).</li>
        </ul>
        <p className="mt-2">We do not sell your information, and we do not send marketing messages.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We use trusted service providers who process information on our behalf and only for our purposes:</p>
        <ul>
          <li><strong>Supabase</strong> — database, file storage and sign-in (data held in the EU).</li>
          <li><strong>Vercel</strong> — website hosting and analytics.</li>
          <li><strong>Stripe</strong> — card payments.</li>
          <li><strong>Resend</strong> — email, and <strong>Twilio</strong> — SMS and WhatsApp.</li>
          <li><strong>Expo</strong> — app notifications sent to our cleaners.</li>
        </ul>
        <p className="mt-2">Your cleaner sees only what they need for the job: your first name, address, phone number, access notes and the job details. Where a provider is based outside the UK, we rely on approved safeguards such as the UK&apos;s International Data Transfer Addendum or equivalent. We may also share information where the law requires it.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>We keep only what we need. Invoices and payment records are kept for at least six years for tax and accounting. Other booking information is kept while you remain a customer and for a reasonable period afterwards in case of queries or complaints. Unsuccessful cleaner applications are not kept longer than necessary. You can ask us to erase your personal information at any time (see below) — we will anonymise it while keeping the financial records we are legally required to keep.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under UK data protection law you can ask us to: see the information we hold about you; correct it; erase it; restrict or object to our use of it; and receive a copy in a portable format. Email <a href="mailto:hello@amplecleaners.com">hello@amplecleaners.com</a> and we will respond within one month. If you are unhappy with how we handle your information you can complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk" rel="noreferrer">ico.org.uk</a> — though we would always like the chance to put things right first.</p>
      </section>

      <section>
        <h2>Security</h2>
        <p>Data is encrypted in transit, access to our admin system is restricted and logged, documents and photos are stored privately, and cleaners can only see the jobs assigned to them. No system is perfectly secure, but we take reasonable technical and organisational steps to protect your information.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this policy we will update the date above, and tell you directly if the change is significant. See also our <Link href="/terms">Terms &amp; Conditions</Link>.</p>
      </section>
    </LegalPage>
  );
}
