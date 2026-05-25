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

module.exports = router;