const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const OAuthClient = require('intuit-oauth');

// Configure the Intuit OAuth Client using your developer keys
const qbClient = new OAuthClient({
  clientId: process.env.QB_CLIENT_ID,
  clientSecret: process.env.QB_CLIENT_SECRET,
  environment: 'production', // Use 'sandbox' while testing
  redirectUri: 'https://riskaflow.vercel.app/api/quickbooks/callback',
});

// 1. GENERATE LOGIN URL: User clicks "Connect to QuickBooks"
router.get('/connect', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Generate the Intuit login URL, asking for Accounting permissions
    const authUri = qbClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: email, // We pass the email in the state so we know who to attach the tokens to when they return
    });

    res.json({ url: authUri });
  } catch (error) {
    console.error("QB Connect Error:", error);
    res.status(500).json({ error: "Failed to generate QuickBooks login URL" });
  }
});

// 2. CALLBACK: QuickBooks sends the user back here with their secure tokens
router.get('/callback', async (req, res) => {
  try {
    // The state variable holds the user's email that we passed in Step 1
    const userEmail = req.query.state; 
    
    // Exchange the temporary auth code for permanent access tokens
    const authResponse = await qbClient.createToken(req.url);
    const oauth2_token_json = authResponse.getJson();

    // Save the tokens to the specific user's RiskaFlow database profile
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        qbRealmId: qbClient.getToken().realmId,
        qbAccessToken: oauth2_token_json.access_token,
        qbRefreshToken: oauth2_token_json.refresh_token,
        qbTokenExpires: new Date(Date.now() + (oauth2_token_json.expires_in * 1000))
      }
    });

    // Send them back to the RiskaFlow Settings page
    res.redirect('https://riskaflow.vercel.app/settings?qb_success=true');
  } catch (error) {
    console.error("QB Callback Error:", error);
    res.redirect('https://riskaflow.vercel.app/settings?qb_error=true');
  }
});

// 3. PUSH INVOICE TO QUICKBOOKS (Example Sync Route)
router.post('/sync-invoice/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { user: true, customer: true }
    });

    if (!invoice || !invoice.user.qbAccessToken) {
      return res.status(400).json({ error: "Invoice not found or QuickBooks not connected." });
    }

    // Set the client's current tokens
    qbClient.setToken({
      realmId: invoice.user.qbRealmId,
      access_token: invoice.user.qbAccessToken,
      refresh_token: invoice.user.qbRefreshToken
    });

    // Construct the QuickBooks-formatted Invoice payload
    const qbInvoice = {
      "Line": [
        {
          "DetailType": "SalesItemLineDetail",
          "Amount": invoice.totalAmount,
          "SalesItemLineDetail": {
            "ItemRef": {
              "name": "Services",
              "value": "1" // This must map to a real Item/Service ID in their QuickBooks account
            }
          }
        }
      ],
      "CustomerRef": {
        "value": "1" // This must map to a real Customer ID in their QuickBooks account
      }
    };

    // Send the invoice to QuickBooks
    const qbResponse = await qbClient.makeApiCall({
      url: `${qbClient.environment === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com'}/v3/company/${invoice.user.qbRealmId}/invoice`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qbInvoice)
    });

    res.json({ success: true, qbData: qbResponse.getJson() });
  } catch (error) {
    console.error("QB Sync Error:", error);
    res.status(500).json({ error: "Failed to push invoice to QuickBooks" });
  }
});

module.exports = router;