import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
/**
 * AXiM Systems Edge Proxy - Production v1.0
 * Handles Stripe orchestration, session verification, and PDF generation stubs.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, replace with specific AXiM domains
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS Pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const apiBase = env.AXIM_API_BASE || 'https://api.axim.us.com/v1';

    /**
     * PHASE 1: Secure Stripe Checkout Session Creation
     */
    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
      try {
        const body = await request.json();
        const origin = request.headers.get('Origin') || new URL(request.url).origin;

        if (!env.AXIM_API_KEY) {
           throw new Error("Missing API Key");
        }

        // Proxy to AXiM Core Billing Engine
        const stripeResponse = await fetch(`${apiBase}/functions/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({
            productId: body.productId,
            metadata: body.metadata,
            success_url: `${origin}/#/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#/app/generator`,
          }),
        });

        if (!stripeResponse.ok) {
          const errorData = await stripeResponse.text();
          throw new Error(`Billing gateway returned ${stripeResponse.status}: ${errorData}`);
        }

        const data = await stripeResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Gateway Error: ' + err.message }), { 
          status: 502, 
          headers: corsHeaders 
        });
      }
    }

    /**
     * PHASE 2: Session Verification
     */
    if (url.pathname === '/api/verify-session' && request.method === 'POST') {
      try {
        const { session_id } = await request.json();
        
        if (!session_id) {
           throw new Error("Missing session_id");
        }

        // Proxy to AXiM Core to verify Stripe payment state
        const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        });

        if (!verifyResponse.ok) {
          throw new Error(`Verification gateway returned ${verifyResponse.status}`);
        }

        const status = await verifyResponse.json();
        return new Response(JSON.stringify(status), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ isPaid: false, error: err.message }), { 
          status: 403, 
          headers: corsHeaders 
        });
      }
    }

    /**
     * PHASE 4: Edge PDF Generation Stub
     */
    if (url.pathname === '/api/generate-paystub' && request.method === 'POST') {
      try {
        const { session_id, formData } = await request.json();

        if (!session_id || !formData) {
           throw new Error("Missing session_id or formData");
        }

        // 1. Verify session_id belongs to a paid transaction again (Server-side check)
        const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        });

        if (!verifyResponse.ok) {
           throw new Error("Verification gateway failure during PDF generation.");
        }

        const status = await verifyResponse.json();
        if (!status.isPaid) {
           return new Response(JSON.stringify({ error: "Payment not verified." }), {
             status: 402,
             headers: corsHeaders
           });
        }

        // 2. Map formData to pdf-lib template
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const page = pdfDoc.addPage([612, 792]); // Letter size
        
        const { employerDetails, employeeDetails, payPeriod, earnings, customDeductions, calculatedTotals } = formData;

        const drawText = (text, x, y, size = 10, isBold = false) => {
          page.drawText(String(text || ''), {
            x,
            y,
            size,
            font: isBold ? boldFont : font,
            color: rgb(0, 0, 0),
          });
        };

        // Layout variables
        let currentY = 750;

        // Header
        drawText(employerDetails?.name || 'Company Name', 50, currentY, 18, true);
        currentY -= 20;
        drawText(employerDetails?.address || 'Company Address', 50, currentY);
        currentY -= 15;
        if (employerDetails?.ein) {
          drawText(`EIN: ${employerDetails.ein}`, 50, currentY);
        }

        currentY -= 40;
        drawText('EARNINGS STATEMENT', 250, currentY, 14, true);

        currentY -= 30;
        // Employee Details (Left) and Pay Period (Right)
        drawText('Employee:', 50, currentY, 10, true);
        drawText(employeeDetails?.name || 'Employee Name', 120, currentY);
        drawText('Pay Frequency:', 350, currentY, 10, true);
        drawText(payPeriod?.frequency || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('Address:', 50, currentY, 10, true);
        drawText(employeeDetails?.address || 'N/A', 120, currentY);
        drawText('Period:', 350, currentY, 10, true);
        drawText(`${payPeriod?.startDate || 'N/A'} - ${payPeriod?.endDate || 'N/A'}`, 450, currentY);

        currentY -= 15;
        drawText('Marital Status:', 50, currentY, 10, true);
        drawText(employeeDetails?.maritalStatus || 'N/A', 140, currentY);
        drawText('Pay Date:', 350, currentY, 10, true);
        drawText(payPeriod?.payDate || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('State:', 50, currentY, 10, true);
        drawText(employeeDetails?.state || 'N/A', 140, currentY);

        currentY -= 40;
        // Tables Header
        drawText('INCOME', 50, currentY, 12, true);
        drawText('DEDUCTIONS & TAXES', 350, currentY, 12, true);

        currentY -= 10;
        page.drawLine({ start: { x: 50, y: currentY }, end: { x: 550, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        currentY -= 20;

        // Income / Deductions rows
        let leftY = currentY;
        let rightY = currentY;

        // Earnings
        if (earnings && Array.isArray(earnings)) {
          earnings.forEach(e => {
            drawText(`${e.type} (${e.hours}h)`, 50, leftY);
            drawText(`${(e.currentTotal || 0).toFixed(2)}`, 250, leftY);
            leftY -= 15;
          });
        }

        leftY -= 10;
        drawText('Gross Pay:', 50, leftY, 10, true);
        drawText(`${(calculatedTotals?.currentGross || 0).toFixed(2)}`, 250, leftY, 10, true);

        // Deductions
        const taxes = calculatedTotals?.taxes || {};
        drawText('Social Security:', 350, rightY);
        drawText(`${(taxes.socialSecurity || 0).toFixed(2)}`, 500, rightY);
        rightY -= 15;

        drawText('Medicare:', 350, rightY);
        drawText(`${(taxes.medicare || 0).toFixed(2)}`, 500, rightY);
        rightY -= 15;

        drawText('Federal Income Tax:', 350, rightY);
        drawText(`${(taxes.federalIncomeTax || 0).toFixed(2)}`, 500, rightY);
        rightY -= 15;

        if (taxes.stateIncomeTax > 0) {
          drawText('State Income Tax:', 350, rightY);
          drawText(`${(taxes.stateIncomeTax || 0).toFixed(2)}`, 500, rightY);
          rightY -= 15;
        }

        if (customDeductions && Array.isArray(customDeductions)) {
          customDeductions.forEach(d => {
            drawText(d.name || 'Deduction', 350, rightY);
            drawText(`${(d.amount || 0).toFixed(2)}`, 500, rightY);
            rightY -= 15;
          });
        }

        rightY -= 10;
        drawText('Total Deductions:', 350, rightY, 10, true);
        drawText(`${(calculatedTotals?.totalDeductions || 0).toFixed(2)}`, 500, rightY, 10, true);

        const finalY = Math.min(leftY, rightY) - 40;
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        drawText('NET PAY:', 350, finalY, 14, true);
        drawText(`${(calculatedTotals?.netPay || 0).toFixed(2)}`, 450, finalY, 14, true);

        const pdfBytes = await pdfDoc.save();

        // 3. Return PDF stream
        return new Response(pdfBytes, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="paystub.pdf"'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Generation Failed: " + err.message }), {
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response('AXiM Systems Proxy: Endpoint Not Found', { status: 404, headers: corsHeaders });
  }
};
