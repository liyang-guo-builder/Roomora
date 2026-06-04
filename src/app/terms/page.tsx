import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · Roomora",
  description: "The terms governing your use of Roomora.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 2026">
      <p>
        Welcome to Roomora. These Terms of Service (&quot;Terms&quot;) govern your use of the
        Roomora website and app at room-ora.com (the &quot;Service&quot;). By creating an account or
        using the Service, you agree to these Terms. If you do not agree, please do not use the
        Service.
      </p>

      <h2>1. What Roomora does</h2>
      <p>
        Roomora lets you upload a photo of a room and generate AI-restyled versions of it in
        different interior-design styles, with the aim of keeping your room&apos;s actual structure
        (walls, windows, doors, proportions) recognizable. Generated images are{" "}
        <strong>AI-created approximations for inspiration only</strong>. Any furniture or decor shown
        is imagined by the AI and is not a specific product offer. Where we show shoppable items,
        they are suggestions of a <em>similar look</em>, not the exact rendered object.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 16 years old (or the age of digital consent in your country) to use the
        Service. By using Roomora you confirm that you meet this requirement.
      </p>

      <h2>3. Your account</h2>
      <p>
        You can sign in with email and a password or with Google. You are responsible for keeping
        your login details secure and for activity under your account. Notify us promptly of any
        unauthorized use.
      </p>

      <h2>4. Credits and payments</h2>
      <ul>
        <li>The Service runs on credits. Each design generation or refinement uses one credit.</li>
        <li>
          New and anonymous users may receive a limited number of free credits at our discretion;
          free credits have no cash value and may change at any time.
        </li>
        <li>
          Paid credits are purchased through our payment processor, Stripe, in euros (EUR). We do
          not store your full card details.
        </li>
        <li>
          Because credits unlock a digital service that is delivered immediately, purchased credits
          are generally non-refundable except where required by applicable law. If a generation
          fails for a technical reason on our side, the credit is automatically refunded.
        </li>
      </ul>

      <h2>5. Your content and the license you grant us</h2>
      <p>
        You keep ownership of the room photos you upload and of the designs generated for you. To
        provide the Service, you grant Roomora a limited license to host, process, and transmit your
        uploaded photos and generated images, including sending them to the third-party AI and
        infrastructure providers described in our{" "}
        <a href="/privacy">Privacy Policy</a>, solely to operate and improve the Service. You can
        delete your saved designs at any time.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>Only upload photos you own or have permission to use.</li>
        <li>
          Do not upload content that is illegal, infringing, harmful, hateful, or that depicts
          people in a way that violates their rights or privacy.
        </li>
        <li>Do not misuse, overload, reverse-engineer, or attempt to disrupt the Service.</li>
      </ul>

      <h2>7. Shopping links and affiliate disclosure</h2>
      <p>
        Some product suggestions may include affiliate links. If you buy through them, we may earn a
        commission at no extra cost to you. We are not the seller and are not responsible for
        third-party retailers, their products, prices, or delivery.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Roomora name, logo, design, and software are owned by us and protected by law. These
        Terms do not grant you any rights to our branding.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available.&quot; AI-generated results
        may contain inaccuracies and are not professional interior-design, architectural, or
        construction advice. We do not guarantee that results are error-free or fit for any
        particular purpose.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Roomora is not liable for indirect, incidental, or
        consequential damages, or for any loss arising from your reliance on AI-generated results or
        on third-party retailers. Nothing in these Terms limits liability that cannot be limited
        under applicable law.
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        We may suspend or terminate accounts that breach these Terms. You may stop using the Service
        and request deletion of your account at any time.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms as the Service evolves. We will update the date above and, for
        material changes, take reasonable steps to notify you. Continued use after changes means you
        accept the updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of France, without prejudice to any mandatory consumer
        protections in your country of residence.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href="mailto:hello@room-ora.com">hello@room-ora.com</a>.
      </p>
    </LegalPage>
  );
}
