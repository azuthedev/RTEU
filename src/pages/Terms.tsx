import React, { useEffect } from 'react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { updateMetaTags, addStructuredData } from '../utils/seo';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Terms = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Update meta tags and structured data for SEO
    updateMetaTags(
      'Terms & Conditions | Royal Transfer EU',
      'Terms and conditions for Royal Transfer EU premium airport transfer services. Read our terms of service before booking.',
      location.pathname
    );
    
    // Add structured data for the legal page
    addStructuredData('WebPage', {
      name: 'Terms & Conditions',
      description: 'Terms and conditions for Royal Transfer EU premium airport transfer services',
      url: 'https://royaltransfer.eu/terms',
      mainContentOfPage: {
        '@type': 'WebPageElement',
        isAccessibleForFree: 'True',
        cssSelector: '.terms-content'
      }
    });
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Terms & Conditions | Royal Transfer EU</title>
        <meta name="description" content="Terms and conditions for Royal Transfer EU premium airport transfer services. Read our terms of service before booking." />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 terms-content">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                Welcome to Royal Transfer EU. These Terms and Conditions govern your use of our 
                website and services. By accessing our website or using our transportation services, 
                you agree to be bound by these Terms and Conditions. Please read them carefully.
              </p>
              
              <p className="text-gray-600 mb-4">
                In these Terms and Conditions, "Royal Transfer EU", "we", "us" and "our" refers to 
                Royal Transfer EU and "you" and "your" refers to you, the client, visitor, website 
                user or person using our services.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Booking and Reservations</h2>
              <p className="text-gray-600 mb-4">
                2.1. All bookings made through our website, by telephone, or via email constitute acceptance 
                of these Terms and Conditions.
              </p>
              
              <p className="text-gray-600 mb-4">
                2.2. Upon completion of your booking, you will receive a confirmation email containing your 
                booking reference number. Please check that the details are correct and contact us immediately 
                if any adjustments are needed.
              </p>
              
              <p className="text-gray-600 mb-4">
                2.3. For all bookings, the lead passenger is responsible for ensuring that all passenger 
                information is accurate and complete.
              </p>
              
              <p className="text-gray-600 mb-4">
                2.4. We reserve the right to refuse a booking without giving any reason.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Pricing and Payment</h2>
              <p className="text-gray-600 mb-4">
                3.1. All prices shown on our website are in Euros (€) and include applicable taxes unless 
                otherwise stated.
              </p>
              
              <p className="text-gray-600 mb-4">
                3.2. Payment for services can be made by credit/debit card at the time of booking through 
                our secure payment system, or in cash to the driver upon completion of service.
              </p>
              
              <p className="text-gray-600 mb-4">
                3.3. If paying by cash, payment must be made in Euros (€).
              </p>
              
              <p className="text-gray-600 mb-4">
                3.4. Additional charges may apply for specific services such as:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>Waiting time beyond the allocated free waiting time</li>
                <li>Additional stops not specified in the original booking</li>
                <li>Changes to the route requested during the journey</li>
                <li>Special equipment requests made at the time of service</li>
              </ul>
              
              <p className="text-gray-600 mb-4">
                3.5. Our prices are guaranteed at the time of booking. Any changes to the booking may 
                result in price adjustments.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Cancellations and Amendments</h2>
              <p className="text-gray-600 mb-4">
                4.1. Cancellations must be made in writing by email to support@royaltransfer.eu or 
                through our customer portal.
              </p>
              
              <p className="text-gray-600 mb-4">
                4.2. Our cancellation policy is as follows:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>Cancellations made more than 24 hours before the scheduled pickup time will receive a full refund.</li>
                <li>Cancellations made between 12-24 hours before the scheduled pickup time will incur a 50% charge.</li>
                <li>Cancellations made less than 12 hours before the scheduled pickup time or no-shows will incur a 100% charge.</li>
              </ul>
              
              <p className="text-gray-600 mb-4">
                4.3. Amendments to bookings can be made up to 4 hours before the scheduled pickup time, 
                subject to availability. Changes made less than 4 hours before the scheduled pickup time 
                cannot be guaranteed and may be treated as a cancellation and rebooking.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Airport Pickups and Delays</h2>
              <p className="text-gray-600 mb-4">
                5.1. For airport pickups, we monitor flight arrivals and adjust pickup times 
                in the event of flight delays at no extra cost.
              </p>
              
              <p className="text-gray-600 mb-4">
                5.2. We provide a free waiting time of:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>45 minutes after scheduled landing time for international flights</li>
                <li>30 minutes after scheduled landing time for domestic flights</li>
                <li>15 minutes for all other pickup locations</li>
              </ul>
              
              <p className="text-gray-600 mb-4">
                5.3. Additional waiting time beyond these periods will be charged at our standard hourly rates.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Service Standards and Limitations</h2>
              <p className="text-gray-600 mb-4">
                6.1. We are committed to providing high-quality transportation services with professional drivers 
                and well-maintained vehicles.
              </p>
              
              <p className="text-gray-600 mb-4">
                6.2. While we make every effort to ensure punctuality, we cannot accept liability for delays 
                caused by factors beyond our control such as traffic conditions, weather, or force majeure events.
              </p>
              
              <p className="text-gray-600 mb-4">
                6.3. The maximum number of passengers and luggage items per vehicle is limited by the vehicle type 
                and must be adhered to for safety and comfort reasons.
              </p>
              
              <p className="text-gray-600 mb-4">
                6.4. Royal Transfer EU reserves the right to refuse transportation to any person who is thought 
                to be under the influence of alcohol or drugs, or whose behavior is considered dangerous or offensive.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Liability</h2>
              <p className="text-gray-600 mb-4">
                7.1. Royal Transfer EU is insured for public liability and passenger liability as required by law.
              </p>
              
              <p className="text-gray-600 mb-4">
                7.2. We accept no liability for any loss, damage, or inconvenience caused as a result of a booking 
                not being honored due to circumstances beyond our control.
              </p>
              
              <p className="text-gray-600 mb-4">
                7.3. Royal Transfer EU is not liable for any indirect or consequential losses, including but not limited 
                to missed flights or connections, loss of earnings, or business opportunities.
              </p>
              
              <p className="text-gray-600 mb-4">
                7.4. Our maximum liability to you for any loss or damage arising from a booking shall be limited 
                to the total value of that booking.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Personal Belongings</h2>
              <p className="text-gray-600 mb-4">
                8.1. Passengers are responsible for their personal belongings. Royal Transfer EU and its drivers 
                will not be held responsible for any items left in the vehicle after the completion of the service.
              </p>
              
              <p className="text-gray-600 mb-4">
                8.2. If items are found, we will make reasonable efforts to return them to their owners, 
                but cannot guarantee their recovery or condition.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Data Protection and Privacy</h2>
              <p className="text-gray-600 mb-4">
                9.1. Royal Transfer EU is committed to protecting your privacy. Our Privacy Policy, which is 
                available on our website, explains how we collect, use, and protect your personal information.
              </p>
              
              <p className="text-gray-600 mb-4">
                9.2. By making a booking with us, you consent to the collection, processing, and transfer of 
                your personal information as set out in our Privacy Policy.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                10.1. All content on the Royal Transfer EU website, including but not limited to text, graphics, 
                logos, images, and software, is the property of Royal Transfer EU or its content suppliers and 
                is protected by international copyright laws.
              </p>
              
              <p className="text-gray-600 mb-4">
                10.2. You may not reproduce, distribute, or use any content from our website without our 
                express written permission.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                11.1. These Terms and Conditions shall be governed by and construed in accordance with the 
                laws of Italy.
              </p>
              
              <p className="text-gray-600 mb-4">
                11.2. Any disputes arising under these Terms and Conditions shall be subject to the exclusive 
                jurisdiction of the courts of Italy.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Modifications to Terms</h2>
              <p className="text-gray-600 mb-4">
                12.1. Royal Transfer EU reserves the right to modify these Terms and Conditions at any time. 
                Any changes will be posted on our website and will be effective immediately upon posting.
              </p>
              
              <p className="text-gray-600 mb-4">
                12.2. It is your responsibility to review these Terms and Conditions periodically for changes. 
                Your continued use of our services following the posting of changes constitutes your acceptance 
                of those changes.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                13.1. If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              
              <div className="text-gray-600">
                <p>Royal Transfer EU</p>
                <p>Email: <a href="mailto:legal@royaltransfer.eu" className="text-blue-600 hover:underline">legal@royaltransfer.eu</a></p>
                <p>Phone: +39 351 748 22 44</p>
                <p>Last Updated: June 15, 2025</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default Terms;