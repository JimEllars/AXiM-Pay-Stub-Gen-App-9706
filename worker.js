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

        if (!env.AXIM_SERVICE_KEY) {
           throw new Error("Missing API Key");
        }

        // Proxy to AXiM Core Billing Engine
        const stripeResponse = await fetch(`${apiBase}/functions/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
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
            'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
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
            'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
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
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const page = pdfDoc.addPage([612, 792]); // Letter size
        
        const { employerDetails, employeeDetails, payPeriod, earnings, customDeductions, calculatedTotals } = formData;

        const drawText = (text, x, y, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
          page.drawText(String(text || ''), {
            x,
            y,
            size,
            font: isBold ? boldFont : font,
            color: color,
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
        // Light gray background for EARNINGS STATEMENT
        page.drawRectangle({
          x: 230,
          y: currentY - 5,
          width: 200,
          height: 25,
          color: rgb(0.95, 0.95, 0.95),
        });
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
        // Background for Tables Header
        page.drawRectangle({
          x: 45,
          y: currentY - 5,
          width: 510,
          height: 20,
          color: rgb(0.95, 0.95, 0.95),
        });
        // Tables Header
        drawText('DESCRIPTION', 50, currentY, 12, true);
        drawText('CURRENT', 250, currentY, 12, true);
        drawText('YTD', 350, currentY, 12, true);

        currentY -= 10;
        page.drawLine({ start: { x: 50, y: currentY }, end: { x: 550, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        currentY -= 20;

        let rowY = currentY;

        // YTD Estimator Ratio
        const currentGross = calculatedTotals?.currentGross || 0;
        const ytdGross = calculatedTotals?.ytdGross || 0;
        const ytdRatio = currentGross > 0 ? (ytdGross / currentGross) : 1;

        // Earnings
        drawText('EARNINGS', 50, rowY, 10, true);
        rowY -= 15;
        if (earnings && Array.isArray(earnings)) {
          earnings.forEach(e => {
            drawText(`${e.type} (${e.hours}h)`, 50, rowY);
            drawText(`${(e.currentTotal || 0).toFixed(2)}`, 250, rowY);
            drawText(`${(e.ytdTotal || 0).toFixed(2)}`, 350, rowY);
            rowY -= 15;
          });
        }

        rowY -= 5;
        drawText('Gross Pay:', 50, rowY, 10, true);
        drawText(`${(currentGross).toFixed(2)}`, 250, rowY, 10, true);
        drawText(`${(ytdGross).toFixed(2)}`, 350, rowY, 10, true);

        rowY -= 25;

        // Deductions & Taxes
        drawText('TAXES & DEDUCTIONS', 50, rowY, 10, true);
        rowY -= 15;

        const taxes = calculatedTotals?.taxes || {};

        const drawDeductionRow = (label, currentVal, customYtd) => {
           drawText(label, 50, rowY);
           drawText(`${(currentVal || 0).toFixed(2)}`, 250, rowY);
           const ytdVal = customYtd !== undefined ? customYtd : (currentVal * ytdRatio);
           drawText(`${(ytdVal || 0).toFixed(2)}`, 350, rowY);
           rowY -= 15;
        };

        drawDeductionRow('Social Security Tax:', taxes.socialSecurity);
        drawDeductionRow('Medicare Tax:', taxes.medicare);
        drawDeductionRow('Federal Income Tax:', taxes.federalIncomeTax);

        if (taxes.stateIncomeTax > 0) {
          drawDeductionRow('State Income Tax:', taxes.stateIncomeTax);
        }

        if (customDeductions && Array.isArray(customDeductions)) {
          customDeductions.forEach(d => {
            // customDeductions don't typically have a ytd in the provided code, but we'll estimate if missing
            drawDeductionRow(d.name || 'Deduction', d.amount, d.ytd);
          });
        }

        rowY -= 5;
        drawText('Total Deductions:', 50, rowY, 10, true);
        const totalDeductionsCurrent = calculatedTotals?.totalDeductions || 0;
        drawText(`${(totalDeductionsCurrent).toFixed(2)}`, 250, rowY, 10, true);
        drawText(`${(totalDeductionsCurrent * ytdRatio).toFixed(2)}`, 350, rowY, 10, true);

        const finalY = rowY - 40;
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        // Box around the entire pay stub data area (we'll start it roughly at the top header and end at finalY)
        page.drawRectangle({
          x: 40,
          y: finalY - 10,
          width: 520,
          height: 750 - finalY + 10,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        // Darker box around NET PAY
        page.drawRectangle({
          x: 230,
          y: finalY - 10,
          width: 200,
          height: 30,
          borderColor: rgb(0.6, 0.6, 0.6),
          borderWidth: 1,
          color: rgb(0.9, 0.9, 0.9),
        });
        drawText('NET PAY:', 250, finalY, 14, true);
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`${(netPayCurrent).toFixed(2)}`, 350, finalY, 14, true);

        // Footer disclaimer
        drawText('This document is a generic estimation generated by AXiM Systems. It is not financial or tax advice.', 100, 30, 8, false);



        const docId = 'AXIM-PAYSTUB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const generationTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        drawText(`Document Ref: ${docId}`, 40, 30, 8, false, rgb(0.5, 0.5, 0.5));
        drawText(`Generated: ${generationTime}`, 40, 20, 8, false, rgb(0.5, 0.5, 0.5));

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



    /**
     * PHASE 5: Email Orchestration
     */
    if (url.pathname === '/api/send-email' && request.method === 'POST') {
      try {
        const { session_id, email, formData } = await request.json();

        if (!session_id || !email || !formData) {
           throw new Error("Missing session_id, email, or formData");
        }

        // Verify session_id belongs to a paid transaction
        const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        });

        if (!verifyResponse.ok) {
           throw new Error("Verification gateway failure during email orchestration.");
        }

        const status = await verifyResponse.json();
        if (!status.isPaid) {
           return new Response(JSON.stringify({ error: "Payment not verified." }), {
             status: 402,
             headers: corsHeaders
           });
        }

        // Proxy to AXiM Core Document Orchestrator
        const emailResponse = await fetch(`${apiBase}/functions/document-orchestrator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            session_id,
            email,
            documentType: 'pay_stub',
            formData
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          throw new Error(`Orchestrator returned ${emailResponse.status}: ${errorData}`);
        }

        const data = await emailResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Email Dispatch Failed: " + err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    /**
     * PHASE 6: Telemetry Proxy
     */
    if (url.pathname === '/api/v1/telemetry/ingest' && request.method === 'POST') {
      try {
        const payload = await request.json();

        // Proxy to AXiM Core Telemetry
        // Fire and forget or await, but return success locally quickly
        ctx.waitUntil(
          fetch(`${apiBase}/telemetry/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
            },
            body: JSON.stringify(payload),
          }).catch(e => console.error("Telemetry failed:", e))
        );

        return new Response(JSON.stringify({ status: 'queued' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Telemetry Error: " + err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }


    return new Response('AXiM Systems Proxy: Endpoint Not Found', { status: 404, headers: corsHeaders });

  }
};
