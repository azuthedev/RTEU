import React from 'react';
import Header from '../components/Header';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <section className="mb-8">
              <p className="text-gray-600 mb-6">
                Your privacy is important to us. This Privacy Policy explains how Royal Transfer EU collects, uses, 
                and protects your personal data when you use our services or visit our website. 
                We are committed to ensuring the privacy and security of your personal information.
              </p>
              
              <p className="text-gray-600 mb-4">
                This policy applies to all personal data collected through our:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>Website at <a href="https://royaltransfer.eu" className="text-blue-600 hover:underline">royaltransfer.eu</a></li>
                <li>Mobile application</li>
                <li>Customer service interactions</li>
                <li>Booking and transportation services</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <p className="text-gray-600 mb-4">
                We collect and process various types of personal data depending on how you interact with our services:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium mb-2">Information You Provide Us</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-2">
                    <li>Contact information (name, email address, phone number)</li>
                    <li>Account information (username, password)</li>
                    <li>Booking details (pickup/dropoff locations, dates, times, passenger information)</li>
                    <li>Payment information (credit card details, billing address)</li>
                    <li>Communication content (messages sent through our contact forms, emails, or chat)</li>
                    <li>Feedback and reviews</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Information Collected Automatically</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-2">
                    <li>Device information (IP address, browser type, operating system)</li>
                    <li>Usage data (pages visited, time spent on site, links clicked)</li>
                    <li>Location data (when permitted by your device settings)</li>
                    <li>Cookies and similar tracking technologies (as described in our Cookie Policy)</li>
                  </ul>
                </div>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">
                We use your personal data for the following purposes:
              </p>
              
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>To provide and manage our transportation services</li>
                <li>To process bookings and payments</li>
                <li>To communicate with you about your bookings or inquiries</li>
                <li>To improve our services and website functionality</li>
                <li>To personalize your experience and offer relevant content</li>
                <li>To send promotional communications (with your consent)</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights, property, or safety</li>
              </ul>
              
              <p className="text-gray-600">
                We process your personal data based on contract performance, legal obligations, legitimate interests, 
                and your consent where applicable.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-gray-600 mb-4">
                Under data protection laws, you have rights regarding your personal data including:
              </p>
              
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data in certain circumstances</li>
                <li><strong>Restriction:</strong> Request limited processing of your data</li>
                <li><strong>Data Portability:</strong> Request transfer of your data in a structured format</li>
                <li><strong>Objection:</strong> Object to processing of your data in certain circumstances</li>
                <li><strong>Withdraw Consent:</strong> Revoke previously given consent</li>
              </ul>
              
              <p className="text-gray-600">
                To exercise any of these rights, please contact us at <a href="mailto:privacy@royaltransfer.eu" className="text-blue-600 hover:underline">privacy@royaltransfer.eu</a>.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-gray-600">
                We implement appropriate technical and organizational measures to protect your personal data against 
                unauthorized access, accidental loss, or destruction. Our security procedures are regularly reviewed 
                and updated as necessary.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-gray-600">
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was 
                collected, including legal, accounting, or reporting requirements. When determining retention periods, 
                we consider the amount, nature, and sensitivity of the data, the potential risk of harm from unauthorized 
                use or disclosure, the purposes for which we process the data, and applicable legal requirements.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
              <p className="text-gray-600">
                Our website uses cookies and similar technologies to enhance your browsing experience. 
                For detailed information about how we use cookies, please refer to our <a href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a>.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              
              <div className="text-gray-600">
                <p>Royal Transfer EU</p>
                <p>Email: <a href="mailto:privacy@royaltransfer.eu" className="text-blue-600 hover:underline">privacy@royaltransfer.eu</a></p>
                <p>Phone: +39 351 748 22 44</p>
                <p>Address: 123 Transfer Street, EU 12345</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default Privacy;