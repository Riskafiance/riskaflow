const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit'); // 🔥 NEW: Import PDF engine

// --- Helper Function to Draw the PDF ---
function generateQuotePDF(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // 1. Header
    doc.fontSize(24).fillColor('#0f172a').text(quote.user?.businessName || 'ClearPay', 50, 50);
    doc.fontSize(24).fillColor('#8b5cf6').text('QUOTE', 50, 50, { align: 'right' });

    // 2. Quote Details
    doc.fontSize(10).fillColor('#64748b')
       .text(`Quote #: ${quote.quoteNumber}`, 50, 90, { align: 'right' })
       .text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, { align: 'right' })
       .text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, { align: 'right' });

    // 3. Bill To
    doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('Prepared For:', 50, 120);
    doc.fontSize(10).fillColor('#475569').font('Helvetica')
       .text(`${quote.customer?.firstName || ''} ${quote.customer?.lastName || ''}`)
       .text(quote.customer?.companyName || '')
       .text(quote.customer?.email || '');

    // 4. Table Header
    doc.moveDown(4);
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 400, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 470, tableTop, { width: 70, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).strokeColor('#e2e8f0').stroke();

    // 5. Line Items
    doc.font('Helvetica').fillColor('#475569');
    let y = tableTop + 25;
    let items = [];
    try { items = JSON.parse(quote.items); } catch(e) {}

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const amount = qty * price;

      doc.text(item.description || 'Item', 50, y);
      doc.text(qty.toString(), 350, y, { width: 50, align: 'right' });
      doc.text(`$${price.toFixed(2)}`, 400, y, { width: 70, align: 'right' });
      doc.text(`$${amount.toFixed(2)}`, 470, y, { width: 70, align: 'right' });

      y += 20;
      doc.moveTo(50, y - 5).lineTo(540, y - 5).strokeColor('#f8fafc').stroke();
    });

    // 6. Totals
    y += 15;
    doc.font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Subtotal:', 350, y, { width: 120, align: 'right' });
    doc.text(`$${(quote.subTotal || 0).toFixed(2)}`, 470, y, { width: 70, align: 'right' });
    y += 20;
    doc.text('Tax:', 350, y, { width: 120, align: 'right' });
    doc.text(`$${(quote.taxTotal || 0).toFixed(2)}`, 470, y, { width: 70, align: 'right' });
    y += 25;
    doc.fontSize(14).fillColor('#8b5cf6');
    doc.text('Total Amount:', 300, y, { width: 170, align: 'right' });
    doc.text(`$${(quote.totalAmount || 0).toFixed(2)}`, 470, y, { width: 70, align: 'right' });

    // 7. Footer Note
    if (quote.customerNote) {
      doc.moveDown(4);
      doc.fontSize(10).fillColor('#64748b').font('Helvetica-Oblique');
      doc.text(quote.customerNote, 50, doc.y, { width: 490 });
    }

    doc.end();
  });
}

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
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
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

// Convert Quote to Invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const quoteId = req.params.id;
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    if (quote.status === 'converted') {
      return res.status(400).json({ error: "Quote has already been converted to an invoice." });
    }

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

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: newInvoiceNumber,
        customerId: quote.customerId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 
        status: 'unpaid',
        subTotal: quote.subTotal,
        taxTotal: quote.taxTotal,
        totalAmount: quote.totalAmount,
        items: quote.items,
        customerNote: quote.customerNote,
        userId: quote.userId
      }
    });

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

// UPDATE an existing quote
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
    res.status(500).json({ error: "Failed to update quote." });
  }
});

// 🔥 NEW: GET the PDF file directly in the browser
router.get('/:id/pdf', async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { customer: true, user: true }
    });

    if (!quote) return res.status(404).send('Quote not found');

    const pdfBuffer = await generateQuotePDF(quote);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quote_${quote.quoteNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    res.status(500).send('Error generating PDF');
  }
});

// 🔥 UPDATED: Send email WITH the generated PDF attached
router.post('/:id/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    const quoteId = req.params.id;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { customer: true, user: true }
    });

    if (!quote) return res.status(404).json({ error: "Quote not found" });

    // Generate the PDF in memory
    const pdfBuffer = await generateQuotePDF(quote);

    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"${quote.user?.businessName || "ClearPay"}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Quote #${quote.quoteNumber} from ${quote.user?.businessName || "ClearPay"}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #023c34; margin-top: 0;">Hello ${quote.customer?.firstName || 'Valued Client'},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">You have received a new quote (<strong>#${quote.quoteNumber}</strong>) from ${quote.user?.businessName || "ClearPay"}.</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">A physical PDF copy is attached to this email for your records.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #065f46; margin: 25px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-weight: 600;">Total Amount:</span>
              <span style="color: #0f172a; font-weight: 800; font-size: 18px;">$${quote.totalAmount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-weight: 600;">Valid Until:</span>
              <span style="color: #0f172a; font-weight: 600;">${new Date(quote.validUntil).toLocaleDateString()}</span>
            </div>
          </div>

          <p style="color: #475569; font-size: 15px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Thank you for your business!<br>
            <strong>${quote.user?.businessName || "ClearPay"}</strong>
          </p>
        </div>
      `,
      // 🔥 The magic happens here: Attach the PDF
      attachments: [
        {
          filename: `Quote_${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Quote sent to ${email}!` });
    
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});

module.exports = router;