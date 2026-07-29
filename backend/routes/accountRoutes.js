const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 UPDATED: GET all accounts (Now isolated to the logged-in User!)
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]); // Return empty if no email provided

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json([]); // If user isn't in DB yet, they have 0 accounts

    const accounts = await prisma.account.findMany({
      where: { userId: user.id }, // 🔥 THE MAGIC FILTER
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts);
  } catch (error) {
    console.error("GET ACCOUNTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// POST a new account (Links to the SaaS User Account)
router.post('/', async (req, res) => {
  try {
    const { name, type, detailType, balance, userEmail, userUid } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "Missing User Authentication Data" });
    }

    // 1. Double check the user exists, just in case
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: userEmail, googleId: userUid }
      });
    }

    // 2. Create the account with the userId attached
    const newAccount = await prisma.account.create({
      data: {
        name,
        type,
        detailType: detailType || '',
        balance: parseFloat(balance) || 0,
        userId: user.id // 🔥 The database link!
      }
    });

    res.json(newAccount);
  } catch (error) {
    console.error("CREATE ACCOUNT ERROR:", error);
    res.status(500).json({ error: "Database failed to save the account." });
  }
});

// PUT to update an existing account
router.put('/:id', async (req, res) => {
  try {
    const { name, type, detailType, balance } = req.body;
    const updatedAccount = await prisma.account.update({
      where: { id: req.params.id },
      data: {
        name,
        type,
        detailType,
        balance: parseFloat(balance) || 0
      }
    });
    res.json(updatedAccount);
  } catch (error) {
    console.error("UPDATE ACCOUNT ERROR:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// DELETE an account
router.delete('/:id', async (req, res) => {
  try {
    await prisma.account.delete({
      where: { id: req.params.id }
    });
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// GET transactions for a specific account
router.get('/:id/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { accountId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error("GET TRANSACTIONS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST a transaction to a specific account
router.post('/:id/transactions', async (req, res) => {
  try {
    const { description, amount } = req.body;
    const newTxn = await prisma.transaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        accountId: req.params.id
      }
    });
    res.json(newTxn);
  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

module.exports = router;