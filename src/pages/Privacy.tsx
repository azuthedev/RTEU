import React from 'react';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

const Privacy = () => {
  const { t, isLoading } = useLanguage();

  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Privacy Policy | Royal Transfer EU')}</title>
        <meta 
          name="description" 
          content={t('meta.description', 'Learn about how Royal Transfer EU collects, uses, and protects your personal data in accordance with EU privacy laws.')} 
        />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">{t('title', 'Privacy Policy')}</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <section className="mb-8">
              <p className="text-gray-600 mb-6">
                {t('intro.p1', 'Your privacy is important to us. This Privacy Policy explains how Royal Transfer EU collects, uses, and protects your personal data when you use our services or visit our website. We are committed to ensuring the privacy and security of your personal information.')}
              </p>
              
              <p className="text-gray-600 mb-4">
                {t('intro.p2', 'This policy applies to all personal data collected through our:')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>{t('intro.list.item1', 'Website at')} <a href="https://royaltransfereu.com" className="text-blue-600 hover:underline">royaltransfereu.com</a></li>
                <li>{t('intro.list.item2', 'Mobile application')}</li>
                <li>{t('intro.list.item3', 'Customer service interactions')}</li>
                <li>{t('intro.list.item4', 'Booking and transportation services')}</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('collect.title', 'Information We Collect')}</h2>
              <p className="text-gray-600 mb-4">
                {t('collect.description', 'We collect and process various types of personal data depending on how you interact with our services:')}
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium mb-2">{t('collect.provided.title', 'Information You Provide Us')}</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-2">
                    <li>{t('collect.provided.item1', 'Contact information (name, email address, phone number)')}</li>
                    <li>{t('collect.provided.item2', 'Account information (username, password)')}</li>
                    <li>{t('collect.provided.item3', 'Booking details (pickup/dropoff locations, dates, times, passenger information)')}</li>
                    <li>{t('collect.provided.item4', 'Payment information (credit card details, billing address)')}</li>
                    <li>{t('collect.provided.item5', 'Communication content (messages sent through our contact forms, emails, or chat)')}</li>
                    <li>{t('collect.provided.item6', 'Feedback and reviews')}</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">{t('collect.automatic.title', 'Information Collected Automatically')}</h3>
                  <ul className="list-disc pl-6 text-gray-600 space-y-2">
                    <li>{t('collect.automatic.item1', 'Device information (IP address, browser type, operating system)')}</li>
                    <li>{t('collect.automatic.item2', 'Usage data (pages visited, time spent on site, links clicked)')}</li>
                    <li>{t('collect.automatic.item3', 'Location data (when permitted by your device settings)')}</li>
                    <li>{t('collect.automatic.item4', 'Cookies and similar tracking technologies (as described in our Cookie Policy)')}</li>
                  </ul>
                </div>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('use.title', 'How We Use Your Information')}</h2>
              <p className="text-gray-600 mb-4">
                {t('use.description', 'We use your personal data for the following purposes:')}
              </p>
              
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>{t('use.item1', 'To provide and manage our transportation services')}</li>
                <li>{t('use.item2', 'To process bookings and payments')}</li>
                <li>{t('use.item3', 'To communicate with you about your bookings or inquiries')}</li>
                <li>{t('use.item4', 'To improve our services and website functionality')}</li>
                <li>{t('use.item5', 'To personalize your experience and offer relevant content')}</li>
                <li>{t('use.item6', 'To send promotional communications (with your consent)')}</li>
                <li>{t('use.item7', 'To comply with legal obligations')}</li>
                <li>{t('use.item8', 'To protect our rights, property, or safety')}</li>
              </ul>
              
              <p className="text-gray-600">
                {t('use.legal', 'We process your personal data based on contract performance, legal obligations, legitimate interests, and your consent where applicable.')}
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('rights.title', 'Your Rights')}</h2>
              <p className="text-gray-600 mb-4">
                {t('rights.description', 'Under data protection laws, you have rights regarding your personal data including:')}
              </p>
              
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li><strong>{t('rights.access.title', 'Access:')}</strong> {t('rights.access.description', 'Request a copy of your personal data')}</li>
                <li><strong>{t('rights.rectification.title', 'Rectification:')}</strong> {t('rights.rectification.description', 'Request correction of inaccurate data')}</li>
                <li><strong>{t('rights.erasure.title', 'Erasure:')}</strong> {t('rights.erasure.description', 'Request deletion of your data in certain circumstances')}</li>
                <li><strong>{t('rights.restriction.title', 'Restriction:')}</strong> {t('rights.restriction.description', 'Request limited processing of your data')}</li>
                <li><strong>{t('rights.portability.title', 'Data Portability:')}</strong> {t('rights.portability.description', 'Request transfer of your data in a structured format')}</li>
                <li><strong>{t('rights.objection.title', 'Objection:')}</strong> {t('rights.objection.description', 'Object to processing of your data in certain circumstances')}</li>
                <li><strong>{t('rights.consent.title', 'Withdraw Consent:')}</strong> {t('rights.consent.description', 'Revoke previously given consent')}</li>
              </ul>
              
              <p className="text-gray-600">
                {t('rights.contact', 'To exercise any of these rights, please contact us at')} <a href="mailto:privacy@royaltransfereu.com" className="text-blue-600 hover:underline">privacy@royaltransfereu.com</a>.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('security.title', 'Data Security')}</h2>
              <p className="text-gray-600">
                {t('security.description', 'We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, accidental loss, or destruction. Our security procedures are regularly reviewed and updated as necessary.')}
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('retention.title', 'Data Retention')}</h2>
              <p className="text-gray-600">
                {t('retention.description', 'We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including legal, accounting, or reporting requirements. When determining retention periods, we consider the amount, nature, and sensitivity of the data, the potential risk of harm from unauthorized use or disclosure, the purposes for which we process the data, and applicable legal requirements.')}
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('cookies.title', 'Cookies')}</h2>
              <p className="text-gray-600">
                {t('cookies.description', 'Our website uses cookies and similar technologies to enhance your browsing experience. Our Cookie Policy, which is available on our website, explains how we collect, use, and protect your personal information.')} <a href="/cookie-policy" className="text-blue-600 hover:underline">{t('cookies.link', 'Cookie Policy')}</a>.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('contact.title', 'Contact Us')}</h2>
              <p className="text-gray-600 mb-4">
                {t('contact.description', 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:')}
              </p>
              
              <div className="text-gray-600">
                <p>{t('contact.company', 'Royal Transfer EU')}</p>
                <p>{t('contact.email.label', 'Email:')} <a href="mailto:privacy@royaltransfereu.com" className="text-blue-600 hover:underline">{t('contact.email.address', 'privacy@royaltransfereu.com')}</a></p>
                <p>{t('contact.phone.label', 'Phone:')} {t('contact.phone.number', '+39 351 748 22 44')}</p>
                <p>{t('contact.address.label', 'Address:')} {t('contact.address.value', '123 Transfer Street, EU 12345')}</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Privacy;