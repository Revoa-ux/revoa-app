import { PageTitle } from '../components/PageTitle';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PageTitle
          title="Terms of Service"
          subtitle="Last updated: November 11, 2025"
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
              Revoa provides a Shopify app for profit tracking, analytics, and e-commerce management.
              Our services include:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
              <li>AI-powered product recommendations based on Instagram content</li>
              <li>Product catalog management and import tools</li>
              <li>Shopify store integration for profit tracking and analytics</li>
              <li>Order data analysis and return rate tracking</li>
              <li>Facebook Ads performance monitoring</li>
              <li>Communication tools for order fulfillment and support</li>
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Shopify Integration and Data Processing</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Data Access Agreement</h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  By installing the Revoa app on your Shopify store, you grant us permission to:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                  <li>Access your Shopify store's order data (order totals, dates, SKUs, and transaction amounts)</li>
                  <li>Access product information (titles, prices, SKUs, variants, and inventory levels)</li>
                  <li>Access fulfillment status and return information</li>
                  <li>Calculate profit metrics, cost of goods sold, and analytics based on this data</li>
                  <li>Store this data securely to provide ongoing analytics services</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Data Processing Principles</h3>
                <p className="text-slate-700 leading-relaxed mb-2">
                  We commit to the following principles when processing your Shopify store data:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
                  <li><strong>Minimum Data Collection:</strong> We only access the minimum data required to provide profit tracking and analytics services</li>
                  <li><strong>No Customer Personal Data:</strong> We do NOT access customer names, email addresses, phone numbers, or shipping addresses</li>
                  <li><strong>Purpose Limitation:</strong> We use your data exclusively for providing the services you requested (profit analytics, reporting)</li>
                  <li><strong>Transparency:</strong> We clearly disclose what data we process and why in our Privacy Policy</li>
                  <li><strong>No Data Sales:</strong> We will never sell, rent, or share your store data with third parties for marketing purposes</li>
                  <li><strong>Merchant Control:</strong> You can disconnect your store or request data deletion at any time</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Customer Privacy Rights</h3>
                <p className="text-slate-700 leading-relaxed mb-2">
                  We respect your customers' privacy rights. You agree to:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                  <li>Inform your customers about third-party apps that process order data</li>
                  <li>Comply with all applicable privacy laws (GDPR, CCPA, etc.)</li>
                  <li>Submit customer data deletion requests through our <a href="/data-deletion" className="text-blue-600 hover:underline">Data Deletion Request page</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Revoking Access</h3>
                <p className="text-slate-700 leading-relaxed">
                  You can revoke our access to your Shopify store at any time by:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
                  <li>Uninstalling the app from your Shopify admin panel</li>
                  <li>Disconnecting your store through the Settings page in our app</li>
                  <li>Contacting us at support@revoa.com</li>
                </ul>
                <p className="text-slate-700 leading-relaxed mt-3">
                  Upon disconnection, we will delete your store data within 90 days as outlined in our Privacy Policy.
                </p>
              </div>
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Payments and Billing</h2>
            <div className="space-y-3">
              <p className="text-slate-700 leading-relaxed">
                Revoa operates on a simple subscription model. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>Pay a monthly subscription fee of $29/month</li>
                <li>Allow billing to be processed through Shopify's billing system</li>
                <li>Take advantage of the 14-day free trial period before being charged</li>
                <li>Cancel your subscription at any time with no penalty</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-3">
                <strong>No Revenue Share or Commissions:</strong> We do not charge any commission or percentage
                of your sales. Your subscription fee includes unlimited products, orders, and full access to all features.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                <strong>Refund Policy:</strong> Monthly subscription fees are non-refundable. However, you may cancel
                at any time and will not be charged for subsequent months. We reserve the right to modify our pricing
                with 30 days' notice to existing subscribers.
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Security and Protection</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Encryption:</strong> All data is encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
              <li><strong>Access Controls:</strong> Role-based access control limits who can access your data</li>
              <li><strong>Secure Infrastructure:</strong> Hosted on SOC 2 Type II compliant cloud infrastructure</li>
              <li><strong>OAuth 2.0:</strong> All API connections use secure OAuth 2.0 authentication</li>
              <li><strong>Regular Audits:</strong> We conduct regular security assessments and vulnerability testing</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              In the event of a data breach, we will notify affected merchants within 72 hours as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed">
              Our service integrates with third-party services including Instagram, Shopify, Facebook Ads, and Stripe.
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Termination and Data Deletion</h2>
            <div className="space-y-3">
              <p className="text-slate-700 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, if you breach these
                Terms of Service. You may terminate your account at any time through the following methods:
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>Uninstalling the Shopify app from your store</li>
                <li>Disconnecting integrations through the Settings page</li>
                <li>Contacting us at support@revoa.com</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-3">
                Upon termination:
              </p>
              <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                <li>Your right to use the service will immediately cease</li>
                <li>All API access tokens will be revoked immediately</li>
                <li>Your personal data will be deleted within 30 days</li>
                <li>Your Shopify store data will be deleted within 90 days</li>
                <li>You may request immediate deletion by contacting privacy@revoa.com</li>
              </ul>
            </div>
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Compliance with Laws</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Both you and Revoa agree to comply with all applicable laws and regulations, including:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
              <li>General Data Protection Regulation (GDPR) for European merchants and customers</li>
              <li>California Consumer Privacy Act (CCPA) for California merchants and customers</li>
              <li>Shopify's API Terms of Service and Partner Program Agreement</li>
              <li>Facebook's Platform Terms and Advertising Policies</li>
              <li>All applicable data protection and privacy laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions. Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Information</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 text-slate-700 space-y-1">
              <p>Legal inquiries: legal@revoa.com</p>
              <p>General support: support@revoa.com</p>
              <p>Privacy concerns: privacy@revoa.com</p>
              <p className="mt-3">For Shopify-related inquiries, please include your store URL in your message.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
