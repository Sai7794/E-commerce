const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = async () => {
  const conn = await require('./config/db')();
};
const User = require('./models/User');
const Product = require('./models/Product');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection & Auto-Seeding
const startServer = async () => {
  try {
    const mongoose = require('mongoose');
    const connectDB = require('./config/db');
    await connectDB();

    // Auto-seed admin user and products if empty
    await seedDatabase();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error(`Startup failed: ${err.message}`);
  }
};

const seedDatabase = async () => {
  try {
    // 1. Seed Admin User
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // Find if email admin@store.com is taken
      adminUser = await User.findOne({ email: 'admin@store.com' });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'System Administrator',
          email: 'admin@store.com',
          password: 'admin123', // Will be hashed by userSchema pre-save hook
          role: 'admin',
        });
        console.log('Seeded default admin user: admin@store.com / admin123');
      }
    }

    // 2. Seed Default Products if none exist
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const sampleProducts = [
        {
          user: adminUser._id,
          name: 'Quantum Sound Wireless Headphones',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          description: 'Experience ultra-pure acoustic resolution with active hybrid noise cancellation, 40-hour playtime, and customized spatial audio tuning.',
          brand: 'Acoustix',
          category: 'Electronics',
          price: 189.99,
          countInStock: 25,
        },
        {
          user: adminUser._id,
          name: 'Apex Pro Mechanical Keyboard',
          image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
          description: 'Responsive optical switches with customizable actuation, individual RGB lighting profiles, and a robust aircraft-grade aluminum top plate.',
          brand: 'ApexGear',
          category: 'Electronics',
          price: 149.95,
          countInStock: 12,
        },
        {
          user: adminUser._id,
          name: 'Chronos Smartwatch Series X',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          description: 'Track biometrics, manage notifications, and organize your schedules with a beautiful always-on AMOLED touchscreen and 7-day battery.',
          brand: 'Chronos',
          category: 'Wearables',
          price: 249.00,
          countInStock: 8,
        },
        {
          user: adminUser._id,
          name: 'Lumina Minimalist Desk Lamp',
          image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
          description: 'Stepless dimming, warmth control, and integrated wireless fast-charger base in a gorgeous modern architectural profile.',
          brand: 'Lumina',
          category: 'Home & Decor',
          price: 79.99,
          countInStock: 15,
        },
        {
          user: adminUser._id,
          name: 'Titan Carbon Fiber Backpack',
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
          description: 'Waterproof design featuring impact-resistant panels, TSA-friendly lay-flat compartment, and dedicated power bank routing.',
          brand: 'Titan',
          category: 'Accessories',
          price: 119.50,
          countInStock: 20,
        },
        {
          user: adminUser._id,
          name: 'Vortex Portable Power Bank',
          image: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=800&auto=format&fit=crop&q=80',
          description: 'Ultra-compact 20,000mAh external charger supporting 65W Power Delivery to charge your laptop, phone, and accessories simultaneously.',
          brand: 'Vortex',
          category: 'Accessories',
          price: 59.99,
          countInStock: 50,
        }
      ];

      await Product.insertMany(sampleProducts);
      console.log('Seeded default product database catalog.');
    }
  } catch (error) {
    console.error(`Database seeding failed: ${error.message}`);
  }
};

// API Endpoint Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Fallback HTML router for frontend client routing
app.get('*', (req, res, next) => {
  // If request is looking for API routes, let standard 404 handler proceed
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Custom 404 API handling
app.use((req, res, next) => {
  res.status(404).json({ message: `API Route Not Found - ${req.originalUrl}` });
});

// Start application
startServer();
