require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import all of your route files
const customerRoutes = require('./routes/customerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const userRoutes = require('./routes/userRoutes'); // 🔥 Your new Settings route!
const stripeRoutes = require('./routes/stripeRoutes');

const app = express();

// --- MIDDLEWARE ---
// Allows your React frontend (port 3000) to talk to your Node backend (port 5000)
app.use(cors());

// 🔥 UPDATED: Increased the payload limit to 10MB to allow for Base64 Logo uploads!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// --- ROUTES ---
// This tells the server where to send incoming requests
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/stripe', stripeRoutes);


// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is successfully running on port ${PORT}`);
});