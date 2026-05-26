const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all quotes
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]); 

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json([]); 

    const quotes = await prisma.quote.findMany({
      where: { userId: user.id }, 
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotes);
  } catch (error) {
    console.error("GET QUOTES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// POST a new quote
router.post('/', async (req, res) => {
  try {
    const { quoteNumber, customerId, validUntil, status, subTotal, taxTotal, totalAmount, items, customerNote, userEmail } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.status(400).json({ error: "User not found" });

    const itemsString = Array.isArray(items) ? JSON.stringify(items) : items || "[]";

    let finalQuoteNumber = quoteNumber;
    if (!finalQuoteNumber || finalQuoteNumber.trim() === '') {
      const lastQuote = await prisma.quote.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' } 
      });

      if (lastQuote && lastQuote.quoteNumber) {
        const match = lastQuote.quoteNumber.match(/(\d+)$/);
        if (match) {
          const nextNum = parseInt(match[0], 10) + 1;
          const paddedNum = nextNum.toString().padStart(3, '0');
          finalQuoteNumber = lastQuote.quoteNumber.replace(/\d+$/, paddedNum);
        } else {
          finalQuoteNumber = 'QT-001';
        }
      } else {
        finalQuoteNumber = 'QT-001';
      }
    }

    const newQuote = await prisma.quote.create({
      data: {
        quoteNumber: finalQuoteNumber,
        customerId,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        status: status || 'pending',
        subTotal: parseFloat(subTotal) || 0,
        taxTotal: parseFloat(taxTotal) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        items: itemsString,
        customerNote: customerNote || '', 
        userId: user.id 
      }
    });
    res.json(newQuote);
  } catch (error) {
    console.error("CREATE QUOTE ERROR:", error);
    res.status(500).json({ error: "Database failed to save the quote." });
  }
});

// DELETE a quote
router.delete('/:id', async (req, res) => {
  try {
    await prisma.quote.delete({ where: { id: req.params.id } });
    res.json({ message: "Quote deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

// 🔥 THE MAGIC ROUTE: Convert Quote to Invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const quoteId = req.params.id;
    
    // 1. Grab the original quote
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    if (quote.status === 'converted') {
      return res.status(400).json({ error: "Quote has already been converted to an invoice." });
    }

    // 2. Figure out the user's next Invoice Number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: quote.userId },
      orderBy: { createdAt: 'desc' } 
    });

    let newInvoiceNumber = 'INV-001';
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[0], 10) + 1;
        const paddedNum = nextNum.toString().padStart(3, '0');
        newInvoiceNumber = lastInvoice.invoiceNumber.replace(/\d+$/, paddedNum);
      }
    }

    // 3. Create the new invoice with the quote's data
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: newInvoiceNumber,
        customerId: quote.customerId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default due in 14 days
        status: 'unpaid',
        subTotal: quote.subTotal,
        taxTotal: quote.taxTotal,
        totalAmount: quote.totalAmount,
        items: quote.items,
        customerNote: quote.customerNote,
        userId: quote.userId
      }
    });

    // 4. Update the quote status to 'converted' so it can't be converted twice
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'converted' }
    });

    res.json({ success: true, invoice: newInvoice });
  } catch (error) {
    console.error("CONVERT QUOTE ERROR:", error);
    res.status(500).json({ error: "Failed to convert quote to invoice." });
  }
});

// 🔥 NEW: UPDATE an existing quote
router.put('/:id', async (req, res) => {
  try {
    const { quoteNumber, customerId, validUntil, subTotal, taxTotal, totalAmount, items, customerNote } = req.body;
    
    const updatedQuote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        quoteNumber,
        customerId,
        validUntil: new Date(validUntil),
        subTotal: parseFloat(subTotal) || 0,
        taxTotal: parseFloat(taxTotal) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        items: Array.isArray(items) ? JSON.stringify(items) : items,
        customerNote: customerNote || ''
      }
    });
    res.json(updatedQuote);
  } catch (error) {
    console.error("UPDATE QUOTE ERROR:", error);
    res.status(500).json({ error: "Failed to update quote." });
  }
});

// 🔥 NEW: EMAIL a quote
router.post('/:id/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    // NOTE: This handles the UI workflow. 
    // We can plug in the actual Nodemailer/SendGrid logic here next!
    res.json({ success: true, message: `Quote sent to ${email}!` });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email." });
  }
});

module.exports = router;