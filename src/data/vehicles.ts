export const vehicles = [
  {
    id: 'economy-sedan',
    name: 'Standard Sedan',
    image: 'https://files.royaltransfereu.com/assets/standard-sedan.jpg',
    rating: 4.9,
    reviews: 161,
    seats: 4,
    suitcases: 4,
    price: 999.79,
    description: 'Affordable sedan for a comfortable and cost-effective ride. Max 4 passengers and 4 luggage.',
    sampleVehicles: [
      'Volkswagen Passat',
      'Skoda Superb',
      'Toyota Camry'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/manager.png', title: 'Professional Driver', description: 'Suited & experienced chauffeur' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/route.png', title: 'Flight Tracking', description: 'No stress for delays' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/door.png', title: 'Door-to-Door', description: 'Hassle-free pickup & drop-off' }
    ]
  },
  {
    id: 'premium-sedan',
    name: 'Premium Sedan',
    image: 'https://files.royaltransfereu.com/assets/premium-sedan.jpg',
    rating: 4.8,
    reviews: 143,
    seats: 3,
    suitcases: 3,
    price: 1299.99,
    description: 'Luxury sedan for up to 3 passengers and 3 luggage.',
    sampleVehicles: [
      'Mercedes-Benz E-Class',
      'BMW 5 Series',
      'Audi A6'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/chauffeur.png', title: 'Premium Chauffeur', description: 'Executive service' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/water-bottle.png', title: 'Bottled Water', description: 'Free refreshments' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/priority.png', title: 'Priority Pickup', description: 'First-class experience' }
    ]
  },
  {
    id: 'vip-sedan',
    name: 'VIP Sedan',
    image: 'https://files.royaltransfereu.com/assets/VIP-Sedan.jpg',
    rating: 4.95,
    reviews: 101,
    seats: 2,
    suitcases: 2,
    price: 1599.99,
    description: 'VIP sedan—top privacy and comfort for 2 pax and 2 luggage.',
    sampleVehicles: [
      'Mercedes-Benz S-Class',
      'BMW 7 Series',
      'Audi A8'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/professional.png', title: 'VIP Experience', description: 'Elite chauffeur & service' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/privacy-policy.png', title: 'Privacy Glass', description: 'Discreet and secure' },
      { icon: 'https://files.royaltransfereu.com/assets/b-icons/agreement.png', title: 'Meet & Greet', description: 'Personal welcome at arrivals' }
    ]
  },
  {
    id: 'xl-minivan',
    name: 'XL Minivan',
    image: 'https://files.royaltransfereu.com/assets/XL-Minivan.jpg',
    rating: 4.9,
    reviews: 109,
    seats: 8,
    suitcases: 8,
    price: 1399.99,
    description: 'Extra-large minivan for up to 8 passengers and 8 luggage.',
    sampleVehicles: [
      'Ford Tourneo Custom',
      'Mercedes-Benz Vito',
      'Renault Trafic'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'XL Group Space', description: 'Fits up to 8' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Easy Access', description: 'Wide doors' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'XL Luggage', description: 'Ample boot space' }
    ]
  },
  {
    id: 'vip-minivan',
    name: 'VIP Minivan',
    image: 'https://files.royaltransfereu.com/assets/VIP-Minivan.jpg',
    rating: 4.97,
    reviews: 76,
    seats: 7,
    suitcases: 7,
    price: 1899.99,
    description: 'VIP minivan for luxury small group travel: 6 pax + 6 luggage.',
    sampleVehicles: [
      'Mercedes-Benz V-Class VIP',
      'VW Caravelle VIP',
      'Toyota Alphard'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Chauffeur VIP', description: 'Elite driver' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Exclusive Interior', description: 'Luxury inside' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Refreshments', description: 'Drinks & snacks' }
    ]
  },
  {
    id: 'sprinter-8',
    name: 'Sprinter 8 pax',
    image: 'https://files.royaltransfereu.com/assets/Sprinter-8.jpg',
    rating: 4.88,
    reviews: 64,
    seats: 8,
    suitcases: 16,
    price: 2199.99,
    description: 'Mercedes Sprinter for up to 8 passengers and 8 big + 8 small luggage.',
    sampleVehicles: [
      'Mercedes-Benz Sprinter 8-seater',
      'VW Crafter 8-seater'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Mega Storage', description: 'Big & small luggage' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Individual Seats', description: 'Comfortable for all' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'A/C', description: 'Fully climate-controlled' }
    ]
  },
  {
    id: 'sprinter-16',
    name: 'Sprinter up to 16 pax',
    image: 'https://files.royaltransfereu.com/assets/Sprinter-16.jpg',
    rating: 4.91,
    reviews: 38,
    seats: 16,
    suitcases: 32,
    price: 2799.99,
    description: 'Large Sprinter bus for up to 16 passengers, 16 big + 16 small luggage.',
    sampleVehicles: [
      'Mercedes-Benz Sprinter 16-seater',
      'Iveco Daily Minibus'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Large Capacity', description: 'Travel together' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Easy Entry', description: 'Steps for safe boarding' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Onboard PA', description: 'Guide/audio system' }
    ]
  },
  {
    id: 'sprinter-21',
    name: 'Sprinter up to 21 pax',
    image: 'https://files.royaltransfereu.com/assets/Sprinter-21.jpg',
    rating: 4.92,
    reviews: 22,
    seats: 21,
    suitcases: 42,
    price: 3199.99,
    description: 'Sprinter minibus for groups up to 21, fits 21 big + 21 small luggage.',
    sampleVehicles: [
      'Mercedes-Benz Sprinter 21-seater',
      'Iveco Daily 21-seater'
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'XXL Group', description: 'Perfect for tours/events' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Armor Luggage', description: 'Plenty of storage' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Reclining Seats', description: 'Long ride comfort' }
    ]
  },
  {
    id: 'bus-51',
    name: 'Bus up to 51 pax',
    image: 'https://files.royaltransfereu.com/assets/Bus-51.jpg',
    rating: 4.95,
    reviews: 12,
    seats: 51,
    suitcases: 102,
    price: 4999.99,
    description: 'Full-size touring coach: up to 51 passengers, 51 big + 51 small luggage.',
    sampleVehicles: [
      'Setra 515 HD',
      'Mercedes-Benz Tourismo',
      "MAN Lion's Coach"
    ],
    features: [
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Tour Group', description: 'Large parties or company trips' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'WC Onboard', description: 'Toilet facilities' },
      { icon: 'https://files.royaltransfereu.com/assets', title: 'Air Suspension', description: 'Smooth, safe ride' }
    ]
  }
];