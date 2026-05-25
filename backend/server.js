require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import all of your route files
const customerRoutes = require('./routes/customerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const userRoutes = require('./routes/userRoutes'); 
const stripeRoutes = require('./routes/stripeRoutes');
const quoteRoutes = require('./routes/quoteRoutes'); // 🔥 Added Quotes route

const app = express();

// --- MIDDLEWARE ---
// Allows your React frontend to talk to your Node backend
app.use(cors());

// Increased the payload limit to 10MB to allow for Base64 Logo uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// --- ROUTES ---
// This tells the server where to send incoming requests
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/stripe', stripeRoutes);
app.use('/api/quotes', quoteRoutes); // 🔥 Registered the Quotes route


// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is successfully running on port ${PORT}`);
});