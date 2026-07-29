const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 Live Key Active
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

// Generate a Stripe Connect Onboarding Link
router.post('/onboard', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let accountId = user.stripeAccountId;

    // 1. Create a blank account if they don't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: user.email,
        business_profile: { name: user.businessName || 'Business User' }
      });
      accountId = account.id;
      
      await prisma.user.update({
        where: { email },
        data: { stripeAccountId: accountId }
      });
    }

    // 2. Generate the secure onboarding URL
    const accountLink = await stripe.accountLinks.create({
      account: accountId, // 🔥 FIXED: This is now correctly using 'accountId'
      refresh_url: 'https://www.riskasfinance.com',
      return_url: 'https://www.riskasfinance.com',
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    // Check your Terminal when this fails - it will tell you the EXACT Stripe error
    console.error("STRIPE ONBOARDING ERROR:", error);
    res.status(500).json({ error: "Failed to connect to Stripe." });
  }
});

// 🔥 NEW: Generate a Checkout Session for an Invoice (Supports Partial Payments)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { invoiceId, customAmount } = req.body; // Accept customAmount from the frontend

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // 🔥 Use the custom deposit/partial amount if provided; otherwise default to the remaining balance
    const remainingBalance = invoice.totalAmount - (invoice.amountPaid || 0);
    const paymentAmount = customAmount ? parseFloat(customAmount) : remainingBalance;

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: "Invoice is already fully paid." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Payment for Invoice ${invoice.invoiceNumber}`,
          },
          unit_amount: Math.round(paymentAmount * 100), // Stripe expects cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://clearpay.riskasfinance.com?paid_invoice_id=${invoice.id}&amount_paid=${paymentAmount}`, // Pass payment info back
      cancel_url: `https://clearpay.riskasfinance.com`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("STRIPE SESSION ERROR:", error);
    res.status(500).json({ error: "Failed to initialize Stripe checkout" });
  }
});

module.exports = router;