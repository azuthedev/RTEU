import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, Calendar, MapPin, Share2, ArrowRight, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import { updateMetaTags } from '../utils/seo';
import OptimizedImage from '../components/OptimizedImage';
import { useLanguage } from '../contexts/LanguageContext';

// Sample blog posts data - in a real app, this would come from an API or database
const blogPosts = {
  rome: {
    title: 'Rome Travel Guide: A Comprehensive Itinerary',
    featuredImage: 'https://files.royaltransfereu.com/assets/rome1280png.png',
    imageAlt: 'Historic view of the Roman Colosseum with blue sky',
    date: '2025-02-15',
    readTime: 8,
    author: 'Marco Bianchi',
    authorTitle: 'Travel Expert',
    authorImage: 'https://files.royaltransfereu.com/assets/author-marco.webp',
    excerpt: 'Discover the Eternal City with our expert Rome travel guide, featuring essential tips for transportation, major attractions, and hidden gems.',
    content: [
      "Rome, the Eternal City, is a living museum where ancient history and modern life coexist in perfect harmony. With its iconic landmarks, world-class cuisine, and vibrant atmosphere, Rome tops many travelers' bucket lists. In this comprehensive guide, we'll help you navigate this magnificent city with ease, focusing on transportation options and must-see attractions.",
      "## Getting Around Rome\n\nRome offers various transportation options for tourists. The public transport system includes buses, trams, and a metro network, which can be accessed using the Roma Pass. However, many of Rome's historic sites are within walking distance of each other in the city center.\n\nFor those staying outside the center or arriving at Fiumicino or Ciampino airports, our premium airport transfer service provides a comfortable, stress-free experience with English-speaking drivers familiar with Rome's complex street layout.",
      "## Must-Visit Attractions\n\n- **The Colosseum and Roman Forum**: These adjacent ancient sites offer a glimpse into the heart of the Roman Empire. Pre-book tickets to avoid long queues.\n- **Vatican City**: Home to St. Peter's Basilica, the Vatican Museums, and the Sistine Chapel. Consider an early morning visit to beat the crowds.\n- **Trevi Fountain**: Don't forget to toss a coin to ensure your return to Rome!\n- **Pantheon**: This remarkably preserved ancient temple features the world's largest unreinforced concrete dome.\n- **Spanish Steps**: A great spot for people-watching and soaking in the Roman atmosphere.",
      "## Hidden Gems\n\nWhile the major attractions are unmissable, Rome's true charm lies in its lesser-known spots:\n\n- **Aventine Hill**: Visit the Knights of Malta Keyhole for a perfect view of St. Peter's Basilica.\n- **Quartiere Coppedè**: A small district with unique fairy tale-like architecture.\n- **Centrale Montemartini**: An unusual museum where ancient Roman statues are displayed against industrial machinery.\n- **Palazzo Doria Pamphilj**: A stunning private art collection housed in a magnificent palace.",
      "## Dining Tips\n\nTo eat like a local, avoid restaurants with tourist menus and look for places filled with Italians. Some neighborhoods known for authentic cuisine include Testaccio, Trastevere, and Monti. Don't miss trying Roman specialties like cacio e pepe, carbonara, supplì, and authentic Roman pizza.",
      "## Best Time to Visit\n\nSpring (April-May) and fall (September-October) offer ideal weather and fewer tourists. Summer can be extremely hot and crowded, while winter provides a more authentic experience with minimal lines but cooler, sometimes rainy weather.",
      "## Transportation Between Sites\n\nWhile Rome's historic center is walkable, efficient transportation becomes essential when exploring wider areas or managing time constraints. Our private transfer service offers customized routes between major attractions, allowing you to maximize your sightseeing time without navigating public transport or struggling with language barriers.",
      "With this guide, you're ready to experience the best of Rome. Whether you're visiting for a few days or a week, the Eternal City's blend of history, culture, and cuisine promises an unforgettable Italian adventure."
    ]
  },
  venice: {
    title: 'Venice: Navigating the Floating City',
    featuredImage: 'https://files.royaltransfereu.com/assets/paris1280png.png',
    imageAlt: 'Grand Canal in Venice with gondolas and historic buildings',
    date: '2025-01-18',
    readTime: 6,
    author: 'Sofia Rossi',
    authorTitle: 'Local Guide',
    authorImage: 'https://files.royaltransfereu.com/assets/author-sophia.webp',
    excerpt: 'Plan your perfect Venice getaway with insider tips on gondola rides, water taxis, and the most efficient ways to explore the canals.',
    content: [
      "Venice, with its labyrinthine canals, historic architecture, and car-free environment, offers a unique travel experience unlike any other city. Navigating this floating wonderland requires special consideration, and this guide will help you make the most of your Venetian adventure.",
      "## Arriving in Venice\n\nMost visitors arrive at either Venice Marco Polo Airport or Treviso Airport. From Marco Polo, you have several options to reach the city:\n\n- **Water Taxi**: The most stylish (though expensive) option, taking you directly to your hotel if it's accessible by water.\n- **Alilaguna Water Bus**: A more affordable public water transport option.\n- **Bus to Piazzale Roma**: Followed by vaporetto (water bus) or walking to your accommodation.\n- **Private Transfer**: Our service provides comfortable transportation to Piazzale Roma, the gateway to Venice's car-free historic center.",
      "## Getting Around Venice\n\n### Vaporetto (Water Bus)\nThe public water buses are Venice's equivalent of a metro system. Line 1 travels the length of the Grand Canal and is perfect for sightseeing. Consider purchasing a multi-day pass if you plan to use them frequently.",
      "### Gondolas\nWhile iconic, gondolas are primarily a tourist experience rather than practical transportation. A standard 30-minute ride costs about €80-100, with higher rates in the evening. Shared gondola rides are available at some stations for a more affordable experience.",
      "### Walking\nVenice is a pedestrian's dream and walking is often the fastest way to get around. Be prepared for many bridges with steps and narrow streets that can be crowded during peak season. A good map or navigation app is essential, as getting pleasantly lost is part of the Venetian experience.",
      "## Must-Visit Attractions\n\n- **St. Mark's Square and Basilica**: The heart of Venice and home to the stunning Byzantine basilica.\n- **Doge's Palace**: The former seat of Venetian power with opulent rooms and the famous Bridge of Sighs.\n- **Rialto Bridge and Market**: The oldest bridge spanning the Grand Canal, surrounded by a lively market area.\n- **The Grand Canal**: Best experienced by vaporetto or a splurge on a private water taxi.\n- **Murano and Burano Islands**: Famous for glass-blowing and colorful houses, respectively.",
      "## Venice Transport Tips\n\n- **Travel Light**: Remember that you'll likely need to carry your luggage over multiple bridges.\n- **Venice Card**: Consider purchasing this official city pass for public transport and attraction discounts.\n- **Avoid Rush Hours**: Vaporetti can get extremely crowded between 8-10am and 4-6pm.\n- **Water Taxi Sharing**: If traveling in a group, a private water taxi becomes more cost-effective and offers door-to-door service.\n- **Comfortable Shoes**: With all the walking and bridge-climbing, proper footwear is essential.",
      "## Day Trips from Venice\n\nWhile Venice itself deserves several days of exploration, the surrounding region offers excellent day trip opportunities:\n\n- **Verona**: The city of Romeo and Juliet is just an hour away by train.\n- **Padua**: Home to Giotto's frescoes and one of the world's oldest universities.\n- **Treviso**: A charming, less touristy alternative with its own network of canals.\n- **The Dolomites**: For those seeking natural beauty, the mountain range is accessible for day trips from Venice.",
      "## Private Transfer Services\n\nFor seamless transportation to and from Venice, our private transfer service provides comfortable, reliable transport with professional drivers familiar with the region. While we cannot take you directly into the car-free historic center, we ensure smooth transfers to the appropriate points where you can continue your journey by water transport.",
      "Venice's unique landscape creates distinctive transportation challenges, but with proper planning, navigating the floating city becomes part of the adventure itself. Embrace the slower pace, expect to get lost occasionally, and enjoy the unparalleled beauty of this extraordinary destination."
    ]
  },
  florence: {
    title: 'Florence: Renaissance Art and Modern Travel',
    featuredImage: 'https://files.royaltransfereu.com/assets/barca1280png.png',
    imageAlt: 'View of Florence with the Duomo cathedral dominating the skyline',
    date: '2024-12-10',
    readTime: 7,
    author: 'Elena Ferretti',
    authorTitle: 'Art Historian & Guide',
    authorImage: 'https://files.royaltransfereu.com/assets/author-elena.webp',
    excerpt: 'From the Uffizi Gallery to Ponte Vecchio, navigate Florence\'s artistic wonders while enjoying seamless transportation options.',
    content: [
      "Florence, the cradle of the Renaissance, offers an unparalleled concentration of art, architecture, and cultural heritage. As you plan your visit to this magnificent city, understanding your transportation options will help you maximize your time among Florence's artistic treasures.",
      "## Getting to Florence\n\nFlorence is served by the small Amerigo Vespucci Airport (FLR), though many international travelers arrive via Pisa International Airport (PSA) or Bologna Airport (BLQ).\n\n- **From Pisa Airport**: The Pisa Mover shuttle + train takes about 1 hour to Florence.\n- **From Bologna Airport**: Direct shuttle buses or taxis + train connections are available.\n- **Private Transfer**: For the most comfortable experience, our door-to-door service from any airport ensures a stress-free start to your Florentine adventure.",
      "## Navigating Florence\n\nUnlike Rome or Milan, Florence's historic center is compact and best explored on foot. Most major attractions are within a 20-minute walk of each other. However, there are several transportation options available:",
      "### Public Transportation\nFlorence has an extensive bus network operated by ATAF. Single tickets cost €1.50 and are valid for 90 minutes. The convenient C1 electric bus loops around the historic center every 10 minutes.\n\n*Note: There is no metro system in Florence.*",
      "### Taxis\nTaxis cannot be hailed on the street in Florence; they must be called by phone or found at designated taxi stands. Major stands are located at the train station, Piazza della Repubblica, and near major attractions.",
      "### Bicycles\nFlorence is increasingly bicycle-friendly, with rental options available throughout the city. Electric bikes are particularly helpful for dealing with some of the steeper streets.",
      "## Must-See Renaissance Masterpieces\n\n- **Uffizi Gallery**: Home to works by Botticelli, Leonardo, Michelangelo, and countless other masters. Book tickets well in advance.\n- **Accademia Gallery**: Where Michelangelo's David stands in all its glory, alongside his unfinished Prisoners sculptures.\n- **Duomo Complex**: Brunelleschi's innovative dome, Giotto's Bell Tower, and the ancient Baptistery with Ghiberti's Gates of Paradise.\n- **Palazzo Pitti and Boboli Gardens**: The former Medici residence housing several museums and connected to magnificent Renaissance gardens.",
      "## Hidden Artistic Gems\n\n- **Brancacci Chapel**: Masaccio's revolutionary frescoes that helped define Renaissance painting.\n- **San Marco Museum**: Fra Angelico's serene frescoes decorating the monk cells.\n- **Bargello Museum**: Italy's premier sculpture museum with works by Donatello and Michelangelo.\n- **Palazzo Medici Riccardi**: See Benozzo Gozzoli's dazzling Journey of the Magi in the family chapel.",
      "## Day Trips from Florence\n\nFlorence serves as an ideal base for exploring Tuscany:\n\n- **Siena**: Medieval brick buildings and the stunning fan-shaped Piazza del Campo.\n- **San Gimignano**: Famous for its preserved medieval towers.\n- **Chianti Wine Region**: Rolling hills covered with vineyards and olive groves.\n- **Pisa**: More than just the Leaning Tower, Pisa offers a complex of white marble Romanesque buildings.",
      "## Transportation Tips\n\n- **ZTL Zones**: Florence's center is a Limited Traffic Zone (ZTL). Unauthorized vehicles receive heavy fines, so avoid driving in the historic center.\n- **Comfortable Footwear**: Florence's streets are often uneven cobblestone, so proper walking shoes are essential.\n- **Early Morning Exploration**: Beat the crowds by starting your day early, especially when visiting popular museums.\n- **Private Guided Tours**: Consider booking a private guide with transportation for day trips to fully appreciate Tuscany's artistic and culinary heritage.",
      "## Our Transfer Services\n\nFor seamless transportation to and from Florence, or for day trips throughout Tuscany, our professional drivers provide comfortable, reliable service in well-maintained vehicles. Our Florence specialists can also arrange custom art-focused itineraries combining transportation with skip-the-line access to major attractions.",
      "Florence's artistic heritage represents the pinnacle of human creative achievement. By planning your transportation efficiently, you'll have more time to stand in awe before the masterpieces that changed the course of Western civilization. Whether retracing the footsteps of Michelangelo or exploring the Tuscan countryside, Florence promises an unforgettable journey through art, history, and beauty."
    ]
  },
  milan: {
    title: 'Milan: Fashion, Business, and Efficient Transit',
    featuredImage: 'https://files.royaltransfereu.com/assets/milano1280png.png',
    imageAlt: 'Milan Cathedral (Duomo di Milano) and piazza with people',
    date: '2024-11-22',
    readTime: 5,
    author: 'Alessandro Conti',
    authorTitle: 'Urban Explorer',
    authorImage: 'https://files.royaltransfereu.com/assets/author-alessandro.webp',
    excerpt: 'Explore Italy`s business capital with our comprehensive guide to Milan`s transportation network, fashion districts, and cultural landmarks.',
    content: [
      "Milan stands apart from other Italian cities with its forward-looking attitude, sleek modern architecture, and status as Italy's financial and fashion powerhouse. While it might lack the ancient ruins of Rome or the canals of Venice, Milan offers a sophisticated urban experience with exceptional transportation infrastructure that makes exploring the city effortless.",
      "## Arriving in Milan\n\nMilan is served by three airports:\n\n- **Malpensa Airport (MXP)**: Milan's main international hub, located about 50km northwest of the city.\n- **Linate Airport (LIN)**: A smaller airport just 7km from the center, handling mostly domestic and short-haul European flights.\n- **Orio al Serio Airport (BGY)**: Often called Milan Bergamo, this airport serves budget airlines and is located near Bergamo, about 50km northeast of Milan.",
      "### Airport Transfers\n\nFrom Malpensa, options include:\n- **Malpensa Express Train**: Runs every 15-30 minutes to Milano Centrale or Cadorna stations (50 minutes, €13).\n- **Airport Buses**: Several companies offer direct service to Milano Centrale (50-60 minutes, €8-10).\n- **Private Transfer**: Our door-to-door service provides comfortable, hassle-free transportation directly to your accommodation.",
      "From Linate:\n- **Bus Line 73**: Connects to San Babila metro station.\n- **Airport Buses**: Direct service to Milano Centrale.\n- **Private Transfer**: Especially convenient given Linate's proximity to the city.",
      "From Orio al Serio:\n- **Terravision and Orioshuttle**: Bus services to Milano Centrale (50-60 minutes).\n- **Private Transfer**: The most comfortable option after a budget airline flight.",
      "## Milan's Public Transportation System\n\nMilan boasts one of Italy's most efficient public transport networks, operated by ATM:\n\n- **Metro**: Four lines covering most tourist areas, identified by different colors (M1/red, M2/green, M3/yellow, M5/purple). The newer M5 is driverless and fully automated.\n- **Trams**: A charming mix of historic and modern tram cars, with 18 lines throughout the city.\n- **Buses**: Extensive network complementing the rail systems.\n- **Bikesharing**: BikeMi stations across the city offer traditional and electric bikes.",
      "A single urban ticket (€2) is valid for 90 minutes across all modes of transport. Various passes are available, including 24-hour (€7) and 3-day (€13) options. The Milano Card combines transport with museum discounts.",
      "## Fashion Districts & Shopping Areas\n\n- **Quadrilatero della Moda**: Milan's famous fashion quadrilateral, home to flagship stores of international luxury brands like Prada, Gucci, and Versace.\n- **Galleria Vittorio Emanuele II**: This stunning 19th-century shopping arcade connects Piazza del Duomo with La Scala. While housing high-end shops, it's worth visiting for the architecture alone.\n- **Corso Buenos Aires**: One of Europe's longest shopping streets, with more affordable mainstream brands.\n- **Brera District**: Boutique shops selling unique designs, antiques, and artisanal products in a charming setting.",
      "## Must-Visit Cultural Landmarks\n\n- **Duomo di Milano**: The city's magnificent Gothic cathedral took nearly six centuries to complete. Don't miss the rooftop terraces for spectacular views.\n- **Castello Sforzesco**: Renaissance castle housing several museums and Michelangelo's unfinished Pietà Rondanini.\n- **Teatro alla Scala**: One of the world's most famous opera houses; try for last-minute tickets or take a guided tour.\n- **Santa Maria delle Grazie**: Home to Leonardo da Vinci's Last Supper (advance booking essential).\n- **Pinacoteca di Brera**: Milan's main public gallery with works by Raphael, Caravaggio, and other Italian masters.",
      "## Business Travel Tips\n\n- **Navigli District**: Perfect for aperitivo (pre-dinner drinks with complimentary buffet) after business meetings.\n- **Porta Nuova**: Milan's modern business district featuring impressive contemporary architecture including the vertical forest (Bosco Verticale).\n- **Connectivity**: Milan offers excellent WiFi and 4G/5G coverage throughout the city.\n- **Executive Transfer Services**: For business travelers, our premium transfer service includes Mercedes vehicles with professional drivers, WiFi, and the possibility to work en route.",
      "## Day Trips from Milan\n\n- **Lake Como**: Just an hour away by train, offering stunning lake views and elegant villas.\n- **Turin**: Italy's first capital and home to the Egyptian Museum, royal palaces, and chocolate traditions.\n- **Bergamo**: A beautiful city with a well-preserved medieval upper town (Città Alta).\n- **Lake Maggiore**: Famous for the Borromean Islands with their palaces and gardens.",
      "Milan may not immediately charm visitors with obvious beauty like other Italian cities, but its sophisticated energy, exceptional food scene, world-class shopping, and easy navigation make it an essential stop on any Italian itinerary. Whether visiting for business or pleasure, Milan's efficient infrastructure ensures you can maximize your time in Italy's most forward-looking city."
    ]
  }
};

const BlogPost = () => {
  const { city } = useParams<{ city: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      if (city && blogPosts[city as keyof typeof blogPosts]) {
        setPost(blogPosts[city as keyof typeof blogPosts]);
      } else {
        // Redirect to blogs page if post not found
        navigate('/blogs');
      }
      setLoading(false);
    }, 500);
  }, [city, navigate]);

  // Update SEO metadata when post is loaded
  useEffect(() => {
    if (post) {
      updateMetaTags(
        `${post.title} | Royal Transfer EU Blog`,
        post.excerpt,
        `/blogs/${city}`,
        post.featuredImage
      );
    }
  }, [post, city]);

  // Function to render markdown-like content
  const renderContent = (content: string) => {
    // Very basic markdown parsing for headers and paragraphs
    const withHeaders = content.replace(/## (.*?)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
    const withParagraphs = withHeaders.split("\n\n").map((paragraph, index) => {
      // Check if this paragraph is already a header
      if (paragraph.startsWith('<h3')) {
        return paragraph;
      }
      // Check if this is a list
      if (paragraph.includes("\n- ")) {
        const listItems = paragraph.split("\n- ");
        const listTitle = listItems.shift(); // Remove the text before the list
        return `${listTitle ? `<p class="mb-2">${listTitle}</p>` : ''}<ul class="list-disc pl-6 mb-4 space-y-1">
          ${listItems.map(item => `<li>${item}</li>`).join('')}
        </ul>`;
      }
      // Regular paragraph
      return `<p class="mb-4">${paragraph}</p>`;
    }).join('');

    return <div dangerouslySetInnerHTML={{ __html: withParagraphs }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-32 pb-16 max-w-4xl mx-auto px-4">
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return null; // This will redirect to blogs page as handled in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{post.title} | {t('seo.titleSuffix', 'Royal Transfer EU Blog')}</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:image" content={post.featuredImage} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
      </Helmet>
      
      <Header />
      
      <main className="pt-32 pb-16">
        {/* Back Link */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <Link 
            to="/blogs" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>{t('blog.backToBlogs', 'Back to all articles')}</span>
          </Link>
        </div>
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-white rounded-xl overflow-hidden shadow-md">
            <div className="relative h-64 md:h-96">
              <OptimizedImage
                src={post.featuredImage}
                alt={post.imageAlt}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-6 md:p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{post.readTime} {t('blog.minuteRead', 'min read')}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{city?.charAt(0).toUpperCase() + city?.slice(1)}, {t('blog.country', 'Italy')}</span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-6 font-serif">{post.title}</h1>
                
                <div className="flex items-center mb-6">
                  {post.authorImage ? (
                    <img 
                      src={post.authorImage} 
                      alt={post.author} 
                      className="w-12 h-12 rounded-full mr-4"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold">{post.author.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{post.author}</p>
                    <p className="text-sm text-gray-600">{post.authorTitle}</p>
                  </div>
                  
                  <button className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="prose prose-blue max-w-none">
                  {post.content.map((paragraph: string, index: number) => (
                    <div key={index}>{renderContent(paragraph)}</div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Related Articles Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <h2 className="text-2xl font-bold mb-6 font-serif">
            {t('blog.relatedArticles', 'Related Articles')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(blogPosts)
              .filter(relatedPost => relatedPost.title !== post.title)
              .slice(0, 3)
              .map((relatedPost: any, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link to={`/blogs/${Object.keys(blogPosts).find(key => blogPosts[key as keyof typeof blogPosts].title === relatedPost.title)}`} className="block">
                    <div className="relative h-48">
                      <OptimizedImage
                        src={relatedPost.featuredImage}
                        alt={relatedPost.imageAlt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2 line-clamp-2">{relatedPost.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{relatedPost.excerpt}</p>
                      <span className="text-blue-600 text-sm font-medium flex items-center hover:text-blue-800 transition-colors">
                        {t('blog.readMore', 'Read More')}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="bg-blue-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4 font-serif">
              {t('blog.ctaTitle', 'Ready to Explore Italy?')}
            </h2>
            <p className="max-w-3xl mx-auto mb-6">
              {t('blog.ctaText', 'Book your premium airport transfer and enjoy a comfortable, stress-free start to your Italian adventure.')}
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              {t('blog.ctaButton', 'Book Your Transfer')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogPost;
