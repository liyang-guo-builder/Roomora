import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Roomora",
  description: "How Roomora collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 2026">
      <p>
        This Privacy Policy explains how Roomora (&quot;we&quot;, &quot;us&quot;) collects, uses, and
        protects your personal data when you use room-ora.com (the &quot;Service&quot;). We are based
        in France and aim to comply with the EU General Data Protection Regulation (GDPR). For the
        purposes of the GDPR, Roomora is the data controller; you can reach us at{" "}
        <a href="mailto:privacy@room-ora.com">privacy@room-ora.com</a>.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> your email address, your name (if you provide it), and your
          sign-in method (email/password or Google).
        </li>
        <li>
          <strong>Room photos you upload</strong> and the <strong>designs generated</strong> for
          you.
        </li>
        <li>
          <strong>Payment data:</strong> when you buy credits, our processor Stripe handles your
          card details. We receive confirmation of the transaction but do not store your full card
          number.
        </li>
        <li>
          <strong>Usage and device data:</strong> basic technical information needed to run the
          Service (for example, requests, errors, and the language you choose).
        </li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To provide the core feature: processing your photo to generate restyled images.</li>
        <li>To manage your account, credit balance, and saved designs.</li>
        <li>To process payments and prevent abuse or fraud.</li>
        <li>To operate, secure, and improve the Service, and to respond to your requests.</li>
      </ul>

      <h2>3. Who we share data with (processors)</h2>
      <p>
        We do not sell your personal data. To run the Service, we share data with trusted providers
        who process it on our behalf. Importantly, the room photos you upload are sent to third-party
        AI providers to generate your restyled image:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentication, database, and storage of your account, photos,
          and designs.
        </li>
        <li>
          <strong>fal.ai</strong> — runs the image-generation models that create your restyled room.
        </li>
        <li>
          <strong>Google</strong> — provides one of the image models used to generate designs.
        </li>
        <li>
          <strong>MiniMax</strong> — used to describe the style of an inspiration photo in
          &quot;match a photo&quot; mode.
        </li>
        <li>
          <strong>Stripe</strong> — payment processing.
        </li>
        <li>
          <strong>Vercel</strong> — hosting of the website and app.
        </li>
      </ul>

      <h2>4. International transfers</h2>
      <p>
        Some of these providers process data outside the European Economic Area. Where that happens,
        we rely on appropriate safeguards (such as the providers&apos; Standard Contractual Clauses)
        to protect your data.
      </p>

      <h2>5. Legal basis</h2>
      <p>
        We process your data to perform our contract with you (providing the Service), based on your
        consent where required (for example, uploading a photo to be processed), and on our
        legitimate interests in operating, securing, and improving the Service.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your account data while your account is active. You can delete saved designs at any
        time from within the app, and you can ask us to delete your account and associated data.
        Some records may be retained where required by law (for example, payment records).
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under the GDPR you have the right to access, correct, delete, or export your data; to object
        to or restrict certain processing; and to withdraw consent at any time. To exercise these
        rights, contact <a href="mailto:privacy@room-ora.com">privacy@room-ora.com</a>. You also have
        the right to lodge a complaint with your local data-protection authority (in France, the
        CNIL).
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use essential cookies needed to keep you signed in and to run the Service. We do not use
        third-party advertising or cross-site tracking cookies.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not intended for children under 16, and we do not knowingly collect their
        data.
      </p>

      <h2>10. Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect your data. No method of
        transmission or storage is completely secure, but we work to safeguard your information.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy as the Service evolves. We will update the date above and, for
        material changes, take reasonable steps to notify you.
      </p>

      <h2>12. Contact</h2>
      <p>
        For any privacy question or request, contact{" "}
        <a href="mailto:privacy@room-ora.com">privacy@room-ora.com</a>.
      </p>
    </LegalPage>
  );
}
