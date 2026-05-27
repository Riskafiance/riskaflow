const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// 🔥 Secure Key via .env
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to generate the unique 'RF-XXXXXX' Firm Code
const generateFlowCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'RF-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]); 

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json([]); 

    const invoices = await prisma.invoice.findMany({
      where: { userId: user.id }, 
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    console.error("GET INVOICES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// POST a new invoice
router.post('/', async (req, res) => {
  try {
    const { 
      invoiceNumber, customerId, dueDate, status, subTotal, taxTotal, totalAmount, amountPaid, items, customerNote, 
      userEmail, userUid 
    } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({ error: "Missing User Authentication Data" });
    }

    const itemsString = Array.isArray(items) ? JSON.stringify(items) : items || "[]";

    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: { 
          email: userEmail, 
          googleId: userUid,
          flowCode: generateFlowCode() 
        }
      });
    }

    let finalInvoiceNumber = invoiceNumber;

    if (!finalInvoiceNumber || finalInvoiceNumber.trim() === '') {
      const lastInvoice = await prisma.invoice.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' } 
      });

      if (lastInvoice && lastInvoice.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          const nextNum = parseInt(match[0], 10) + 1;
          const paddedNum = nextNum.toString().padStart(3, '0'); // Makes it 001, 002, etc.
          finalInvoiceNumber = lastInvoice.invoiceNumber.replace(/\d+$/, paddedNum);
        } else {
          finalInvoiceNumber = 'INV-001';
        }
      } else {
        finalInvoiceNumber = 'INV-001';
      }
    }

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: finalInvoiceNumber,
        customerId,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        status: status || 'unpaid',
        subTotal: parseFloat(subTotal) || 0,
        taxTotal: parseFloat(taxTotal) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        amountPaid: parseFloat(amountPaid) || 0, // 🔥 NEW: Track amount paid
        items: itemsString,
        customerNote: customerNote || '', 
        userId: user.id 
      }
    });
    res.json(newInvoice);
  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    res.status(500).json({ error: "Database failed to save the invoice." });
  }
});

// PUT to update an invoice
router.put('/:id', async (req, res) => {
  try {
    const { invoiceNumber, customerId, dueDate, status, subTotal, taxTotal, totalAmount, amountPaid, items, customerNote } = req.body;
    const itemsString = Array.isArray(items) ? JSON.stringify(items) : items;

    const existingInvoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });

    if (existingInvoice && existingInvoice.status === 'paid' && status === 'unpaid') {
      const paymentTxn = await prisma.transaction.findFirst({
        where: { description: { contains: `Invoice #${existingInvoice.invoiceNumber}` } }
      });
      if (paymentTxn) {
        await prisma.account.update({
          where: { id: paymentTxn.accountId },
          data: { balance: { decrement: paymentTxn.amount } }
        });
        await prisma.transaction.create({
          data: {
            accountId: paymentTxn.accountId,
            description: `Refund / Reversal for Invoice #${existingInvoice.invoiceNumber}`,
            amount: -Math.abs(paymentTxn.amount)
          }
        });
      }
    }

    const updateData = {};
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
    if (customerId) updateData.customerId = customerId;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) updateData.status = status;
    if (subTotal !== undefined) updateData.subTotal = parseFloat(subTotal);
    if (taxTotal !== undefined) updateData.taxTotal = parseFloat(taxTotal);
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
    if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid); // 🔥 NEW: Support manual amountPaid updates
    if (items) updateData.items = itemsString;
    if (customerNote !== undefined) updateData.customerNote = customerNote; 

    const updatedInvoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ error: "Database failed to update the invoice." });
  }
});

// DELETE an invoice
router.delete('/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// GENERATE PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: true, user: true } 
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    buildPDFContent(doc, invoice);
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating PDF");
  }
});

// 🔥 Generate a Stripe Link for In-Person Payments 
router.post('/:id/checkout-link', async (req, res) => {
  try {
    const { customAmount } = req.body; // 🔥 NEW: Allow frontend to pass a specific deposit amount
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: true, user: true }
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (!invoice.user?.stripeAccountId) {
      return res.status(403).json({ error: "You must connect a bank account in Settings before accepting online payments." });
    }

    const stripeAccountDetails = await stripe.accounts.retrieve(invoice.user.stripeAccountId);
    if (!stripeAccountDetails.charges_enabled) {
      return res.status(403).json({ error: "Your Stripe account setup is incomplete. Please finish onboarding in Settings." });
    }

    // 🔥 Calculate the remaining balance
    const remainingBalance = invoice.totalAmount - (invoice.amountPaid || 0);
    const paymentAmount = customAmount ? parseFloat(customAmount) : remainingBalance;

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: "Invoice is already fully paid." });
    }

    const bizName = invoice.user?.businessName || (invoice.user?.firstName ? `${invoice.user.firstName} ${invoice.user.lastName}` : "Business Owner");

    const checkoutParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Payment for Invoice ${invoice.invoiceNumber} - ${bizName}`,
            description: `Professional Services for ${invoice.customer.firstName} ${invoice.customer.lastName}`,
          },
          unit_amount: Math.round(paymentAmount * 100), // Charge the partial/remaining amount
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://riskaflow.vercel.app/?paid_invoice_id=${invoice.id}&amount_paid=${paymentAmount}`, 
      cancel_url: `https://riskaflow.vercel.app/`,
    };

    const session = await stripe.checkout.sessions.create(checkoutParams, {
      stripeAccount: invoice.user.stripeAccountId
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("STRIPE LINK ERROR:", error);
    res.status(500).json({ error: "Failed to generate payment link." });
  }
});

// SEND DYNAMIC EMAIL WITH CUSTOM MESSAGE & OPTIONAL PAYMENT LINK
router.post('/:id/send-email', express.json(), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: true, user: true }
    });

    if (!invoice || !invoice.customer || !invoice.customer.email) {
      return res.status(400).json({ error: "Invoice or Customer Email missing." });
    }

    const body = req.body || {};
    const { toEmail, subject, messageBody, paymentLink } = body;

    const bizName = invoice.user?.businessName || (invoice.user?.firstName ? `${invoice.user.firstName} ${invoice.user.lastName}` : "Business Owner");
    const bizAddress = invoice.user?.businessAddress || "Online Business";
    const remainingBalance = invoice.totalAmount - (invoice.amountPaid || 0);

    let finalPaymentUrl = "";
    
    // User provided a manual payment link
    if (paymentLink && paymentLink.trim() !== "") {
      finalPaymentUrl = paymentLink;
    } 
    // Auto-generate the Stripe checkout if they have a fully setup Stripe account
    else if (invoice.user?.stripeAccountId) {
      try {
        const stripeAccountDetails = await stripe.accounts.retrieve(invoice.user.stripeAccountId);
        
        // ONLY generate the link if they are fully permitted to receive money AND there is a balance
        if (stripeAccountDetails.charges_enabled && remainingBalance > 0) {
          const checkoutParams = {
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Payment for Invoice ${invoice.invoiceNumber} - ${bizName}`,
                  description: `Professional Services for ${invoice.customer.firstName} ${invoice.customer.lastName}`,
                },
                unit_amount: Math.round(remainingBalance * 100), 
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://riskaflow.vercel.app/?paid_invoice_id=${invoice.id}&amount_paid=${remainingBalance}`, 
            cancel_url: `https://riskaflow.vercel.app/`,
          };

          const session = await stripe.checkout.sessions.create(checkoutParams, {
            stripeAccount: invoice.user.stripeAccountId
          });
          
          finalPaymentUrl = session.url;
        }
      } catch (stripeError) {
        console.error("Stripe Session Error:", stripeError);
      }
    }

    const formattedMessage = messageBody 
      ? messageBody.replace(/\n/g, '<br>') 
      : `<p>Your invoice from ${bizName} has a remaining balance of <strong>$${remainingBalance.toFixed(2)}</strong>. A PDF copy is attached to this email.</p>`;

    let payButtonHtml = '';
    if (finalPaymentUrl && remainingBalance > 0) {
      payButtonHtml = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${finalPaymentUrl}" style="background-color: #10b981; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Pay Remaining Balance ($${remainingBalance.toFixed(2)})
          </a>
        </div>
      `;
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      const mailOptions = {
        from: `"${bizName}" <riskas.finances@gmail.com>`, 
        to: toEmail || invoice.customer.email,           
        subject: subject || `Invoice ${invoice.invoiceNumber} from ${bizName}`, 
        text: `Please find your attached invoice. If paying online: ${finalPaymentUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #0f172a;">Invoice ${invoice.invoiceNumber}</h2>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              ${formattedMessage}
            </div>

            ${payButtonHtml}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">${bizName} | ${bizAddress.replace(/\n/g, ', ')}</p>
          </div>
        `,
        attachments: [
          {
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            content: pdfData,
            contentType: 'application/pdf'
          }
        ]
      };

      try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "Email sent successfully!" });
      } catch (emailError) {
        console.error("NODEMAILER ERROR:", emailError);
        res.status(500).json({ error: "Failed to send email. Check your email credentials." });
      }
    });

    buildPDFContent(doc, invoice);
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during email process." });
  }
});


// 🔥 Handle Successful Payment Redirect (Supports Partials)
router.post('/:id/mark-paid', express.json(), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { amountPaidThisTime } = req.body; // Sent from frontend on success

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, user: true }
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Calculate new total paid and determine if fully paid
    const paymentAmount = amountPaidThisTime ? parseFloat(amountPaidThisTime) : (invoice.totalAmount - (invoice.amountPaid || 0));
    const newAmountPaid = (invoice.amountPaid || 0) + paymentAmount;
    
    let newStatus = 'partially_paid';
    if (newAmountPaid >= invoice.totalAmount) {
      newStatus = 'paid';
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: newStatus,
        amountPaid: newAmountPaid 
      },
      include: { customer: true, user: true }
    });

    const bizName = updatedInvoice.user?.businessName || (updatedInvoice.user?.firstName ? `${updatedInvoice.user.firstName} ${updatedInvoice.user.lastName}` : "Business Owner");
    const remainingBalance = updatedInvoice.totalAmount - updatedInvoice.amountPaid;

    const isFullyPaid = newStatus === 'paid';
    const titleText = isFullyPaid ? "Payment Successful!" : "Partial Payment Received!";
    const balanceText = isFullyPaid 
        ? "Your account is now settled. Thank you for your business!" 
        : `Your remaining balance is $${remainingBalance.toFixed(2)}.`;

    const mailOptions = {
      from: `"${bizName}" <riskas.finances@gmail.com>`, 
      to: updatedInvoice.customer.email,
      subject: `Payment Received - Thank you! (Invoice ${updatedInvoice.invoiceNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
          <div style="background-color: #d1fae5; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 30px;">
            ✅
          </div>
          <h1 style="color: #065f46; margin-top: 0;">${titleText}</h1>
          <p style="font-size: 16px;">Hi <strong>${updatedInvoice.customer.firstName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5;">We have successfully received your payment of <strong>$${paymentAmount.toFixed(2)}</strong> for Invoice ${updatedInvoice.invoiceNumber}.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #475569;">${balanceText}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">${bizName}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Payment recorded and email sent!" });

  } catch (error) {
    console.error("Payment Success Error:", error);
    res.status(500).json({ error: "Failed to process success callback." });
  }
});

// --- PROFESSIONAL PDF GENERATOR ---
function buildPDFContent(doc, invoice) {
  const bizName = invoice.user?.businessName || (invoice.user?.firstName ? `${invoice.user.firstName} ${invoice.user.lastName}` : "Business Owner");
  const bizEmail = invoice.user?.email || "admin@riskasfinance.com";

  let currentY = 50;
  let startX = 50;

  // --- TOP LEFT: LOGO ---
  if (invoice.user?.businessLogo) {
    try {
      const base64Data = invoice.user.businessLogo.replace(/^data:image\/\w+;base64,/, "");
      const logoBuffer = Buffer.from(base64Data, 'base64');
      doc.image(logoBuffer, 50, currentY, { width: 80, height: 80, fit: [80, 80] });
      startX = 145; // Shift text to the right if logo exists
    } catch (e) {
      console.error("Failed to draw logo", e);
    }
  }

  // --- TOP LEFT: COMPANY INFO ---
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(bizName, startX, currentY);
  let yHeader = currentY + 15;

  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  if (invoice.user?.businessAddress) {
    const addressLines = invoice.user.businessAddress.split('\n');
    addressLines.forEach(line => {
      doc.text(line, startX, yHeader);
      yHeader += 13;
    });
  }

  if (invoice.user?.businessPhone) {
    doc.text(invoice.user.businessPhone, startX, yHeader);
    yHeader += 13;
  }
  doc.text(bizEmail, startX, yHeader);
  yHeader += 13;
  
  if (invoice.user?.businessWebsite) {
    doc.text(invoice.user.businessWebsite, startX, yHeader);
  }

  // --- TOP RIGHT: INVOICE BOX ---
  doc.fontSize(28).font('Helvetica-Bold').fillColor('#000000').text("INVOICE", 350, 50, { align: 'right', width: 200 });

  const infoBoxY = 90;
  doc.rect(350, infoBoxY, 200, 15).fill('#f1f5f9'); 
  doc.fillColor('#333333').fontSize(8).font('Helvetica-Bold');
  doc.text("INVOICE #", 355, infoBoxY + 4, { width: 60 });
  doc.text("DATE", 430, infoBoxY + 4, { width: 50 });
  doc.text("DUE DATE", 490, infoBoxY + 4, { width: 60 });

  doc.rect(350, infoBoxY + 15, 200, 20).stroke('#e2e8f0'); 
  doc.fillColor('#000000').font('Helvetica');
  doc.text(invoice.invoiceNumber, 355, infoBoxY + 20, { width: 60 });
  doc.text(new Date(invoice.createdAt).toLocaleDateString(), 430, infoBoxY + 20, { width: 50 });
  doc.text(new Date(invoice.dueDate).toLocaleDateString(), 490, infoBoxY + 20, { width: 60 });

  // --- MIDDLE LEFT: BILL TO ---
  const maxTopLeftY = Math.max(yHeader, invoice.user?.businessLogo ? 130 : 50);
  const billToY = Math.max(maxTopLeftY + 30, infoBoxY + 60);
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#666666').text("BILL TO", 50, billToY);
  doc.fontSize(10).font('Helvetica').fillColor('#000000');

  let custY = billToY + 15;
  if (invoice.customer) {
    if (invoice.customer.companyName) {
      doc.font('Helvetica-Bold').text(invoice.customer.companyName, 50, custY);
      custY += 13;
    }
    doc.font('Helvetica').text(`${invoice.customer.firstName} ${invoice.customer.lastName}`, 50, custY);
    custY += 13;
    if (invoice.customer.address) {
      const custAddr = invoice.customer.address.split('\n');
      custAddr.forEach(line => {
         doc.text(line, 50, custY);
         custY += 13;
      });
    }
  } else {
    doc.text("Unknown Customer", 50, custY);
    custY += 13;
  }

  // --- TABLE HEADERS ---
  const tableY = custY + 30;
  doc.rect(50, tableY, 510, 20).fill('#0f172a'); 
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);

  doc.text("SERVICE", 60, tableY + 6, { width: 100 });
  doc.text("DESCRIPTION", 170, tableY + 6, { width: 180 });
  doc.text("QTY", 360, tableY + 6, { width: 30, align: 'right' });
  doc.text("RATE", 410, tableY + 6, { width: 50, align: 'right' });
  doc.text("AMOUNT", 480, tableY + 6, { width: 70, align: 'right' });

  // --- TABLE ROWS ---
  let rowY = tableY + 25;
  doc.font('Helvetica').fontSize(9).fillColor('#000000');

  let parsedItems = [];
  try { parsedItems = JSON.parse(invoice.items); } catch(e) {}

  parsedItems.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.rect(50, rowY - 5, 510, 20).fill('#f8fafc');
      doc.fillColor('#000000'); 
    }

    const qty = item.quantity || 1;
    const rate = parseFloat(item.price || 0);
    const amount = qty * rate;

    doc.text(item.category || 'Services', 60, rowY, { width: 100 });
    doc.text(item.description || '-', 170, rowY, { width: 180 });
    doc.text(qty.toString(), 360, rowY, { width: 30, align: 'right' });
    doc.text(rate.toFixed(2), 410, rowY, { width: 50, align: 'right' });
    doc.text(amount.toFixed(2), 480, rowY, { width: 70, align: 'right' });

    rowY += 20;
  });

  doc.moveTo(50, rowY).lineTo(560, rowY).lineWidth(1).strokeColor('#e2e8f0').stroke();

  // --- BOTTOM SECTION: TOTALS & NOTES ---
  const bottomY = rowY + 20;

  // Ways to Pay
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text("Ways to pay", 50, bottomY);
  doc.fontSize(9).font('Helvetica').fillColor('#666666').text("Securely online via Credit Card, Debit Card,\nor Bank Transfer.", 50, bottomY + 15);

  // Customer Note
  if (invoice.customerNote && invoice.customerNote.trim() !== '') {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text("Note:", 50, bottomY + 45);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(invoice.customerNote, 50, bottomY + 60, { width: 250 });
  }

  // Totals Breakdown
  const totalsX = 350;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text("SUBTOTAL", totalsX, bottomY, { width: 100 });
  doc.font('Helvetica').text(`$${invoice.subTotal.toFixed(2)}`, totalsX + 110, bottomY, { width: 100, align: 'right' });

  doc.font('Helvetica-Bold').text("TAX", totalsX, bottomY + 15, { width: 100 });
  doc.font('Helvetica').text(`$${invoice.taxTotal.toFixed(2)}`, totalsX + 110, bottomY + 15, { width: 100, align: 'right' });

  doc.font('Helvetica-Bold').text("TOTAL", totalsX, bottomY + 30, { width: 100 });
  doc.font('Helvetica').text(`$${invoice.totalAmount.toFixed(2)}`, totalsX + 110, bottomY + 30, { width: 100, align: 'right' });

  // 🔥 NEW: Show Amount Paid
  doc.font('Helvetica-Bold').fillColor('#059669').text("AMOUNT PAID", totalsX, bottomY + 45, { width: 100 });
  doc.font('Helvetica').text(`-$${(invoice.amountPaid || 0).toFixed(2)}`, totalsX + 110, bottomY + 45, { width: 100, align: 'right' });

  // 🔥 UPDATED: Balance Due Box calculating remaining total
  const remainingBalance = invoice.totalAmount - (invoice.amountPaid || 0);
  doc.rect(totalsX, bottomY + 60, 210, 2).fill('#e2e8f0'); 
  doc.rect(totalsX, bottomY + 65, 210, 25).fill('#f8fafc');
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text("BALANCE DUE", totalsX + 10, bottomY + 72, { width: 100 });
  doc.text(`$${Math.max(0, remainingBalance).toFixed(2)}`, totalsX + 100, bottomY + 72, { width: 100, align: 'right' });

  doc.fontSize(9).font('Helvetica-Oblique').fillColor('#94a3b8').text('Thank you for your business.', 50, 720, { align: 'center' });
}

module.exports = router;