import { PageTitle } from '../components/PageTitle';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PageTitle
          title="Privacy Policy"
          subtitle="Last updated: October 20, 2025"
        />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              Revoa ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Account Information</h3>
                <p className="text-slate-700 leading-relaxed">
                  When you create an account, we collect your email address, name, and authentication credentials.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Instagram Data</h3>
                <p className="text-slate-700 leading-relaxed">
                  With your permission, we access your Instagram business account data including:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
                  <li>Profile information (username, profile picture)</li>
                  <li>Media posts (photos, videos, captions)</li>
                  <li>Engagement metrics (likes, comments, views)</li>
                  <li>Insights and analytics data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Shopify Data</h3>
                <p className="text-slate-700 leading-relaxed">
                  If you connect your Shopify store, we access product information, inventory data, and order details.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Usage Information</h3>
                <p className="text-slate-700 leading-relaxed">
                  We collect information about how you use our platform, including features accessed, pages viewed, and actions taken.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">How We Use Your Information</h2>
            <p className="text-slate-700 leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Analyze Instagram content and suggest products</li>
              <li>Generate product recommendations and insights</li>
              <li>Process transactions and manage your account</li>
              <li>Communicate with you about our services</li>
              <li>Improve and personalize your experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-slate-700 leading-relaxed mb-3">We may share your information with:</p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Service Providers:</strong> Third-party companies that help us operate our platform (hosting, analytics, payment processing)</li>
              <li><strong>Business Partners:</strong> Suppliers and manufacturers you choose to work with</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Instagram Data Usage</h2>
            <p className="text-slate-700 leading-relaxed">
              We use Instagram data solely to provide our product discovery and recommendation services. Your Instagram data is:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
              <li>Stored securely in our database</li>
              <li>Used only for the purposes you authorized</li>
              <li>Never shared with unauthorized third parties</li>
              <li>Retained only as long as necessary to provide our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Security</h2>
            <p className="text-slate-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your information, including encryption,
              access controls, and secure data storage. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Your Rights</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (see our Data Deletion Policy)</li>
              <li>Revoke Instagram access permissions at any time</li>
              <li>Export your data</li>
              <li>Object to processing of your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide services.
              When you delete your account, we delete your personal information within 30 days, except where we're
              required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Children's Privacy</h2>
            <p className="text-slate-700 leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to This Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 text-slate-700">
              <p>Email: privacy@revoa.com</p>
              <p>Address: [Your Business Address]</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
