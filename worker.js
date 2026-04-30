import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
/**
 * AXiM Systems Edge Proxy - Production v1.0
 * Handles Stripe orchestration, session verification, and PDF generation stubs.
 */

const previewRateLimitMap = new Map();

// Helper to clean up old rate limit entries
function cleanupRateLimits() {
  const now = Date.now();
  for (const [ip, data] of previewRateLimitMap.entries()) {
    if (now - data.startTime > 60000) {
      previewRateLimitMap.delete(ip);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = ['https://app.axim.us.com', 'https://api.axim.us.com'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
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
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: body.productId === "pay_stub_bundle" ? "Pay Stub Bundle" : "Pay Stub Generation",
                  },
                  unit_amount: body.productId === "pay_stub_bundle" ? 2000 : 400,
                },
                quantity: 1,
              },
            ],
            metadata: body.metadata,
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/app/generator`,
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

        if (session_id.startsWith('credit_redemption_')) {
           return new Response(JSON.stringify({ isPaid: true, method: 'credit' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
           });
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


    async function generatePdf(formData, isPreview, masterPdfDoc, sessionId) {
      const { employerDetails, employeeDetails, payPeriod, earnings, customDeductions, calculatedTotals, theme } = formData;
      const activeTheme = theme || 'Standard Professional';

      const pdfDoc = masterPdfDoc || await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawText = (text, x, y, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
        page.drawText(String(text || ''), { x, y, size, font: isBold ? helveticaBold : helveticaFont, color });
      };

      if (isPreview) {
        drawText('DRAFT PREVIEW', 150, 400, 50, true, rgb(0.9, 0.9, 0.9));
        page.drawText('NOT FOR OFFICIAL USE', { x: 100, y: 350, size: 30, font: helveticaBold, color: rgb(0.9, 0.9, 0.9), rotate: degrees(45) });
      }

      let currentY = 730;

      if (activeTheme === 'Clean Minimal') {
        drawText(employerDetails?.name || 'Company Name', 50, currentY, 18, true);
        currentY -= 15;
        drawText(employerDetails?.address || 'Company Address', 50, currentY);
        if (employerDetails?.ein) {
          currentY -= 15;
          drawText(`EIN: ${employerDetails.ein}`, 50, currentY);
        }

        drawText('EARNINGS STATEMENT', 400, 730, 14, true, rgb(0.4, 0.4, 0.4));
        currentY -= 40;

        drawText('Employee:', 50, currentY, 10, true);
        drawText(employeeDetails?.name || 'Employee Name', 120, currentY);
        drawText('Pay Frequency:', 350, currentY, 10, true);
        drawText(payPeriod?.frequency || 'N/A', 450, currentY);

        currentY -= 15;
        if (employeeDetails?.ssnLast4) {
          drawText('SSN:', 50, currentY, 10, true);
          drawText(`XXX-XX-${employeeDetails.ssnLast4}`, 120, currentY);
          currentY -= 15;
        }
        drawText('Address:', 50, currentY, 10, true);
        drawText(employeeDetails?.address || 'Employee Address', 120, currentY);
        drawText('Pay Period:', 350, currentY, 10, true);
        drawText(`${payPeriod?.startDate || 'N/A'} to ${payPeriod?.endDate || 'N/A'}`, 450, currentY);

        currentY -= 15;
        drawText('Pay Date:', 350, currentY, 10, true);
        drawText(payPeriod?.payDate || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('State:', 50, currentY, 10, true);
        drawText(employeeDetails?.state || 'N/A', 120, currentY);

        currentY -= 40;

        page.drawLine({ start: { x: 50, y: currentY+5 }, end: { x: 550, y: currentY+5 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        drawText('DESCRIPTION', 50, currentY-10, 10, true, rgb(0.4, 0.4, 0.4));
        drawText('CURRENT', 250, currentY-10, 10, true, rgb(0.4, 0.4, 0.4));
        drawText('YTD', 350, currentY-10, 10, true, rgb(0.4, 0.4, 0.4));
        page.drawLine({ start: { x: 50, y: currentY-15 }, end: { x: 550, y: currentY-15 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

        currentY -= 30;
      } else if (activeTheme === 'Modern Slate') {
        page.drawRectangle({ x: 0, y: 690, width: 612, height: 102, color: rgb(0.05, 0.15, 0.2) });
        drawText(employerDetails?.name || 'Company Name', 50, 750, 20, true, rgb(1, 1, 1));
        drawText(employerDetails?.address || 'Company Address', 50, 730, 10, false, rgb(0.8, 0.8, 0.8));
        if (employerDetails?.ein) {
          drawText(`EIN: ${employerDetails.ein}`, 50, 715, 10, false, rgb(0.8, 0.8, 0.8));
        }

        drawText('EARNINGS STATEMENT', 400, 750, 14, true, rgb(0, 0.9, 1));

        currentY -= 70;

        drawText('EMPLOYEE INFO', 50, currentY, 10, true, rgb(0, 0.9, 1));
        drawText('PAY PERIOD', 350, currentY, 10, true, rgb(0, 0.9, 1));

        currentY -= 15;
        drawText(employeeDetails?.name || 'Employee Name', 50, currentY, 12, true);
        drawText(`Frequency: ${payPeriod?.frequency || 'N/A'}`, 350, currentY);

        currentY -= 15;
        drawText(`SSN: XXX-XX-${employeeDetails?.ssnLast4 || 'XXXX'}`, 50, currentY);
        drawText(`Period: ${payPeriod?.startDate || 'N/A'} to ${payPeriod?.endDate || 'N/A'}`, 350, currentY);

        currentY -= 15;
        drawText(employeeDetails?.address || 'Employee Address', 50, currentY);
        drawText(`Pay Date: ${payPeriod?.payDate || 'N/A'}`, 350, currentY);

        currentY -= 40;

        page.drawRectangle({ x: 45, y: currentY - 5, width: 510, height: 20, color: rgb(0.9, 0.95, 0.95) });
        drawText('DESCRIPTION', 50, currentY, 10, true, rgb(0.1, 0.3, 0.4));
        drawText('CURRENT', 250, currentY, 10, true, rgb(0.1, 0.3, 0.4));
        drawText('YTD', 350, currentY, 10, true, rgb(0.1, 0.3, 0.4));

        currentY -= 20;
      } else {
        // Standard Professional
        drawText(employerDetails?.name || 'Company Name', 50, currentY, 16, true);
        currentY -= 15;
        drawText(employerDetails?.address || 'Company Address', 50, currentY);
        if (employerDetails?.ein) {
          currentY -= 15;
          drawText(`EIN: ${employerDetails.ein}`, 50, currentY);
        }

        page.drawRectangle({ x: 230, y: 730 - 5, width: 200, height: 25, color: rgb(0.95, 0.95, 0.95) });
        drawText('EARNINGS STATEMENT', 250, 730, 14, true);

        currentY -= 30;
        drawText('Employee:', 50, currentY, 10, true);
        drawText(employeeDetails?.name || 'Employee Name', 120, currentY);
        drawText('Pay Frequency:', 350, currentY, 10, true);
        drawText(payPeriod?.frequency || 'N/A', 450, currentY);

        currentY -= 15;
        if (employeeDetails?.ssnLast4) {
          drawText('SSN:', 50, currentY, 10, true);
          drawText(`XXX-XX-${employeeDetails.ssnLast4}`, 120, currentY);
          currentY -= 15;
        }
        drawText('Address:', 50, currentY, 10, true);
        drawText(employeeDetails?.address || 'Employee Address', 120, currentY);
        drawText('Pay Period:', 350, currentY, 10, true);
        drawText(`${payPeriod?.startDate || 'N/A'} to ${payPeriod?.endDate || 'N/A'}`, 450, currentY);

        currentY -= 15;
        drawText('Pay Date:', 350, currentY, 10, true);
        drawText(payPeriod?.payDate || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('State:', 50, currentY, 10, true);
        drawText(employeeDetails?.state || 'N/A', 120, currentY);

        currentY -= 40;
        page.drawRectangle({ x: 45, y: currentY - 5, width: 510, height: 20, color: rgb(0.95, 0.95, 0.95) });
        drawText('DESCRIPTION', 50, currentY, 12, true);
        drawText('CURRENT', 250, currentY, 12, true);
        drawText('YTD', 350, currentY, 12, true);

        currentY -= 10;
        page.drawLine({ start: { x: 50, y: currentY }, end: { x: 550, y: currentY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        currentY -= 20;
      }

      let rowY = currentY;

      const currentGross = calculatedTotals?.currentGross || 0;
      const ytdGross = calculatedTotals?.ytdGross || 0;
      const ytdRatio = currentGross > 0 ? (ytdGross / currentGross) : 1;

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
          drawDeductionRow(d.name || 'Deduction', d.amount, d.ytd);
        });
      }

      rowY -= 5;
      drawText('Total Deductions:', 50, rowY, 10, true);
      const totalDeductionsCurrent = calculatedTotals?.totalDeductions || 0;
      drawText(`${(totalDeductionsCurrent).toFixed(2)}`, 250, rowY, 10, true);
      drawText(`${(totalDeductionsCurrent * ytdRatio).toFixed(2)}`, 350, rowY, 10, true);

      const finalY = rowY - 40;

      if (activeTheme === 'Clean Minimal') {
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        drawText('NET PAY:', 200, finalY, 14, true);
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`${(netPayCurrent).toFixed(2)}`, 350, finalY, 14, true);
      } else if (activeTheme === 'Modern Slate') {
        page.drawRectangle({ x: 45, y: finalY - 10, width: 510, height: 30, color: rgb(0.05, 0.15, 0.2) });
        drawText('NET PAY', 50, finalY, 14, true, rgb(1, 1, 1));
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`${(netPayCurrent).toFixed(2)}`, 350, finalY, 14, true, rgb(0, 0.9, 1));
      } else {
        // Classic
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        page.drawRectangle({ x: 40, y: finalY - 10, width: 520, height: 750 - finalY + 10, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawRectangle({ x: 230, y: finalY - 10, width: 200, height: 30, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1, color: rgb(0.9, 0.9, 0.9) });
        drawText('NET PAY:', 250, finalY, 14, true);
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`${(netPayCurrent).toFixed(2)}`, 350, finalY, 14, true);
      }

      drawText('This document is a generic estimation for personal record-keeping only.', 100, 30, 8, false);

      const docId = 'PS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const generationTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      drawText(`Document Ref: ${docId}`, 40, 30, 8, false, rgb(0.5, 0.5, 0.5));
      drawText(`Generated: ${generationTime}`, 40, 20, 8, false, rgb(0.5, 0.5, 0.5));

      pdfDoc.setTitle('Pay Stub - ' + docId);
      pdfDoc.setSubject(sessionId ? `Session: ${sessionId}` : 'Draft');
      pdfDoc.setKeywords([docId, sessionId, 'axim-systems']);

      return { pdfDoc, docId };
    }

    if (url.pathname === '/api/generate-preview' && request.method === 'POST') {
      try {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const now = Date.now();

        cleanupRateLimits();

        if (ip !== 'unknown') {
           let rateData = previewRateLimitMap.get(ip);
           if (!rateData) {
             rateData = { count: 1, startTime: now };
             previewRateLimitMap.set(ip, rateData);
           } else {
             if (now - rateData.startTime < 60000) {
               rateData.count++;
               if (rateData.count > 30) {
                 return new Response(JSON.stringify({ error: "Too Many Requests" }), {
                   status: 429,
                   headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
                 });
               }
             } else {
               rateData.count = 1;
               rateData.startTime = now;
             }
           }
        }

        const { formData } = await request.json();

        if (!formData) {
           throw new Error("Missing formData");
        }

        const { pdfDoc } = await generatePdf(formData, true, null, null);
        const pdfBytes = await pdfDoc.save();

        return new Response(pdfBytes, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="preview.pdf"'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Preview Generation Failed: " + err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    if (url.pathname === '/api/generate-paystub' && request.method === 'POST') {
      try {
        const { session_id, formData } = await request.json();

        if (!session_id || !formData) {
           throw new Error("Missing session_id or formData");
        }

        if (!session_id.startsWith('credit_redemption_')) {
          const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`,
            },
            body: JSON.stringify({ session_id }),
          });

          if (!verifyResponse.ok) {
             throw new Error("Verification gateway failure.");
          }

          const status = await verifyResponse.json();
          if (!status.isPaid) {
             return new Response(JSON.stringify({ error: "Payment not verified." }), {
               status: 402,
               headers: corsHeaders
             });
          }
        }

        let finalPdfDoc;
        let docId;

        if (Array.isArray(formData)) {
           // It's a batch! Progressive Streaming (direct page addition)
           finalPdfDoc = await PDFDocument.create();
           docId = 'AXIM-BATCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();

           for (const data of formData) {
             await generatePdf(data, false, finalPdfDoc, session_id);
           }
        } else {
           const res = await generatePdf(formData, false, null, session_id);
           finalPdfDoc = res.pdfDoc;
           docId = res.docId;
        }

        const pdfBytes = await finalPdfDoc.save();

        const vaultFormData = new FormData();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        vaultFormData.append('document', blob, 'paystub.pdf');
        vaultFormData.append('document_type', 'pay_stub');
        vaultFormData.append('trace_id', docId);

        ctx.waitUntil(
          fetch(`${apiBase}/v1/vault-upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`
            },
            body: vaultFormData
          }).catch(e => console.error("Vault upload failed:", e))
        );


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
if (url.pathname === '/api/send-email' && request.method === 'POST') {
      try {
        const { session_id, email, formData } = await request.json();

        if (!session_id || !email || !formData) {
           throw new Error("Missing session_id, email, or formData");
        }

        // Verify session_id belongs to a paid transaction
        if (!session_id.startsWith('credit_redemption_')) {
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
            templateId: 'axim_premium_delivery',
            theme: formData?.theme || 'Standard Professional',
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
