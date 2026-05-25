const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 We must bring Stripe into the User Routes to sync the settings
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

// 🔥 NEW: Helper function to generate the unique 'RF-XXXXXX' Firm Code
const generateFlowCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'RF-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// GET user profile
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    let user = await prisma.user.findUnique({ where: { email } });

    // 🔥 FIX: If the user doesn't exist yet, create them with an RF code automatically!
    if (!user) {
      user = await prisma.user.create({
        data: { 
          email: email, 
          flowCode: generateFlowCode() 
        }
      });
    } 
    // 🔥 SMART BACKFILL: If the user exists but doesn't have a firm code, generate one!
    else if (!user.flowCode) {
      user = await prisma.user.update({
        where: { email },
        data: { flowCode: generateFlowCode() }
      });
    }

    res.json(user || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching user" });
  }
});

// PUT to update user profile
router.put('/', async (req, res) => {
  try {
    const { 
      email, 
      businessName, 
      businessAddress, 
      businessPhone, 
      businessWebsite, 
      firstName, 
      lastName,
      businessLogo // 🔥 Includes the logo data
    } = req.body;
    
    // 🔥 FIX: Using UPSERT to ensure the account is created with an RF code if they just hit save
    const updatedUser = await prisma.user.upsert({
      where: { email },
      update: { 
        businessName, 
        businessAddress, 
        businessPhone, 
        businessWebsite, 
        firstName, 
        lastName,
        businessLogo // 🔥 Saves the logo to the database
      },
      create: {
        email, 
        businessName, 
        businessAddress, 
        businessPhone, 
        businessWebsite, 
        firstName, 
        lastName,
        businessLogo,
        flowCode: generateFlowCode()
      }
    });

    // 🔥 THE FIX: Force Stripe to sync with the new RiskaFlow Business Name
    if (updatedUser.stripeAccountId) {
      try {
        const stripeName = updatedUser.businessName || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 'Business User';
        await stripe.accounts.update(updatedUser.stripeAccountId, {
          business_profile: {
            name: stripeName
          }
        });
      } catch (stripeErr) {
        console.error("Failed to sync updated name to Stripe:", stripeErr);
      }
    }
    
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user" });
  }
});

// 🔥 SUPER ADMIN: Use an RF Code to access a client's account
router.post('/impersonate', async (req, res) => {
  try {
    const { adminEmail, flowCode } = req.body;

    // 🛡️ SECURITY LOCK: Only YOU can use this feature
    if (adminEmail !== 'amarildiriska2@gmail.com') {
      return res.status(403).json({ error: "Unauthorized. Super Admin access only." });
    }

    // Clean the input in case you accidentally pasted a space
    const cleanCode = flowCode.trim().toUpperCase();

    const targetUser = await prisma.user.findUnique({ where: { flowCode: cleanCode } });
    
    if (!targetUser) {
      return res.status(404).json({ error: "RF Code not found in the database." });
    }

    res.json({
      email: targetUser.email,
      businessName: targetUser.businessName || `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || 'Unnamed Business'
    });
  } catch (error) {
    console.error("Impersonation Error:", error);
    res.status(500).json({ error: "Server error during account lookup." });
  }
});

module.exports = router;