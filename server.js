const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your frontend files
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// In-memory database (replace with real database in production)
const users = [];
const listings = [
  {
    id: 1,
    title: "1:a i Solna nära Mall of Scandinavia",
    rent: 9500,
    size: 28,
    city: "Solna",
    address: "Frösundaviks allé 5",
    description: "Möblerad etta med balkong. 5 min till pendeltåg.",
    photos: ["assets/placeholder-apt.jpg"],
    userId: 1,
    createdAt: new Date()
  },
  {
    id: 2,
    title: "2:a i Södermalm med utsikt",
    rent: 14500,
    size: 45,
    city: "Stockholm",
    address: "Hornsgatan 100",
    description: "Ljus lägenhet, nära T-bana.",
    photos: ["assets/placeholder-apt.jpg"],
    userId: 1,
    createdAt: new Date()
  },
  {
    id: 3,
    title: "Rum uthyres i studentkollektiv KTH",
    rent: 5200,
    size: 12,
    city: "Flemingsberg",
    address: "Campusvägen 3",
    description: "Perfekt för studenter, delat kök.",
    photos: ["assets/placeholder-apt.jpg"],
    userId: 1,
    createdAt: new Date()
  }
];

const quickRegistrations = [];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// AUTH ENDPOINTS

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: role || 'tenant',
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// LISTING ENDPOINTS

// Get all listings
app.get('/api/listings', (req, res) => {
  const { minRent, maxRent, minSize, maxSize, area, q } = req.query;
  
  let filteredListings = [...listings];
  
  // Apply filters
  if (minRent) {
    filteredListings = filteredListings.filter(l => l.rent >= parseInt(minRent));
  }
  if (maxRent) {
    filteredListings = filteredListings.filter(l => l.rent <= parseInt(maxRent));
  }
  if (minSize) {
    filteredListings = filteredListings.filter(l => l.size >= parseInt(minSize));
  }
  if (maxSize) {
    filteredListings = filteredListings.filter(l => l.size <= parseInt(maxSize));
  }
  if (area) {
    const searchTerm = area.toLowerCase();
    filteredListings = filteredListings.filter(l => 
      l.city.toLowerCase().includes(searchTerm) || 
      l.address.toLowerCase().includes(searchTerm)
    );
  }
  if (q) {
    const searchTerm = q.toLowerCase();
    filteredListings = filteredListings.filter(l => 
      l.title.toLowerCase().includes(searchTerm) ||
      l.city.toLowerCase().includes(searchTerm) || 
      l.address.toLowerCase().includes(searchTerm) ||
      l.description.toLowerCase().includes(searchTerm)
    );
  }
  
  res.json(filteredListings);
});

// Get specific listing
app.get('/api/listings/:id', (req, res) => {
  const listing = listings.find(l => l.id === parseInt(req.params.id));
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// Create new listing
app.post('/api/listings', authenticateToken, upload.array('photos', 10), (req, res) => {
  try {
    const { title, description, rent, size, city, address } = req.body;
    
    // Process uploaded photos
    const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const listing = {
      id: listings.length + 1,
      title,
      description,
      rent: parseInt(rent),
      size: parseInt(size),
      city,
      address,
      photos,
      userId: req.user.id,
      createdAt: new Date()
    };
    
    listings.push(listing);
    
    res.status(201).json({
      message: 'Listing created successfully',
      listing
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update listing
app.put('/api/listings/:id', authenticateToken, upload.array('photos', 10), (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const listingIndex = listings.findIndex(l => l.id === listingId);
    
    if (listingIndex === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listing = listings[listingIndex];
    
    // Check if user owns the listing
    if (listing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this listing' });
    }
    
    const { title, description, rent, size, city, address } = req.body;
    
    // Process uploaded photos
    const newPhotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    // Update listing
    listings[listingIndex] = {
      ...listing,
      title: title || listing.title,
      description: description || listing.description,
      rent: rent ? parseInt(rent) : listing.rent,
      size: size ? parseInt(size) : listing.size,
      city: city || listing.city,
      address: address || listing.address,
      photos: newPhotos.length > 0 ? newPhotos : listing.photos,
      updatedAt: new Date()
    };
    
    res.json({
      message: 'Listing updated successfully',
      listing: listings[listingIndex]
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete listing
app.delete('/api/listings/:id', authenticateToken, (req, res) => {
  const listingId = parseInt(req.params.id);
  const listingIndex = listings.findIndex(l => l.id === listingId);
  
  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  const listing = listings[listingIndex];
  
  // Check if user owns the listing
  if (listing.userId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this listing' });
  }
  
  listings.splice(listingIndex, 1);
  
  res.json({ message: 'Listing deleted successfully' });
});

// Get user's listings
app.get('/api/user/listings', authenticateToken, (req, res) => {
  const userListings = listings.filter(l => l.userId === req.user.id);
  res.json(userListings);
});

// QUICK REGISTRATION ENDPOINT

// Quick registration for landlords
app.post('/api/quick-register', (req, res) => {
  try {
    const { name, email, city, rent } = req.body;
    
    const registration = {
      id: quickRegistrations.length + 1,
      name,
      email,
      city,
      rent: rent ? parseInt(rent) : null,
      createdAt: new Date()
    };
    
    quickRegistrations.push(registration);
    
    res.status(201).json({
      message: 'Registration received successfully',
      registration
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get quick registrations (admin only)
app.get('/api/quick-registrations', authenticateToken, (req, res) => {
  // In a real app, you'd check for admin role
  res.json(quickRegistrations);
});

// CONTACT ENDPOINT

// Contact landlord
app.post('/api/contact/:listingId', authenticateToken, (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const listing = listings.find(l => l.id === listingId);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const { message } = req.body;
    
    // In a real app, you'd send an email or create a message record
    console.log(`Contact request for listing ${listingId} from user ${req.user.id}: ${message}`);
    
    res.json({ message: 'Contact request sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});

module.exports = app;