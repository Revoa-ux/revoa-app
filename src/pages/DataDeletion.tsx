import { PageTitle } from '../components/PageTitle';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PageTitle
          title="Data Deletion Policy"
          subtitle="How to request deletion of your data"
        />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Your Right to Delete Your Data</h2>
            <p className="text-slate-700 leading-relaxed">
              At Revoa, we respect your right to control your personal data. You can request deletion of your
              data at any time, and we will comply with your request in accordance with applicable privacy laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">What Data Will Be Deleted</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              When you request data deletion, we will remove:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Account Information:</strong> Your email, name, and profile details</li>
              <li><strong>Instagram Data:</strong> All Instagram content, media, and insights we've stored</li>
              <li><strong>Product Data:</strong> Your product catalog and recommendations</li>
              <li><strong>Messages:</strong> All communication history</li>
              <li><strong>Analytics Data:</strong> Your usage data and preferences</li>
              <li><strong>Integration Data:</strong> Connected Shopify store information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data We May Retain</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              For legal and operational purposes, we may retain certain data:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Transaction Records:</strong> Financial transactions for accounting and tax purposes (7 years)</li>
              <li><strong>Legal Compliance:</strong> Data required by law or for legal proceedings</li>
              <li><strong>Fraud Prevention:</strong> Information necessary to prevent fraud and abuse</li>
              <li><strong>Backup Systems:</strong> Data in backup systems will be deleted within 90 days</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              This retained data will be kept secure and will not be used for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">How to Request Data Deletion</h2>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Method 1: Through Your Account</h3>
                <ol className="list-decimal list-inside text-slate-700 space-y-2 ml-2">
                  <li>Log in to your Revoa account</li>
                  <li>Go to Settings → Account Settings</li>
                  <li>Scroll to the "Delete Account" section</li>
                  <li>Click "Delete My Account and Data"</li>
                  <li>Confirm your decision</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Method 2: Email Request</h3>
                <p className="text-slate-700 mb-3">Send an email to <strong>privacy@revoa.com</strong> with:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
                  <li>Subject line: "Data Deletion Request"</li>
                  <li>Your registered email address</li>
                  <li>Your account username (if applicable)</li>
                  <li>Clear statement that you want your data deleted</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Method 3: Instagram Data Deletion</h3>
                <p className="text-slate-700 mb-3">
                  If you connected via Instagram and want to delete only your Instagram data:
                </p>
                <ol className="list-decimal list-inside text-slate-700 space-y-2 ml-2">
                  <li>Go to your Instagram Settings → Security → Apps and Websites</li>
                  <li>Find "Revoa Product Discovery" and remove it</li>
                  <li>Or email us at privacy@revoa.com to request Instagram data deletion</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-900 mb-3">For Shopify Merchants: Customer Data Deletion Requests</h3>
                <p className="text-slate-700 mb-3">
                  If you are a Shopify merchant and need to request deletion of your customer's data on their behalf
                  (as required by GDPR, CCPA, or other privacy laws):
                </p>
                <ol className="list-decimal list-inside text-slate-700 space-y-2 ml-2">
                  <li>Send an email to <strong>privacy@revoa.com</strong> with subject: "Customer Data Deletion Request"</li>
                  <li>Include the following information:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                      <li>Your Shopify store URL</li>
                      <li>Customer's email address or order ID</li>
                      <li>Reason for deletion request</li>
                    </ul>
                  </li>
                  <li>We will process the request within 48 hours</li>
                  <li>You will receive confirmation once deletion is complete</li>
                </ol>
                <p className="text-slate-700 mt-3 font-medium">
                  <strong>Note:</strong> Since we only store order amounts and product data (not customer personal information),
                  there is typically no customer personal data to delete. However, we will verify and confirm this for each request.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Deletion Timeline</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-32 font-medium text-slate-900">Immediately:</div>
                  <div className="text-slate-700">Your account is deactivated and you can no longer log in</div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-32 font-medium text-slate-900">Within 7 days:</div>
                  <div className="text-slate-700">All personal data deleted from active databases</div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-32 font-medium text-slate-900">Within 30 days:</div>
                  <div className="text-slate-700">Data deleted from all systems except legally required records</div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-32 font-medium text-slate-900">Within 90 days:</div>
                  <div className="text-slate-700">Data deleted from backup systems</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Verification Process</h2>
            <p className="text-slate-700 leading-relaxed">
              To protect your privacy and security, we will verify your identity before processing deletion requests.
              We may ask you to:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 mt-2 space-y-1">
              <li>Log in to your account to confirm the request</li>
              <li>Respond to an email sent to your registered address</li>
              <li>Provide additional identifying information if needed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Consequences of Data Deletion</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Please note that deleting your data:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-1">
              <li>Is permanent and cannot be undone</li>
              <li>Will close your account and you will lose access to all services</li>
              <li>Will remove all your product catalogs and recommendations</li>
              <li>Will disconnect all integrations (Instagram, Shopify, etc.)</li>
              <li>May affect pending transactions or orders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Alternatives to Full Deletion</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              If you're not ready for full deletion, consider these options:
            </p>
            <ul className="list-disc list-inside text-slate-700 ml-4 space-y-2">
              <li><strong>Disconnect Instagram:</strong> Remove only Instagram data access without deleting your account</li>
              <li><strong>Deactivate Account:</strong> Temporarily disable your account (can be reactivated later)</li>
              <li><strong>Export Data:</strong> Download your data before deletion</li>
              <li><strong>Delete Specific Data:</strong> Request deletion of specific data categories only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Meta (Facebook/Instagram) Data Deletion</h2>
            <p className="text-slate-700 leading-relaxed">
              This page serves as the Data Deletion Callback URL for our Meta app integration. When you remove
              our app from your Instagram account through Meta's settings, we automatically receive a deletion
              request and will delete all associated Instagram data within 30 days.
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              You will receive a confirmation code that you can use to check the status of your deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Questions or Concerns</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about data deletion or need assistance, please contact us:
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-slate-700">
                <strong>Email:</strong> privacy@revoa.com
              </p>
              <p className="text-slate-700">
                <strong>Response Time:</strong> We typically respond within 48 hours
              </p>
              <p className="text-slate-700">
                <strong>Support:</strong> Our privacy team is here to help with any data-related requests
              </p>
            </div>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-amber-900 mb-2">Important Reminder</h3>
            <p className="text-amber-800">
              Data deletion is permanent and cannot be reversed. Please make sure to export any data you want
              to keep before submitting a deletion request. If you're unsure, contact our support team first.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
