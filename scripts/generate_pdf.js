const { chromium } = require('playwright');
const path = require('path');

async function generatePdf(url, outputPath) {
    console.log(`Connecting to ${url}...`);
    
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: 2
    });
    
    const page = await context.newPage();
    
    // Navigate and wait for network to be idle
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
        console.log(`Initial navigation failed/timed out: ${e.message}. Trying anyway...`);
    }

    // Wait for images to load explicitly
    console.log("Waiting for images and content to stabilize...");
    await page.waitForTimeout(3000);
    
    // Inject CSS to hide download button if visible
    await page.addStyleTag({ content: "#download-pdf-btn { display: none !important; }" });
    
    // Ensure scroll to bottom to trigger any lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Calculate total height for dynamic PDF sizing
    const dimensions = await page.evaluate(() => {
        const el = document.getElementById('itinerary-content');
        return {
            height: el ? el.scrollHeight : document.body.scrollHeight,
            width: 1000
        };
    });
    
    console.log(`Content dimensions: ${dimensions.width}x${dimensions.height}px`);

    // Generate PDF with dynamic height
    console.log(`Generating PDF to ${outputPath}...`);
    await page.pdf({
        path: outputPath,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        scale: 1,
        preferCSSPageSize: false
    });
    
    await browser.close();
    console.log("Done!");
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node generate_pdf.js <URL> [output_path]");
        process.exit(1);
    }
    
    const targetUrl = args[0];
    const outFile = args.length > 1 ? args[1] : "itinerary.pdf";
    
    generatePdf(targetUrl, outFile).catch(console.error);
}

module.exports = generatePdf;
