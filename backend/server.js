require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendInvoiceReminder } = require('./utils/email');

// Import all of your route files
const customerRoutes = require('./routes/customerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const userRoutes = require('./routes/userRoutes'); 
const stripeRoutes = require('./routes/stripeRoutes');
const quoteRoutes = require('./routes/quoteRoutes'); // 🔥 Added Quotes route

const app = express();
const prisma = new PrismaClient();

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


// --- CRON JOBS ---
// Schedule to run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily invoice reminder check...');

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find unpaid invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'unpaid',
        dueDate: {
          lte: new Date(), // Due date is in the past
        },
        OR: [
          { lastReminderSentAt: null }, // Never sent a reminder
          { lastReminderSentAt: { lte: threeDaysAgo } } // Or last reminder was 3+ days ago
        ]
      },
      include: {
        customer: true, // Needed to get the customer's email
        user: true      // Needed to get the sender's details
      }
    });

    for (const invoice of overdueInvoices) {
      if (invoice.customer && invoice.customer.email) {
        // Send the email
        await sendInvoiceReminder(invoice, invoice.customer, invoice.user);

        // Update the database to reflect the reminder was sent
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { lastReminderSentAt: new Date() }
        });
      }
    }
  } catch (error) {
    console.error('Error running invoice cron job:', error);
  }
});


// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is successfully running on port ${PORT}`);
});