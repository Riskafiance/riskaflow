const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 UPDATED: GET all clients (Now isolated to the logged-in User!)
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]); // Return empty if no email provided

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json([]); // If user isn't in DB yet, they have 0 clients

    const customers = await prisma.customer.findMany({
      where: { userId: user.id }, // 🔥 THE MAGIC FILTER
      orderBy: { createdAt: 'desc' },
      include: { invoices: true } 
    });
    res.json(customers);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// GET a single client by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { 
        invoices: { orderBy: { createdAt: 'desc' } } 
      }
    });
    if (!customer) return res.status(404).json({ error: "Client not found" });
    res.json(customer);
  } catch (error) {
    console.error("GET SINGLE CUSTOMER ERROR:", error);
    res.status(500).json({ error: "Failed to fetch client details" });
  }
});

// POST a new client (Links to the SaaS User Account)
router.post('/', async (req, res) => {
  try {
    const { 
      title, firstName, middleName, lastName, suffix, 
      companyName, displayName, email, phone, address,
      cc, bcc, mobile, fax, website, other,
      userEmail, userUid // Extracted from the new frontend payload
    } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "Missing User Authentication Data" });
    }

    // 1. Check if the user exists in our database. If not, create them!
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: userEmail, googleId: userUid }
      });
    }

    // 2. Create the client and attach the official userId
    const newCustomer = await prisma.customer.create({
      data: {
        title: title || '',
        firstName: firstName || '',
        middleName: middleName || '',
        lastName: lastName || '',
        suffix: suffix || '',
        companyName: companyName || '',
        displayName: displayName || '',
        email: email || '',
        phone: phone || '',
        address: address || '',
        cc: cc || '',
        bcc: bcc || '',
        mobile: mobile || '',
        fax: fax || '',
        website: website || '',
        other: other || '',
        userId: user.id // 🔥 The crucial database link!
      }
    });

    res.json(newCustomer);
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    res.status(500).json({ error: "Database failed to save the client." });
  }
});

// PUT to update an existing client
router.put('/:id', async (req, res) => {
  try {
    const { 
      title, firstName, middleName, lastName, suffix, 
      companyName, displayName, email, phone, address,
      cc, bcc, mobile, fax, website, other 
    } = req.body;

    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        title, firstName, middleName, lastName, suffix, 
        companyName, displayName, email, phone, address,
        cc, bcc, mobile, fax, website, other
      }
    });

    res.json(updatedCustomer);
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    res.status(500).json({ error: "Database failed to update the client." });
  }
});

// DELETE a client
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id }
    });
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

module.exports = router;