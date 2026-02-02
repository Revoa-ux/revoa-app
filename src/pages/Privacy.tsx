import { PageTitle } from '../components/PageTitle';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PageTitle
          title="Privacy Policy"
          subtitle="Last updated: January 25, 2026"
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
                <h3 className="text-lg font-medium text-slate-800 mb-2">Shopify Store Data</h3>
                <p className="text-slate-700 leading-relaxed mb-2">
                  If you connect your Shopify store, we access the following data to provide profit tracking, analytics, and order management services:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                  <li><strong>Order Data:</strong> Order totals, dates, line items, SKUs, product IDs, transaction amounts, and order status</li>
                  <li><strong>Customer Information:</strong> Customer names and email addresses associated with orders (for communication and order management through our Resolution Center)</li>
                  <li><strong>Product Data:</strong> Product titles, prices, SKUs, variants, and inventory levels</li>
                  <li><strong>Fulfillment Data:</strong> Fulfillment status, tracking numbers, and shipping information</li>
                  <li><strong>Return Data:</strong> Return amounts and refund information</li>
                </ul>
                <p className="text-slate-700 leading-relaxed mt-3 mb-2">
                  <strong>Order Management Capabilities:</strong> With the <code className="bg-slate-100 px-1 rounded">write_orders</code> scope, our app can:
                </p>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                  <li>Cancel orders on your behalf when requested through our Resolution Center</li>
                  <li>Process refunds (full or partial) for orders when authorized by you</li>
                  <li>Update order information as needed for fulfillment</li>
                </ul>
                <p className="text-slate-700 leading-relaxed mt-3 font-medium text-sm">
                  <strong>Important:</strong> Customer personal information (names, emails) is only accessed and displayed within our secure platform for order management purposes. We never sell, share, or use customer data for marketing purposes. All order management actions are logged for your records.
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
              <li>Provide and maintain our services including profit tracking, analytics, and reporting</li>
              <li>Enable order management features including cancellations and refunds through our Resolution Center</li>
              <li>Display customer information (name, email) within our secure interface for order communication and support</li>
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
              <li><strong>Fulfillment Partners:</strong> Our fulfillment network to process and ship your orders</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Shopify Data Usage and Protection</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We use Shopify order and product data to provide profit tracking, analytics, reporting, and order management services.
              Your Shopify data is:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Purpose Limited:</strong> Used exclusively for calculating profit metrics, cost of goods sold, return rates, analytics, and enabling order management (cancellations, refunds) through our Resolution Center</li>
              <li><strong>Customer Data Protection:</strong> Customer personal information (names, emails) is only displayed within our secure interface to authorized users for order management purposes and is never exported, sold, or used for marketing</li>
              <li><strong>Securely Stored:</strong> All data is encrypted at rest using industry-standard encryption (AES-256) and in transit using TLS 1.3</li>
              <li><strong>Access Controlled:</strong> Only you and authorized administrators can access your store data and perform order management actions</li>
              <li><strong>Audit Trail:</strong> All order management actions (cancellations, refunds) are logged for your records and accountability</li>
              <li><strong>Never Sold:</strong> We will never sell, rent, or share your store data or customer data with third parties for marketing purposes</li>
              <li><strong>Merchant Transparency:</strong> You can view all data we access through your Shopify admin panel under API access</li>
            </ul>
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
            <p className="text-slate-700 leading-relaxed mb-3">
              We implement comprehensive technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Encryption at Rest:</strong> All data stored in our databases is encrypted using AES-256 encryption</li>
              <li><strong>Encryption in Transit:</strong> All data transmitted between your browser and our servers uses TLS 1.3 encryption</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) ensures only authorized personnel can access data</li>
              <li><strong>Secure Infrastructure:</strong> Hosted on enterprise-grade cloud infrastructure (Supabase) with SOC 2 Type II compliance</li>
              <li><strong>Regular Security Audits:</strong> We conduct regular security assessments and vulnerability testing</li>
              <li><strong>API Security:</strong> All API connections use OAuth 2.0 with secure token storage</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3 text-sm">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your data,
              we cannot guarantee absolute security.
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Retention and Deletion</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Retention Periods</h3>
                <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
                  <li><strong>Active Accounts:</strong> Data retained while your account is active and for the duration needed to provide services</li>
                  <li><strong>Shopify Data:</strong> Order and product data retained for 90 days after you disconnect your Shopify store or delete your account</li>
                  <li><strong>Instagram Data:</strong> Media and analytics data retained for 60 days after you revoke Instagram access</li>
                  <li><strong>Account Data:</strong> Profile and authentication data deleted within 30 days of account deletion</li>
                  <li><strong>Legal Compliance:</strong> Some data may be retained longer if required by law (e.g., financial records for tax purposes)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Data Deletion Process</h3>
                <p className="text-slate-700 leading-relaxed mb-2">
                  When you uninstall the Shopify app or delete your account:
                </p>
                <ol className="list-decimal list-inside text-slate-700 ml-4 space-y-1">
                  <li>We immediately revoke all API access tokens</li>
                  <li>Your store data becomes inaccessible through the app interface</li>
                  <li>Personal data is permanently deleted within 30 days</li>
                  <li>Shopify order data is permanently deleted within 90 days</li>
                  <li>You can request immediate deletion by contacting privacy@revoa.com</li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Customer Data Requests</h3>
                <p className="text-slate-700 leading-relaxed">
                  Shopify merchants can submit data deletion requests on behalf of their customers through the
                  <a href="/data-deletion" className="text-blue-600 hover:underline"> Data Deletion Request page</a>.
                  We process these requests within 48 hours as required by Shopify policies.
                </p>
              </div>
            </div>
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
              <p>Support: support@revoa.com</p>
              <p className="mt-2">For Shopify-related data protection inquiries, please include your store URL in your message.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
