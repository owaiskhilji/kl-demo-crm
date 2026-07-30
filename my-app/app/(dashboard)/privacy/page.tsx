export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</em></p>

      <p>
        This Privacy Policy explains how KL Demo CRM ("we", "our", "us") collects, uses, and
        protects information when you interact with our services, including our integration with
        Facebook and Instagram Lead Ads.
      </p>

      <h2>1. Information We Collect</h2>
      <p>When you submit a lead form via Facebook or Instagram advertising, we collect the information you
      voluntarily provide in that form, which may include:</p>
      <ul>
        <li>Full name</li>
        <li>Phone number</li>
        <li>Email address</li>
        <li>Any additional fields configured in the specific lead form (e.g., property interest, budget)</li>
      </ul>
      <p>We also receive metadata associated with the lead submission, such as the Page ID, Form ID, and
      submission timestamp, via Meta's Lead Ads Webhooks and Graph API.</p>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information solely to:</p>
      <ul>
        <li>Follow up with you regarding your inquiry</li>
        <li>Manage and organize customer relationships within our CRM system</li>
        <li>Improve our services and customer communication</li>
      </ul>
      <p>We do not sell, rent, or trade your personal information to third parties.</p>

      <h2>3. Data Storage and Security</h2>
      <p>Lead data is stored securely in our database with encryption at rest for sensitive credentials.
      Access to this data is restricted to authorized personnel within our organization who require it
      to perform their duties.</p>

      <h2>4. Data Retention</h2>
      <p>We retain lead information for as long as necessary to fulfil the purposes described in this
      policy, or as required by applicable law. You may request deletion of your data at any time by
      contacting us using the details below.</p>

      <h2>5. Third-Party Services</h2>
      <p>Our system integrates with Meta's Graph API (Facebook and Instagram) to receive lead
      submissions. Meta's own data practices are governed by their respective privacy policies, available
      at <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">facebook.com/privacy/policy</a>.</p>

      <h2>6. Your Rights</h2>
      <p>Depending on your location, you may have the right to access, correct, or request deletion of
      your personal data. To exercise these rights, please contact us using the information below.</p>

      <h2>7. Data Deletion Requests</h2>
      <p>To request deletion of your data, please email us at the contact address below with your name
      and the phone number or email address you submitted. We will process your request within a
      reasonable timeframe.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page
      with an updated revision date.</p>

      <h2>9. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy or how your data is handled, please contact
      us at: <strong>shahestate1976@gmail.com</strong></p>
    </div>
  );
}