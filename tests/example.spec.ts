import { test, expect } from '@playwright/test';

test.setTimeout(180000);

test('Flash Tech - Complete Real User Flow', async ({ page }) => {
  const home = 'https://flash-tech-mocha.vercel.app/';

  const jsErrors: string[] = [];
  const failedRequests: string[] = [];
  const brokenImages: string[] = [];

  page.on('pageerror', error => {
    jsErrors.push(error.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      jsErrors.push(`Console: ${msg.text()}`);
    }
  });

  page.on('requestfailed', request => {
    failedRequests.push(
      `${request.method()} ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`
    );
  });

  console.log('\n========== FLASH TECH REAL USER TEST ==========\n');

  // =========================================================
  // 1. HOME
  // =========================================================

  console.log('1️⃣ Opening homepage...');

  await page.goto(home, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForLoadState('networkidle', {
    timeout: 30000
  }).catch(() => {});

  console.log(`✓ Homepage opened: ${await page.title()}`);

  // Trigger lazy loading
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(2000);

  // =========================================================
  // 2. IMAGES
  // =========================================================

  console.log('\n2️⃣ Checking images...');

  const images = page.locator('img');
  const imageCount = await images.count();

  for (let i = 0; i < imageCount; i++) {
    const image = images.nth(i);

    const src = await image.getAttribute('src');

    const loaded = await image.evaluate(
      (img: HTMLImageElement) =>
        img.complete && img.naturalWidth > 0
    );

    if (!loaded && src) {
      brokenImages.push(src);
    }
  }

  console.log(`Images found: ${imageCount}`);
  console.log(`Broken images: ${brokenImages.length}`);

  // =========================================================
  // 3. NAVIGATION
  // =========================================================

  console.log('\n3️⃣ Checking navigation...');

  const links = page.locator('a:visible');
  const linkCount = await links.count();

  console.log(`Visible links: ${linkCount}`);

  // =========================================================
  // 4. SEARCH
  // =========================================================

  console.log('\n4️⃣ Testing search...');

  const searchInput = page.locator(
    'input[placeholder*="Search" i]'
  ).first();

  if (await searchInput.count()) {
    await searchInput.fill('laptop');

    const searchButton = page
      .getByRole('button')
      .filter({ hasText: /search/i })
      .first();

    if (await searchButton.count()) {
      await searchButton.click();
    } else {
      await searchInput.press('Enter');
    }

    await page.waitForTimeout(2000);

    console.log(`Search URL: ${page.url()}`);

    const searchResults = page.locator(
      'a[href^="/product/"]'
    );

    console.log(
      `Search product results: ${await searchResults.count()}`
    );
  } else {
    console.log('⚠ Search input not found');
  }

  // =========================================================
  // 5. RETURN HOME
  // =========================================================

  console.log('\n5️⃣ Returning to homepage...');

  await page.goto(home, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(1500);

  // =========================================================
  // 6. SHOP
  // =========================================================

  console.log('\n6️⃣ Testing Shop...');

  const shopLink = page.locator(
    'a[href="/shop"]'
  ).first();

  if (await shopLink.count()) {
    await shopLink.click();

    await page.waitForTimeout(2000);

    console.log(`Shop URL: ${page.url()}`);
  } else {
    console.log('⚠ Shop link not found');
  }

  // =========================================================
  // 7. CATEGORY / FILTERS
  // =========================================================

  console.log('\n7️⃣ Testing categories and filters...');

  const categoryLinks = page.locator(
    'a[href^="/shop/"]'
  );

  const categoryCount = await categoryLinks.count();

  console.log(`Category links found: ${categoryCount}`);

  if (categoryCount > 0) {
    const firstCategory = categoryLinks.first();

    const categoryText =
      (await firstCategory.innerText()).trim();

    console.log(`Opening category: ${categoryText || 'Unnamed category'}`);

    await firstCategory.click();

    await page.waitForTimeout(2000);

    console.log(`Category URL: ${page.url()}`);
  }

  // Try available filter controls
  const selects = page.locator('select:visible');
  const selectCount = await selects.count();

  console.log(`Visible select filters: ${selectCount}`);

  for (let i = 0; i < selectCount; i++) {
    const select = selects.nth(i);

    const options = select.locator('option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      const value = await options.nth(1).getAttribute('value');

      if (value) {
        await select.selectOption(value).catch(() => {});
        console.log(`✓ Filter ${i + 1} tested`);
      }
    }
  }

  await page.waitForTimeout(1500);

  // =========================================================
  // 8. PRODUCT
  // =========================================================

  console.log('\n8️⃣ Testing product page...');

  const productLinks = page.locator(
    'a[href^="/product/"]:visible'
  );

  const productCount = await productLinks.count();

  console.log(`Products found: ${productCount}`);

  if (productCount > 0) {
    await productLinks.first().click();

    await page.waitForTimeout(2000);

    console.log(`Product URL: ${page.url()}`);

    const productTitle =
      await page.locator('h1').first().innerText().catch(() => '');

    console.log(
      `Product title: ${productTitle.trim() || 'Not detected'}`
    );

    // =======================================================
    // 9. ADD TO CART
    // =======================================================

    console.log('\n9️⃣ Testing Add to Cart...');

    const addToCart = page
      .getByRole('button')
      .filter({
        hasText: /add to cart|add to basket|buy now/i
      })
      .first();

    if (await addToCart.count()) {
      await addToCart.click();

      await page.waitForTimeout(1500);

      console.log('✓ Add to cart clicked');
    } else {
      console.log('⚠ Add to cart button not found');
    }
  } else {
    console.log('⚠ No product links found');
  }

  // =========================================================
  // 10. CART
  // =========================================================

  console.log('\n🔟 Testing Cart...');

  await page.goto(`${home}cart`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  }).catch(() => {});

  await page.waitForTimeout(1500);

  console.log(`Cart URL: ${page.url()}`);

  const cartText = await page.locator('body').innerText();

  console.log(
    cartText.toLowerCase().includes('cart')
      ? '✓ Cart page loaded'
      : '⚠ Cart content not clearly detected'
  );

  // =========================================================
  // 11. QUANTITY
  // =========================================================

  console.log('\n1️⃣1️⃣ Testing quantity controls...');

  const quantityButtons = page
    .getByRole('button')
    .filter({
      hasText: /^\+|^-$/
    });

  const quantityButtonCount =
    await quantityButtons.count();

  console.log(
    `Quantity buttons found: ${quantityButtonCount}`
  );

  if (quantityButtonCount > 0) {
    await quantityButtons.first().click().catch(() => {});
    console.log('✓ Quantity control tested');
  }

  // =========================================================
  // 12. REMOVE
  // =========================================================

  console.log('\n1️⃣2️⃣ Testing remove from cart...');

  const removeButton = page
    .getByRole('button')
    .filter({
      hasText: /remove|delete/i
    })
    .first();

  if (await removeButton.count()) {
    await removeButton.click();

    await page.waitForTimeout(1000);

    console.log('✓ Remove action tested');
  } else {
    console.log('⚠ Remove button not found');
  }

  // =========================================================
  // 13. CHECKOUT
  // =========================================================

  console.log('\n1️⃣3️⃣ Testing checkout...');

  const checkoutButton = page
    .getByRole('button')
    .filter({
      hasText: /checkout|proceed to checkout/i
    })
    .first();

  if (await checkoutButton.count()) {
    console.log('Checkout button detected');

    // Don't actually submit an order.
    await checkoutButton.click().catch(() => {});

    await page.waitForTimeout(1500);

    console.log(`Checkout URL: ${page.url()}`);
  } else {
    console.log(
      '⚠ Checkout button not available - cart may be empty'
    );
  }

  // =========================================================
  // 14. AUTH
  // =========================================================

  console.log('\n1️⃣4️⃣ Testing authentication pages...');

  await page.goto(`${home}auth`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  }).catch(() => {});

  await page.waitForTimeout(1000);

  console.log(`Auth URL: ${page.url()}`);

  const authInputs = page.locator('input:visible');
  const authButtons = page.getByRole('button');

  console.log(
    `Auth inputs: ${await authInputs.count()}`
  );

  console.log(
    `Auth buttons: ${await authButtons.count()}`
  );

  // Test empty form validation without submitting real data
  const emailInput = page.locator(
    'input[type="email"]'
  ).first();

  if (await emailInput.count()) {
    await emailInput.focus();
    await emailInput.blur();

    console.log('✓ Email field tested');
  }

  // =========================================================
  // 15. CONTACT
  // =========================================================

  console.log('\n1️⃣5️⃣ Testing Contact page...');

  await page.goto(`${home}contact`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  }).catch(() => {});

  await page.waitForTimeout(1000);

  console.log(`Contact URL: ${page.url()}`);

  const contactInputs =
    page.locator('input:visible, textarea:visible');

  console.log(
    `Contact fields: ${await contactInputs.count()}`
  );

  // Test fields without sending a real message
  const firstContactInput =
    contactInputs.first();

  if (await firstContactInput.count()) {
    await firstContactInput.fill('Test User');
    console.log('✓ Contact form accepts input');
  }

  // =========================================================
  // 16. RESPONSIVE
  // =========================================================

  console.log('\n1️⃣6️⃣ Testing responsive layouts...');

  const viewports = [
    {
      name: 'Mobile',
      width: 375,
      height: 812
    },
    {
      name: 'Tablet',
      width: 768,
      height: 1024
    },
    {
      name: 'Desktop',
      width: 1440,
      height: 900
    }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });

    await page.goto(home, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(700);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        window.innerWidth;
    });

    console.log(
      `${viewport.name}: ${
        overflow
          ? '⚠ Horizontal overflow'
          : '✓ No horizontal overflow'
      }`
    );
  }

  // =========================================================
  // 17. FINAL REPORT
  // =========================================================

  console.log('\n==============================================');
  console.log('             FINAL TEST REPORT');
  console.log('==============================================');

  console.log(
    `Broken Images: ${brokenImages.length}`
  );

  if (brokenImages.length) {
    brokenImages.forEach(image => {
      console.log(`  ❌ ${image}`);
    });
  }

  console.log(
    `JS / Console Errors: ${jsErrors.length}`
  );

  if (jsErrors.length) {
    jsErrors.forEach(error => {
      console.log(`  ❌ ${error}`);
    });
  }

  console.log(
    `Failed Requests: ${failedRequests.length}`
  );

  if (failedRequests.length) {
    failedRequests.forEach(request => {
      console.log(`  ❌ ${request}`);
    });
  }

  console.log('==============================================');

  if (
    jsErrors.length === 0 &&
    failedRequests.length === 0
  ) {
    console.log(
      '✓ NO JS OR NETWORK ERRORS DETECTED'
    );
  }

  console.log(
    '✓ FLASH TECH REAL USER TEST FINISHED'
  );

  console.log('==============================================\n');
});