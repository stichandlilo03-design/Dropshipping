'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft size={20} />
          Back Home
        </Link>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: February 4, 2026</p>

          <div className="space-y-8 text-gray-300">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
              <p className="mb-4">We collect information in several ways:</p>
              <div className="pl-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2">1.1 Information You Provide Directly</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Name, email address, and phone number</li>
                    <li>Mailing address and billing information</li>
                    <li>Payment information (processed securely through Stripe)</li>
                    <li>Product information and catalog data</li>
                    <li>Seller profile and account credentials</li>
                    <li>Customer support communications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">1.2 Information Automatically Collected</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Browser type, IP address, and device information</li>
                    <li>Pages visited and time spent on our platform</li>
                    <li>Cookies and similar tracking technologies</li>
                    <li>Pinterest pixel tracking data (page views, add-to-cart, purchases)</li>
                    <li>Email addresses through Enhanced Match for conversion tracking</li>
                    <li>Analytics data about your interaction with our site</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">1.3 Third-Party Information</h3>
                  <p>We may receive information from third-party integrations including:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Payment processors (Stripe)</li>
                    <li>Fulfillment providers (Printful)</li>
                    <li>Email service providers (Gmail, SendGrid)</li>
                    <li>Advertising platforms (Pinterest, TikTok, Instagram, Shopify)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Information</h2>
              <p className="mb-4">We use the information we collect for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processing orders and transactions</li>
                <li>Providing customer support and responding to inquiries</li>
                <li>Sending transactional emails and notifications</li>
                <li>Marketing and promotional communications (with your consent)</li>
                <li>Tracking conversions and optimizing advertising campaigns</li>
                <li>Analyzing user behavior and improving our platform</li>
                <li>Preventing fraud and ensuring platform security</li>
                <li>Complying with legal and regulatory obligations</li>
                <li>Integrating with third-party services for enhanced functionality</li>
              </ul>
            </section>

            {/* Section 3 - NEW: Pinterest Integration */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Pinterest Conversion Tracking</h2>
              <p className="mb-4">
                Our platform integrates with Pinterest's conversion tracking pixel to help merchants track conversions and optimize their advertising campaigns:
              </p>
              <div className="pl-4 space-y-3">
                <div>
                  <p className="font-semibold text-white">What We Track:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-300">
                    <li>Product page views</li>
                    <li>Add-to-cart events</li>
                    <li>Purchase conversions</li>
                    <li>Customer email addresses (with consent)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-white">Why We Track:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-300">
                    <li>To measure ad performance</li>
                    <li>To build audience segments</li>
                    <li>To optimize advertising campaigns</li>
                    <li>To enable Enhanced Match for better targeting</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-white">Data Retention:</p>
                  <p className="text-gray-300">Pinterest maintains this data according to their own privacy policies. For more information, visit: <a href="https://policy.pinterest.com/en/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">https://policy.pinterest.com/en/privacy-policy</a></p>
                </div>
                <div>
                  <p className="font-semibold text-white">Your Rights:</p>
                  <p className="text-gray-300">You can opt out of personalized advertising in your Pinterest account settings at any time.</p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Data Security</h2>
              <p className="mb-4">We implement industry-standard security measures to protect your personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure authentication through Firebase</li>
                <li>PCI DSS compliance for payment processing through Stripe</li>
                <li>Regular security audits and system updates</li>
                <li>Restricted access to sensitive information</li>
              </ul>
              <p className="mt-4 text-sm italic">
                While we strive to protect your information, no security system is completely impenetrable. We cannot guarantee absolute security of your data.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Information Sharing and Disclosure</h2>
              <p className="mb-4">We may share your information with:</p>
              <div className="pl-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2">5.1 Service Providers</h3>
                  <p className="text-gray-300">Third-party providers who assist us in operating our platform and conducting our business, including Stripe (payments), Printful (fulfillment), Firebase (authentication), SendGrid (email), and Pinterest (conversion tracking).</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">5.2 Advertising Partners</h3>
                  <p className="text-gray-300">We share conversion data with advertising platforms (Pinterest, TikTok, Instagram, Shopify) to optimize campaigns and measure performance.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">5.3 Legal Requirements</h3>
                  <p className="text-gray-300">When required by law, court order, or government request, we may disclose your information.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">5.4 What We Do NOT Do</h3>
                  <p className="text-gray-300">We do NOT sell your personal information to third parties for their direct marketing purposes.</p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Cookies and Tracking Technologies</h2>
              <p className="mb-4">Our platform uses cookies and similar tracking technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Remember your preferences and login information</li>
                <li>Understand how you use our platform</li>
                <li>Track pixel data for advertising optimization</li>
                <li>Improve user experience and functionality</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. However, disabling cookies may impact platform functionality.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Your Privacy Rights</h2>
              <p className="mb-4">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate or outdated data</li>
                <li>Request deletion of your information</li>
                <li>Opt out of marketing communications</li>
                <li>Data portability (receive your data in a portable format)</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us at support@dropshipwithmonk.sbs
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Children's Privacy</h2>
              <p>
                Our platform is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will promptly delete such information.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Third-Party Links and Services</h2>
              <p>
                Our platform may contain links to third-party websites and services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. International Data Transfers</h2>
              <p>
                Your information may be transferred to, stored in, and processed in countries other than your country of residence. By using our platform, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection laws.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. When we make material changes, we will notify you by updating the "Last Updated" date at the top of this policy. Your continued use of our platform after changes indicates your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* Section 12 - UPDATED: Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">12. Contact Us</h2>
              <p className="mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-slate-900/50 rounded-lg p-6 space-y-3">
                <div>
                  <p className="font-semibold text-white">Email:</p>
                  <p className="text-gray-300">support@dropshipwithmonk.sbs</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Website:</p>
                  <p className="text-gray-300">www.dropshipwithmonk.sbs</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Support Portal:</p>
                  <p className="text-gray-300">Visit our Help page for additional assistance</p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-slate-600 pt-8 mt-8">
              <p className="text-sm text-gray-400">
                By using DropBoard, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, please do not use our platform.
              </p>
              <p className="text-sm text-gray-400 mt-4">
                © 2026 DropBoard. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
