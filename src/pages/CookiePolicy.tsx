import React from 'react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">What Are Cookies</h2>
              <p className="text-gray-600 mb-4">
                Cookies are small text files that are placed on your computer or mobile device by websites that you visit. 
                They are widely used to make websites work more efficiently and provide information to the owners of the site. 
                Cookies help us improve your website experience in several ways, including remembering your preferences, 
                analyzing how our website is used, and personalizing your experience.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
              <p className="text-gray-600 mb-4">
                Royal Transfer EU uses cookies for various purposes, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2">
                <li>Ensuring the website functions correctly</li>
                <li>Understanding how you use our website to improve your experience</li>
                <li>Remembering your preferences and settings</li>
                <li>Measuring the effectiveness of our marketing campaigns</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Types of Cookies We Use</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium mb-2">Necessary Cookies</h3>
                  <p className="text-gray-600">
                    These cookies are essential for the operation of our website and cannot be turned off in our systems.
                    They are usually only set in response to actions you make, such as setting your privacy preferences,
                    logging in, or filling in forms. You can set your browser to block these cookies, but some parts of
                    the website may not work as expected.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Analytics Cookies</h3>
                  <p className="text-gray-600">
                    These cookies allow us to count visits and traffic sources, so we can measure and improve the performance
                    of our website. They help us understand which pages are the most and least popular, and see how visitors
                    move around the site. If you disable these cookies, we won't know when you've visited our site.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Marketing Cookies</h3>
                  <p className="text-gray-600">
                    These cookies may be set through our site by our advertising partners. They may be used by those companies
                    to build a profile of your interests and show you relevant ads on other sites. They don't directly store
                    personal information but are based on uniquely identifying your browser and device.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Preference Cookies</h3>
                  <p className="text-gray-600">
                    These cookies enable the website to remember your preferences, choices, and settings to provide enhanced,
                    personalized features. They may be set by us or by third-party providers whose services we've added to our pages.
                  </p>
                </div>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-gray-600 mb-4">
                You can manage your cookie preferences at any time by clicking on the "Cookie Settings" link in the footer of our website.
                Additionally, most web browsers allow you to control cookies through their settings. Please note that if you choose to
                block certain cookies, it may impact your experience on our website.
              </p>
              
              <p className="text-gray-600 mb-4">
                To find out more about cookies, including how to see what cookies have been set and how to manage and delete them,
                visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.allaboutcookies.org</a>.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes To This Cookie Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update our Cookie Policy from time to time to reflect changes in technology, regulation or our business practices.
                Any changes will be posted on this page, and if the changes are significant, we will provide a more prominent notice.
              </p>
              
              <p className="text-gray-600">
                This Cookie Policy was last updated on April 25, 2025.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default CookiePolicy;