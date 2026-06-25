
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status >= 500 && response.status < 600) {
        if (i === retries - 1) throw new Error(`Server error: ${response.status}`);
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

/**
 * Generic Edge Proxy - Production v1.0
 * Handles Stripe orchestration, session verification, and PDF generation stubs.
 */

const previewRateLimitMap = new Map();

// Helper to clean up old rate limit entries
function cleanupRateLimits() {
  const now = Date.now();
  for (const [ip, data] of previewRateLimitMap.entries()) {
    if (now - data.startTime > 300000) {
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

                // Proxy to Core Billing Engine
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
                    name: body.productId === "pay_stub_bundle" ? "Premium Pay Stub Bundle" : "Premium Pay Stub Generation",
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
      const formatCurrency = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const truncate = (str, max) => str && str.length > max ? str.substring(0, max) + '...' : str;
      const { employerDetails, employeeDetails, payPeriod, earnings, customDeductions, calculatedTotals, theme } = formData;
      const activeTheme = theme || 'Standard Professional';
      const formatDate = (dateStr) => { if(!dateStr) return 'N/A'; const [y,m,d] = dateStr.split('-'); return y ? `${m}/${d}/${y}` : dateStr; };

      const pdfDoc = masterPdfDoc || await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawText = (text, x, y, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
        page.drawText(String(text ?? ''), { x, y, size, font: isBold ? helveticaBold : helveticaFont, color });
      };

      if (isPreview) {
        drawText('DRAFT PREVIEW', 150, 400, 50, true, rgb(0.9, 0.9, 0.9));
        page.drawText('NOT FOR OFFICIAL USE', { x: 100, y: 350, size: 30, font: helveticaBold, color: rgb(0.9, 0.9, 0.9), rotate: degrees(45) });
      }

      let currentY = 730;

      // Stateless Company Logo Handling
      if (employerDetails?.companyLogo) {
         try {
             // The companyLogo is a base64 string from the frontend
             const base64Data = employerDetails.companyLogo.split(',')[1];
             const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

             let embeddedImage;
             if (employerDetails.companyLogo.startsWith('data:image/png')) {
                 embeddedImage = await pdfDoc.embedPng(imageBytes);
             } else if (employerDetails.companyLogo.startsWith('data:image/jpeg')) {
                 embeddedImage = await pdfDoc.embedJpg(imageBytes);
             }

             if (embeddedImage) {
                 const { width, height } = embeddedImage.scale(1);
                 // Max width/height to constrain logo dimensions
                 const maxWidth = 100;
                 const maxHeight = 50;
                 const scaleRatio = Math.min(maxWidth / width, maxHeight / height);
                 const finalWidth = width * scaleRatio;
                 const finalHeight = height * scaleRatio;

                 page.drawImage(embeddedImage, {
                     x: 50,
                     y: currentY - finalHeight + 15,
                     width: finalWidth,
                     height: finalHeight,
                 });

                 currentY -= (finalHeight + 10);
             }
         } catch (err) {
             console.error('Failed to embed company logo:', err);
         }
      }

      const combinedItemsCount = (earnings?.length || 0) + (customDeductions?.length || 0);
      const rowStep = combinedItemsCount > 6 ? 11 : 15;

      if (activeTheme === 'Clean Minimal') {
        drawText((employerDetails?.name || 'Company Name').substring(0, 45) || 'Company Name', 50, currentY, 18, true);
        currentY -= 15;
        drawText([employerDetails?.address, [employerDetails?.city, employerDetails?.state].filter(Boolean).join(', '), employerDetails?.zipCode].filter(Boolean).join(' ').trim() || 'Company Address', 50, currentY);
        if (employerDetails?.ein) {
          currentY -= 15;
          drawText(`EIN: ${employerDetails.ein}`, 50, currentY);
        }

        drawText('EARNINGS STATEMENT', 400, 730, 14, true, rgb(0.4, 0.4, 0.4));
        currentY -= 40;

        drawText('Employee:', 50, currentY, 10, true);
        drawText(truncate(employeeDetails?.name, 40) || 'Employee Name', 120, currentY);
        drawText('Pay Frequency:', 350, currentY, 10, true);
        drawText(payPeriod?.frequency || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('Address:', 50, currentY, 10, true);
        drawText(employeeDetails?.address || 'Employee Address', 120, currentY);
        drawText('Pay Period:', 350, currentY, 10, true);
        drawText(`${formatDate(payPeriod?.startDate)} to ${formatDate(payPeriod?.endDate)}`, 450, currentY);

        currentY -= 15;
        drawText('Pay Date:', 350, currentY, 10, true);
        drawText(formatDate(payPeriod?.payDate), 450, currentY);

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
        drawText((employerDetails?.name || 'Company Name').substring(0, 45) || 'Company Name', 50, 750, 20, true, rgb(1, 1, 1));
        drawText([employerDetails?.address, [employerDetails?.city, employerDetails?.state].filter(Boolean).join(', '), employerDetails?.zipCode].filter(Boolean).join(' ').trim() || 'Company Address', 50, 730, 10, false, rgb(0.8, 0.8, 0.8));
        if (employerDetails?.ein) {
          drawText(`EIN: ${employerDetails.ein}`, 50, 715, 10, false, rgb(0.8, 0.8, 0.8));
        }

        drawText('EARNINGS STATEMENT', 400, 750, 14, true, rgb(0, 0.9, 1));

        currentY -= 70;

        drawText('EMPLOYEE INFO', 50, currentY, 10, true, rgb(0, 0.9, 1));
        drawText('PAY PERIOD', 350, currentY, 10, true, rgb(0, 0.9, 1));

        currentY -= 15;
        drawText(truncate(employeeDetails?.name, 40) || 'Employee Name', 50, currentY, 12, true);
        drawText(`Frequency: ${payPeriod?.frequency || 'N/A'}`, 350, currentY);

        currentY -= 15;
        drawText(employeeDetails?.address || 'Employee Address', 50, currentY);
        drawText(`Period: ${formatDate(payPeriod?.startDate)} to ${formatDate(payPeriod?.endDate)}`, 350, currentY);

        currentY -= 15;
        drawText(`Pay Date: ${formatDate(payPeriod?.payDate)}`, 350, currentY);

        currentY -= 40;

        page.drawRectangle({ x: 45, y: currentY - 5, width: 510, height: 20, color: rgb(0.9, 0.95, 0.95) });
        drawText('DESCRIPTION', 50, currentY, 10, true, rgb(0.1, 0.3, 0.4));
        drawText('CURRENT', 250, currentY, 10, true, rgb(0.1, 0.3, 0.4));
        drawText('YTD', 350, currentY, 10, true, rgb(0.1, 0.3, 0.4));

        currentY -= 20;
      } else {
        // Standard Professional
        drawText((employerDetails?.name || 'Company Name').substring(0, 45) || 'Company Name', 50, currentY, 16, true);
        currentY -= 15;
        drawText([employerDetails?.address, [employerDetails?.city, employerDetails?.state].filter(Boolean).join(', '), employerDetails?.zipCode].filter(Boolean).join(' ').trim() || 'Company Address', 50, currentY);
        if (employerDetails?.ein) {
          currentY -= 15;
          drawText(`EIN: ${employerDetails.ein}`, 50, currentY);
        }

        page.drawRectangle({ x: 230, y: 730 - 5, width: 200, height: 25, color: rgb(0.95, 0.95, 0.95) });
        drawText('EARNINGS STATEMENT', 250, 730, 14, true);

        currentY -= 30;
        drawText('Employee:', 50, currentY, 10, true);
        drawText(truncate(employeeDetails?.name, 40) || 'Employee Name', 120, currentY);
        drawText('Pay Frequency:', 350, currentY, 10, true);
        drawText(payPeriod?.frequency || 'N/A', 450, currentY);

        currentY -= 15;
        drawText('Address:', 50, currentY, 10, true);
        drawText(employeeDetails?.address || 'Employee Address', 120, currentY);
        drawText('Pay Period:', 350, currentY, 10, true);
        drawText(`${formatDate(payPeriod?.startDate)} to ${formatDate(payPeriod?.endDate)}`, 450, currentY);

        currentY -= 15;
        drawText('Pay Date:', 350, currentY, 10, true);
        drawText(formatDate(payPeriod?.payDate), 450, currentY);

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
        const validEarnings = earnings.filter(e => e.currentTotal > 0);
        validEarnings.forEach(e => {
          drawText(`${e.type} (${e.hours}h)`, 50, rowY);
          drawText(`$${formatCurrency(e.currentTotal || 0)}`, 250, rowY);
          drawText(`$${formatCurrency(e.ytdTotal || 0)}`, 350, rowY);
          rowY -= rowStep;
        });
      }

      rowY -= 5;
      drawText('Gross Pay:', 50, rowY, 10, true);
      drawText(`$${formatCurrency(currentGross)}`, 250, rowY, 10, true);
      drawText(`$${formatCurrency(ytdGross)}`, 350, rowY, 10, true);

      rowY -= 25;

      drawText('TAXES & DEDUCTIONS', 50, rowY, 10, true);
      rowY -= 15;

      const taxes = calculatedTotals?.taxes || {};

      const drawDeductionRow = (label, currentVal, customYtd) => {
          drawText(label, 50, rowY);
          drawText(`$${formatCurrency(currentVal || 0)}`, 250, rowY);
          const ytdVal = customYtd !== undefined ? customYtd : (currentVal * ytdRatio);
          drawText(`$${formatCurrency(ytdVal || 0)}`, 350, rowY);
          rowY -= rowStep;
      };

      drawDeductionRow('Social Security Tax:', taxes.socialSecurity);
      drawDeductionRow('Medicare Tax:', taxes.medicare);
      drawDeductionRow('Federal Income Tax:', taxes.federalIncomeTax);

      if (taxes.stateIncomeTax > 0) {
        drawDeductionRow('State Income Tax:', taxes.stateIncomeTax);
      }

      if (customDeductions && Array.isArray(customDeductions)) {
        const validDeductions = customDeductions.filter(d => d.amount > 0);
        validDeductions.forEach(d => {
          drawDeductionRow(d.name || 'Deduction', d.amount, d.ytd);
        });
      }

      rowY -= 5;
      drawText('Total Deductions:', 50, rowY, 10, true);
      const totalDeductionsCurrent = calculatedTotals?.totalDeductions || 0;
      drawText(`$${formatCurrency(totalDeductionsCurrent)}`, 250, rowY, 10, true);
      drawText(`$${formatCurrency(totalDeductionsCurrent * ytdRatio)}`, 350, rowY, 10, true);

      const finalY = rowY - 40;

      if (activeTheme === 'Clean Minimal') {
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        drawText('NET PAY:', 200, finalY, 14, true);
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`$${formatCurrency(netPayCurrent)}`, 350, finalY, 14, true);
      } else if (activeTheme === 'Modern Slate') {
        page.drawRectangle({ x: 45, y: finalY - 10, width: 510, height: 30, color: rgb(0.05, 0.15, 0.2) });
        drawText('NET PAY', 50, finalY, 14, true, rgb(1, 1, 1));
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`$${formatCurrency(netPayCurrent)}`, 350, finalY, 14, true, rgb(0, 0.9, 1));
      } else {
        // Classic
        page.drawLine({ start: { x: 50, y: finalY + 20 }, end: { x: 550, y: finalY + 20 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        page.drawRectangle({ x: 40, y: finalY - 10, width: 520, height: 750 - finalY + 10, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawRectangle({ x: 230, y: finalY - 10, width: 200, height: 30, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1, color: rgb(0.9, 0.9, 0.9) });
        drawText('NET PAY:', 250, finalY, 14, true);
        const netPayCurrent = calculatedTotals?.netPay || 0;
        drawText(`$${formatCurrency(netPayCurrent)}`, 350, finalY, 14, true);
      }

            if (employerDetails?.memo) {
        drawText(`MEMO: ${employerDetails.memo}`, 40, finalY - 40, 10, true, rgb(0,0,0));
      }

      drawText('This document is a generic estimation for personal record-keeping only.', 100, 30, 8, false);

      const docId = 'PS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const generationTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      drawText(`Document Ref: ${docId}`, 40, 30, 8, false, rgb(0.5, 0.5, 0.5));
      drawText(`Generated: ${generationTime}`, 40, 20, 8, false, rgb(0.5, 0.5, 0.5));

      pdfDoc.setTitle(docId);
      pdfDoc.setSubject(sessionId ? `Session: ${sessionId}` : 'Draft');
      pdfDoc.setKeywords([]);

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
             if (now - rateData.startTime < 300000) {
               rateData.count++;
               if (rateData.count > 10) {
                 return new Response(JSON.stringify({ error: "Too Many Requests" }), {
                   status: 429,
                   headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '300' }
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

        if (status.metadata?.fulfilled === 'true') {
           return new Response(JSON.stringify({ error: "Session already fulfilled." }), {
             status: 403,
             headers: corsHeaders
           });
        }

        let finalPdfDoc;
        let docId;
        const userConsent = Array.isArray(formData) ? formData[0]?.vaultConsent : formData?.vaultConsent;

        if (Array.isArray(formData)) {
           // It's a batch! Progressive Streaming (direct page addition)
           finalPdfDoc = await PDFDocument.create();
           docId = 'BATCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();

           for (const data of formData) {
             await generatePdf(data, false, finalPdfDoc, session_id);
           }
        } else {
           const res = await generatePdf(formData, false, null, session_id);
           finalPdfDoc = res.pdfDoc;
           docId = res.docId;
        }

        const pdfBytes = await finalPdfDoc.save();

                let vaultConsent = true;
        try {
           if (status.metadata && status.metadata.state_part_misc) {
              const miscParsed = JSON.parse(status.metadata.state_part_misc);
              if (Array.isArray(miscParsed)) {
                 if (miscParsed.length > 0 && typeof miscParsed[0].vc !== 'undefined') {
                    vaultConsent = miscParsed[0].vc;
                 }
              } else if (typeof miscParsed.vc !== 'undefined') {
                 vaultConsent = miscParsed.vc;
              }
           }
        } catch(e) {
           console.error("Failed to parse vault consent", e);
        }

        if (vaultConsent) {
          const vaultFormData = new FormData();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          vaultFormData.append('document', blob, 'paystub.pdf');
          vaultFormData.append('document_type', 'pay_stub');
          vaultFormData.append('trace_id', docId);

          if (userConsent !== false) {
            ctx.waitUntil(
              fetchWithRetry(`${apiBase}/v1/vault-upload`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`
                },
                body: vaultFormData
              }).catch(e => console.error("Vault upload failed:", e))
            );
          }
        }

        // Mark session as fulfilled
        const stripeUpdateData = new URLSearchParams();
        stripeUpdateData.append('metadata[fulfilled]', 'true');
        ctx.waitUntil(
          fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`
            },
            body: stripeUpdateData.toString()
          }).catch(e => console.error("Failed to mark session as fulfilled:", e))
        );

        // Telemetry logging for revenue_generated
        ctx.waitUntil(
          fetchWithRetry(`${apiBase}/v1/telemetry/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`
            },
            body: JSON.stringify({
              event: 'revenue_generated',
              type: 'pay_stub',
              source: 'axim_paystub_generator',
              environment: 'edge',
              session_id,
              amount: Array.isArray(formData) ? 20.00 : 4.00,
              trace_id: docId
            })
          }).catch(e => console.error("Telemetry logging failed:", e))
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

        // Proxy to Core Document Orchestrator
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
            senderName: (Array.isArray(formData) ? formData[0]?.employerDetails?.name : formData?.employerDetails?.name) || 'Payroll Services',
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

        // Proxy to Core Telemetry
        // Fire and forget or await, but return success locally quickly
        ctx.waitUntil(
          fetchWithRetry(`${apiBase}/v1/telemetry/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.AXIM_SERVICE_KEY}`
            },
            body: JSON.stringify(payload)
          }).catch(e => console.error("Proxy Telemetry failed:", e))
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


    if (url.pathname === '/api/save-draft-queue' && request.method === 'POST') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Proxy: Endpoint Not Found', { status: 404, headers: corsHeaders });

  }
};
