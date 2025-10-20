import { PageTitle } from '../components/PageTitle';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PageTitle
          title="Terms of Service"
          subtitle="Last updated: October 20, 2025"
        />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Agreement to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using Revoa's services, you agree to be bound by these Terms of Service.
              If you disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Description of Service</h2>
            <p className="text-slate-700 leading-relaxed">
              Revoa provides a platform for product discovery, inventory management, and e-commerce integration.
              Our services include:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
              <li>AI-powered product recommendations based on Instagram content</li>
              <li>Product catalog management and import tools</li>
              <li>Integration with Shopify and other e-commerce platforms</li>
              <li>Analytics and performance tracking</li>
              <li>Communication tools for supplier collaboration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">User Accounts</h2>
            <div className="space-y-3">
              <p className="text-slate-700 leading-relaxed">
                To use our services, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
                <li>Not share your account with others</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Instagram Integration</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              By connecting your Instagram account, you grant us permission to:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
              <li>Access your Instagram business account data</li>
              <li>Analyze your content to provide product recommendations</li>
              <li>Store necessary data to provide our services</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              You can revoke these permissions at any time through your Instagram settings or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Acceptable Use</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or viruses</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use automated systems to access the service without permission</li>
              <li>Resell or redistribute our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Payments and Fees</h2>
            <div className="space-y-3">
              <p className="text-slate-700 leading-relaxed">
                Access to certain features may require payment. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>Pay all applicable fees as described in our pricing page</li>
                <li>Provide accurate payment information</li>
                <li>Pay a 2% commission on product sales facilitated through our platform</li>
                <li>Allow us to charge your payment method for all fees</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-3">
                All fees are non-refundable unless otherwise stated. We reserve the right to change our fees
                with 30 days' notice.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Intellectual Property</h2>
            <p className="text-slate-700 leading-relaxed">
              The service and its original content, features, and functionality are owned by Revoa and are
              protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              You retain all rights to the content you upload to our platform. By uploading content, you grant
              us a license to use, store, and display that content as necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed">
              Our service integrates with third-party services including Instagram, Shopify, and Stripe.
              Your use of these services is subject to their respective terms and privacy policies.
              We are not responsible for the content or practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Disclaimer of Warranties</h2>
            <p className="text-slate-700 leading-relaxed">
              OUR SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              WE DO NOT GUARANTEE THE ACCURACY OR RELIABILITY OF ANY PRODUCT RECOMMENDATIONS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVOA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS
              INTERRUPTION ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Indemnification</h2>
            <p className="text-slate-700 leading-relaxed">
              You agree to indemnify and hold Revoa harmless from any claims, damages, losses, or expenses
              arising from your use of the service, your violation of these terms, or your violation of any
              rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Termination</h2>
            <p className="text-slate-700 leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, if you breach these
              Terms of Service. You may terminate your account at any time by contacting us. Upon termination,
              your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify you of significant changes
              by posting the new terms on this page. Your continued use of the service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Information</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 text-slate-700">
              <p>Email: legal@revoa.com</p>
              <p>Address: [Your Business Address]</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
