// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const FIXTURE = path.join(__dirname, '..', 'assets', 'downloads', 'runbook.txt');
const FIXTURE_CSV = path.join(__dirname, '..', 'assets', 'downloads', 'shipments.csv');

/* ============================================================
   A guided tour. Every test below passes against the gym as
   shipped. Read them once, then delete them and write your own.
   ============================================================ */

test.describe('01 · form controls', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/controls.html'); });

  test('fill, check and select', async ({ page }) => {
    await page.getByTestId('input-name').fill('Ada Lovelace');
    await page.getByTestId('input-email').fill('ada@example.dev');
    await page.getByTestId('cb-terms').check();
    await page.getByTestId('select-country').selectOption('in');

    // The city list is fetched, so wait for the option rather than the select.
    await expect(page.getByTestId('select-city')).toBeEnabled();
    await page.getByTestId('select-city').selectOption('pune');

    await page.getByTestId('btn-read-text').click();
    await expect(page.getByTestId('text-out')).toContainText('Ada Lovelace');
  });

  test('the keystroke-only field needs pressSequentially', async ({ page }) => {
    const field = page.getByTestId('input-keystroke');

    await field.fill('pasted');
    await expect(field).toHaveValue('');          // fill() is rejected

    await field.pressSequentially('typed');
    await expect(field).toHaveValue('typed');     // real keystrokes land
  });

  test('indeterminate is a property, not an attribute', async ({ page }) => {
    await page.getByTestId('cb-emea').check();
    const parent = page.getByTestId('cb-parent');

    await expect(parent).not.toBeChecked();
    expect(await parent.evaluate((el) => el.indeterminate)).toBe(true);
  });

  test('the div dropdown is not a select', async ({ page }) => {
    await page.getByTestId('dropdown-trigger').click();
    await page.getByTestId('dropdown-list').getByRole('option', { name: /Lyon/ }).click();
    await expect(page.getByTestId('dropdown-out')).toHaveText(/lyon/);
  });

  test('handle a confirm dialog', async ({ page }) => {
    page.once('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm');
      return dialog.accept();
    });
    await page.getByTestId('btn-confirm').click();
    await expect(page.getByTestId('dialog-out')).toHaveText('confirm → true');
  });

  test('validation summary then a clean submit', async ({ page }) => {
    await page.getByTestId('rf-submit').click();
    await expect(page.getByTestId('form-error')).toHaveCount(5);

    await page.getByTestId('rf-username').fill('ada.l');
    await page.getByTestId('rf-email').fill('ada@example.dev');
    await page.getByTestId('rf-role').selectOption('SDET');
    await page.getByTestId('rf-seats').fill('12');
    await page.getByTestId('rf-agree').check();
    await page.getByTestId('rf-submit').click();

    await expect(page.getByTestId('form-receipt')).toContainText('Account created');
    await expect(page.getByTestId('reg-form')).toHaveCount(0);   // the form node is gone
  });
});

test.describe('02 · dynamic tables', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/tables.html'); });

  test('filter narrows the row count', async ({ page }) => {
    await page.getByTestId('table-search').fill('Busan');
    const rows = page.getByTestId('ship-row');
    await expect(rows).not.toHaveCount(0);
    for (const row of await rows.all()) {
      await expect(row).toContainText('Busan');
    }
  });

  test('sorting reorders the DOM', async ({ page }) => {
    await page.getByTestId('th-weight').click();
    await expect(page.getByTestId('th-weight')).toHaveAttribute('aria-sort', 'ascending');

    const weights = await page.getByTestId('ship-row')
      .locator('td:nth-child(5)')
      .allTextContents();
    const nums = weights.map((w) => Number(w.replace(/,/g, '')));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  test('act on a row by its business key, not its index', async ({ page }) => {
    const row = page.locator('[data-ship="SHP-4103"]');
    await row.getByRole('button', { name: 'Hold' }).click();
    await expect(row).toContainText(/Delayed|In transit/);
  });

  test('poll a table that rewrites itself', async ({ page }) => {
    await expect
      .poll(async () => {
        const text = await page.getByTestId('feed-ticks').textContent();
        return Number(text.replace('tick ', ''));
      }, { timeout: 8000 })
      .toBeGreaterThan(2);

    // Freeze the feed before asserting on any cell value.
    await page.getByTestId('feed-toggle').click();
    await expect(page.getByTestId('feed-state')).toHaveText('paused');
  });
});

test.describe('03 · accordions', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/accordions.html'); });

  test('three levels of native details', async ({ page }) => {
    await page.locator('[data-testid="native-nested-outer"] > summary').click();
    await page.locator('[data-testid="native-nested-mid"] > summary').click();
    await page.locator('[data-testid="native-nested-inner"] > summary').click();

    await page.getByTestId('deep-native-input').fill('OVR-4417');
    await page.getByTestId('deep-native-submit').click();
    await expect(page.getByTestId('deep-native-out')).toContainText('OVR-4417');
  });

  test('hidden panel vs destroyed panel', async ({ page }) => {
    await expect(page.getByTestId('hidden-panel-0')).toBeHidden();   // present, not visible
    await expect(page.getByTestId('destroy-panel-0')).toHaveCount(0); // absent entirely

    await page.getByTestId('hidden-head-0').click();
    await page.getByTestId('destroy-head-0').click();

    await expect(page.getByTestId('hidden-panel-0')).toBeVisible();
    await expect(page.getByTestId('destroy-panel-0')).toBeVisible();
  });

  test('only one section stays open', async ({ page }) => {
    await page.getByTestId('ex-head-0').click();
    await expect(page.getByTestId('ex-head-0')).toHaveAttribute('aria-expanded', 'true');

    await page.getByTestId('ex-head-2').click();
    await expect(page.getByTestId('ex-head-0')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('ex-action-2')).toBeVisible();     // waits out the animation
  });

  test('lazy panel content arrives late', async ({ page }) => {
    await page.getByTestId('lazy-head-0').click();
    await expect(page.getByTestId('lazy-content-0')).toBeVisible();  // auto-waits ~1.1s
    await expect(page.getByTestId('lazy-content-0')).toContainText('artifact');
  });

  test('accordion inside a frame', async ({ page }) => {
    await page.getByTestId('frame-acc-head').click();
    const frame = page.frameLocator('#config-frame');
    await frame.getByTestId('frame-acc-1').click();
    await frame.getByTestId('frame-host-input').fill('ingest.internal');
    await frame.getByTestId('frame-save').click();
    await expect(frame.getByTestId('frame-acc-out')).toContainText('ingest.internal:8443');
  });
});

test.describe('04 · calendars', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/calendars.html'); });

  test('native date inputs take a value directly', async ({ page }) => {
    await page.getByTestId('native-date').fill('2026-11-19');
    await page.getByTestId('native-datetime').fill('2026-11-19T09:30');
    await page.getByTestId('native-month').fill('2026-11');
    await page.getByTestId('native-week').fill('2026-W47');
    await page.getByTestId('native-time').fill('14:15');

    await page.getByTestId('native-read').click();
    await expect(page.getByTestId('native-out')).toContainText('2026-W47');
  });

  test('drive the popup picker by data-date', async ({ page }) => {
    await page.getByTestId('popup-input').click();
    const cal = page.getByTestId('popup-calendar');
    await expect(cal).toBeVisible();

    await cal.getByTestId('cal-next').click();          // August → September
    await cal.locator('[data-date="2026-09-15"]').click();

    await expect(page.getByTestId('popup-input')).toHaveValue('2026-09-15');
  });

  test('drill down year → month → day with no data-date', async ({ page }) => {
    await page.getByTestId('drill-input').click();
    const cal = page.getByTestId('drill-calendar');

    await cal.getByTestId('cal-title').click();          // days → months
    await cal.getByTestId('cal-title').click();          // months → years
    await cal.getByTestId('cal-year').filter({ hasText: '2027' }).click();
    await cal.getByTestId('cal-month').filter({ hasText: 'Mar' }).click();

    // Leading days from February repeat the same numbers, so exclude outside cells.
    await cal.locator('[data-testid="cal-day"][data-outside="false"]')
      .filter({ hasText: /^12$/ }).click();

    await expect(page.getByTestId('drill-input')).toHaveValue('2027-03-12');
  });

  test('a range that crosses a month boundary', async ({ page }) => {
    await page.getByTestId('range-left').locator('[data-date="2026-08-26"]').click();
    await page.getByTestId('range-right').locator('[data-date="2026-09-04"]').click();

    await expect(page.getByTestId('range-from')).toHaveValue('2026-08-26');
    await expect(page.getByTestId('range-to')).toHaveValue('2026-09-04');
    await expect(page.getByTestId('range-out')).toContainText('10 days');
  });

  test('disabled dates cannot be selected', async ({ page }) => {
    const cal = page.getByTestId('blocked-calendar');
    await expect(cal.locator('[data-date="2026-08-15"]')).toBeDisabled();  // a holiday
    await cal.locator('[data-date="2026-08-12"]').click();                 // a Wednesday
    await expect(page.getByTestId('blocked-out')).toContainText('2026-08-12');
  });

  test('calendar inside a frame', async ({ page }) => {
    const frame = page.frameLocator('#cal-frame');
    await frame.locator('[data-date="2026-08-20"]').click();
    await frame.getByTestId('frame-cal-send').click();
    await expect(page.getByTestId('frame-cal-out')).toContainText('2026-08-20');
  });
});

test.describe('05 · upload and download', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/files.html'); });

  test('single and multiple files', async ({ page }) => {
    await page.getByTestId('upload-single').setInputFiles(FIXTURE);
    await expect(page.getByTestId('plain-file')).toHaveCount(1);

    await page.getByTestId('upload-multiple').setInputFiles([FIXTURE, FIXTURE_CSV]);
    await expect(page.getByTestId('plain-file')).toHaveCount(2);
  });

  test('a file built in memory, no disk needed', async ({ page }) => {
    await page.getByTestId('upload-single').setInputFiles({
      name: 'inline.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('created by the test run')
    });
    await expect(page.getByTestId('plain-file').first()).toContainText('inline.txt');
  });

  test('the hidden input still accepts files', async ({ page }) => {
    await page.getByTestId('upload-hidden').setInputFiles([FIXTURE, FIXTURE_CSV]);
    await expect(page.getByTestId('upload-hidden-button')).toHaveText('2 attachments selected');
  });

  test('type validation rejects a non-CSV', async ({ page }) => {
    await page.getByTestId('upload-csv').setInputFiles(FIXTURE);   // .txt
    await expect(page.getByTestId('plain-out')).toContainText('not a CSV');
  });

  test('drop a file onto a zone with no input', async ({ page }) => {
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['dropped bytes'], 'dropped.txt', { type: 'text/plain' }));
      return dt;
    });
    await page.getByTestId('dropzone').dispatchEvent('drop', { dataTransfer });
    await expect(page.getByTestId('drop-file')).toContainText('dropped.txt');
  });

  test('upload with a progress bar', async ({ page }) => {
    await page.getByTestId('upload-progress-input').setInputFiles(FIXTURE_CSV);
    await page.getByTestId('upload-start').click();
    await expect(page.getByTestId('upload-success')).toBeVisible({ timeout: 15_000 });
  });

  test('static download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-csv').click()
    ]);
    expect(download.suggestedFilename()).toBe('shipments.csv');
  });

  test('blob download with an unpredictable filename', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-random').click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^export-[a-z0-9]+\.txt$/);
  });

  test('a link that does not exist yet', async ({ page }) => {
    await page.getByTestId('generate-report').click();
    const link = page.getByTestId('report-link');
    await expect(link).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      link.click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^report-\d+\.csv$/);
  });

  test('a download triggered from inside a frame surfaces on the page', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),                       // page, not frame
      page.frameLocator('#file-frame').getByTestId('frame-download-blob').click()
    ]);
    expect(download.suggestedFilename()).toBe('manifest.txt');
  });
});

test.describe('06 · nested iframes', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/frames.html'); });

  test('reach four levels down', async ({ page }) => {
    const deep = page
      .frameLocator('#depth-1')
      .frameLocator('#depth-2')
      .frameLocator('iframe[title="Depth 3"]')   // no id, no name
      .frameLocator('#depth-4');

    await deep.getByTestId('deep-input').fill('REL-9921');
    await deep.getByTestId('deep-confirm').click();        // lives in a shadow root

    await expect(deep.getByTestId('deep-out')).toContainText('REL-9921');
    await expect(page.getByTestId('deep-relay')).toContainText('level 4 reported: REL-9921');
  });

  test('the decoy at depth 1 has the same test id', async ({ page }) => {
    const shell = page.frameLocator('#depth-1');
    await shell.getByTestId('deep-input').fill('wrong-one');
    // A locator that stops at depth 1 fills the decoy and the relay never fires.
    await expect(page.getByTestId('deep-relay')).toBeEmpty();
  });

  test('disambiguate frames that share a name', async ({ page }) => {
    const right = page.frameLocator('iframe[src*="side=right"]');
    await right.getByTestId('panel-input').fill('from the right');
    await right.getByTestId('panel-send').click();
    await expect(page.getByTestId('sibling-relay')).toContainText('right panel → from the right');
  });

  test('srcdoc frame', async ({ page }) => {
    const inline = page.frameLocator('#srcdoc-frame');
    await inline.getByTestId('srcdoc-button').click();
    await inline.getByTestId('srcdoc-button').click();
    await expect(inline.getByTestId('srcdoc-count')).toHaveText('2');
  });

  test('a frame injected after load', async ({ page }) => {
    const late = page.frameLocator('#late-frame');
    await late.getByTestId('panel-input').fill('late arrival');   // waits for the element
    await expect(late.getByTestId('panel-input')).toHaveValue('late arrival');
  });

  test('a frame hosted inside a shadow root', async ({ page }) => {
    const shadowed = page.frameLocator('[data-testid="shadow-frame-host"] iframe');
    await expect(shadowed.getByTestId('panel-tag')).toHaveText('panel · shadow');
  });

  test('scope a frame by its table row', async ({ page }) => {
    const osaka = page.locator('[data-site="osaka"]');
    const frame = osaka.frameLocator('iframe');
    await expect(frame.getByTestId('panel-tag')).toHaveText('panel · JP-W2');
  });
});

test.describe('07 · hostile DOM', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/dom.html'); });

  test('never depend on a generated id', async ({ page }) => {
    const publish = page.locator('[data-role="primary"]');
    const idA = await publish.getAttribute('id');
    await page.reload();
    const idB = await page.locator('[data-role="primary"]').getAttribute('id');

    expect(idA).not.toBe(idB);
    await page.locator('[data-role="primary"]').click();   // works either way
    await expect(page.getByTestId('unstable-out')).toContainText('primary');
  });

  test('duplicate ids break strict mode', async ({ page }) => {
    await expect(page.locator('#save')).toHaveCount(3);

    // Strict mode refuses to guess which of the three you meant.
    await expect(page.locator('#save').click({ timeout: 3000 }))
      .rejects.toThrow(/strict mode violation/);

    await page.locator('[data-which="footer"]').click();
    await expect(page.getByTestId('dupe-out')).toContainText('footer');
  });

  test('normalised text matching survives fragmentation', async ({ page }) => {
    await expect(page.getByText('Order #4417 shipped')).toBeVisible();
    await expect(page.getByText('Order #4418 shipped')).toBeVisible();
    await expect(page.getByText('Order #4419 shipped')).toBeVisible();
  });

  test('scope repeated buttons by their row', async ({ page }) => {
    await page.locator('[data-rule="Drop RFC1918"]')
      .getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByTestId('repeat-out')).toContainText('Drop RFC1918');
  });

  test('an overlay intercepts the click', async ({ page }) => {
    const covered = page.getByTestId('covered-button');
    await expect(covered.click({ timeout: 3000 }))
      .rejects.toThrow(/intercepts pointer events|Timeout/);

    await page.getByTestId('lift-veil').click();
    await covered.click();
    await expect(page.getByTestId('overlay-out')).toContainText('reached the button');
  });

  test('Playwright waits for a moving element to settle', async ({ page }) => {
    await page.getByTestId('moving-button').click();
    await expect(page.getByTestId('mover-out')).toContainText('caught at');
  });

  test('opacity zero is still visible to Playwright', async ({ page }) => {
    await expect(page.getByTestId('inv-display')).toBeHidden();
    await expect(page.getByTestId('inv-visibility')).toBeHidden();
    await expect(page.getByTestId('inv-size')).toBeHidden();
    await expect(page.getByTestId('inv-opacity')).toBeVisible();   // the surprising one
  });

  test('locators survive a node swap, handles do not', async ({ page }) => {
    const locator = page.getByTestId('detach-target');
    const handle = await locator.elementHandle();

    await page.getByTestId('detach-go').click();

    await expect(locator).toHaveText('Replacement #1');            // re-resolved
    expect(await handle.evaluate((el) => el.isConnected)).toBe(false); // stale
  });

  test('click a canvas by offset', async ({ page }) => {
    await page.getByTestId('canvas').click({ position: { x: 70, y: 45 } });
    await expect(page.getByTestId('canvas-out')).toContainText('Accept');
  });

  test('SVG className is not a string', async ({ page }) => {
    const apac = page.locator('[data-region="APAC"]');
    await apac.click();
    await expect(page.getByTestId('svg-out')).toContainText('typeof className = object');
  });

  test('attribute vs property', async ({ page }) => {
    const input = page.getByTestId('prop-input');
    await input.fill('changed');

    expect(await input.getAttribute('value')).toBe('initial');   // markup
    await expect(input).toHaveValue('changed');                  // live state
  });

  test('read state that lives only on the element object', async ({ page }) => {
    const btn = page.getByTestId('stateful');
    await btn.click();
    await btn.click();

    const state = await btn.evaluate((el) => el.orderState);
    expect(state.name).toBe('picked');
    expect(state.step).toBe(2);
  });
});

test.describe('08 · shadow DOM', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/shadow.html'); });

  test('scope to the host before touching the shadow input', async ({ page }) => {
    await expect(page.getByTestId('shadow-input')).toHaveCount(3);   // one per component

    const backup = page.locator('gym-panel[code="FR-W3"]');
    await backup.getByTestId('shadow-input').fill('NODE-77');
    await backup.getByTestId('shadow-submit').click();

    await expect(page.getByTestId('panel-relay')).toContainText('FR-W3 → "NODE-77"');
  });

  test('chained locators cross three shadow boundaries', async ({ page }) => {
    await page.getByTestId('deep-shadow-input').fill('INNER-1');
    await page.getByTestId('deep-shadow-submit').click();
    await expect(page.getByTestId('nest-out')).toContainText('INNER-1');

    // The same thing from inside evaluate() does not work:
    const found = await page.evaluate(() => document.querySelectorAll('[data-testid="deep-shadow-input"]').length);
    expect(found).toBe(0);
  });

  test('a closed root is unreachable — use the component API', async ({ page }) => {
    await expect(page.getByTestId('sealed-input')).toHaveCount(0);

    const host = page.locator('gym-sealed');
    expect(await host.evaluate((el) => el.shadowRoot)).toBeNull();

    await host.evaluate((el) => el.setCode('OVR-777'));
    expect(await host.evaluate((el) => el.getCode())).toBe('OVR-777');
  });

  test('slotted content stays in the light DOM', async ({ page }) => {
    const slotted = page.getByTestId('slotted-button');
    await slotted.click();
    await expect(page.getByTestId('slot-out')).toContainText('gym-card');
  });

  test('shadow parts are reachable', async ({ page }) => {
    await page.getByTestId('meter-up').click();
    const width = await page.locator('gym-meter [part="fill"]').evaluate((el) => el.style.width);
    expect(width).toBe('84%');
  });

  test('component properties have no attribute mirror', async ({ page }) => {
    const panel = page.locator('gym-panel').first();

    await panel.evaluate((el) => { el.value = 'PRIMARY-01'; });
    expect(await panel.evaluate((el) => el.value)).toBe('PRIMARY-01');
    expect(await panel.getAttribute('value')).toBeNull();

    const history = await panel.evaluate((el) => el.history);
    expect(history).toHaveLength(1);
  });

  test('frame boundary then shadow boundary', async ({ page }) => {
    const frame = page.frameLocator('#shadow-frame');
    await frame.getByTestId('shadow-input').fill('FRAMED');
    await frame.getByTestId('shadow-submit').click();
    await expect(frame.getByTestId('frame-shadow-out')).toContainText('FRAMED');
  });
});

test.describe('09 · overlays and chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/overlays.html');
    const banner = page.getByTestId('cookie-banner');
    if (await banner.isVisible()) await page.getByTestId('cookie-accept').click();
  });

  test('scope Save to the page, not the sticky chrome', async ({ page }) => {
    await page.getByTestId('page-save').click();
    await expect(page.getByTestId('save-out')).toHaveText('saved from page');
  });

  test('dialog Save is not the page Save', async ({ page }) => {
    await page.getByTestId('open-dialog').click();
    const dialog = page.getByRole('dialog', { name: 'Edit invoice' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('dialog-out')).toContainText('saved INV-2201');
  });

  test('Escape closes the dialog', async ({ page }) => {
    await page.getByTestId('open-dialog').click();
    await expect(page.getByTestId('invoice-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-out')).toHaveText('dialog → escape');
  });
});

test.describe('10 · lists that lie', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/lists.html'); });

  test('a far row is missing until the container scrolls', async ({ page }) => {
    await expect(page.locator('[data-ref="SHP-9800"]')).toHaveCount(0);
    await page.getByTestId('virt-jump').click();
    await expect(page.locator('[data-ref="SHP-9800"]')).toBeVisible();
  });

  test('filter remounts a smaller window', async ({ page }) => {
    await page.getByTestId('virt-search').fill('Hamburg');
    await expect(page.getByTestId('virt-out')).toContainText('of ');
    const refs = await page.getByTestId('virt-row').evaluateAll((els) => els.map((e) => e.dataset.ref));
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((r) => r)).toBeTruthy();
  });

  test('skeleton rows reuse virt-row', async ({ page }) => {
    await page.getByTestId('state-load').click();
    await expect(page.getByTestId('state-box').getByTestId('virt-row')).toHaveCount(4);
    await page.getByTestId('state-ready').click();
    await expect(page.getByTestId('state-box')).toContainText('ready');
  });
});

test.describe('11 · network gym', () => {
  test('search hits the local API', async ({ page }) => {
    await page.goto('/pages/network.html');
    await page.getByTestId('net-query').fill('Busan');
    await page.getByTestId('net-go').click();
    await expect(page.getByTestId('net-status')).toContainText('ok count=');
    await expect(page.getByTestId('net-row').first()).toContainText('Busan');
  });

  test('route.fulfill wins if registered before goto', async ({ page }) => {
    await page.route('**/api/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ ref: 'SHP-MOCK', dest: 'Mockport', carrier: 'TestLine', status: 'Hold' }],
          query: 'x',
          count: 1
        })
      });
    });
    await page.goto('/pages/network.html');
    await page.getByTestId('net-go').click();
    await expect(page.getByTestId('net-row')).toHaveCount(1);
    await expect(page.getByTestId('net-row')).toContainText('SHP-MOCK');
  });

  test('mode=error surfaces a 500', async ({ page }) => {
    await page.goto('/pages/network.html');
    await page.getByTestId('net-mode-error').click();
    await expect(page.getByTestId('net-status')).toContainText('error 500');
  });
});

test.describe('12 · auth and tabs', () => {
  test('maker can sign in and see invoices', async ({ page }) => {
    await page.goto('/pages/session.html');
    await page.getByTestId('auth-username').fill('maker');
    await page.getByTestId('auth-password').fill('maker-pass');
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('auth-name')).toHaveText('Priya Shah');
    await expect(page.getByTestId('auth-role')).toHaveText('maker');
    await expect(page.getByTestId('invoice-row').first()).toContainText('INV-');
  });

  test('invoice opens as a popup', async ({ page }) => {
    await page.goto('/pages/session.html');
    await page.getByTestId('auth-username').fill('viewer');
    await page.getByTestId('auth-password').fill('viewer-pass');
    await page.getByTestId('auth-submit').click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByTestId('open-invoice').click();
    const popup = await popupPromise;
    await expect(popup.getByRole('heading', { name: /INV-2201/ })).toBeVisible();
    await popup.getByTestId('invoice-approve').check();
    await popup.getByTestId('invoice-note').click();
    await expect(popup.getByTestId('invoice-out')).toHaveText('note sent');
  });
});

test.describe('13 · design-system widgets', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pages/widgets.html'); });

  test('combobox options live in a portal', async ({ page }) => {
    await page.getByTestId('combo-input').fill('Bus');
    await page.getByRole('option', { name: 'Busan' }).click();
    await expect(page.getByTestId('combo-out')).toHaveText('chose Busan');
  });

  test('remove a chip by its accessible name', async ({ page }) => {
    await page.getByTestId('chip-add-emea').click();
    await page.getByTestId('chip-add-apac').click();
    await page.getByRole('button', { name: 'Remove EMEA' }).click();
    await expect(page.getByTestId('chip-out')).toHaveText('APAC');
  });

  test('wizard state survives the hash', async ({ page }) => {
    await page.getByTestId('wiz-name').fill('Lane desk');
    await page.getByTestId('wiz-next-1').click();
    await expect(page).toHaveURL(/step-2/);
    await page.getByTestId('wiz-lane').fill('LN-9');
    await page.getByTestId('wiz-next-2').click();
    await expect(page.getByTestId('wiz-summary')).toHaveText('Lane desk / LN-9');
    await page.getByTestId('wiz-back-3').click();
    await expect(page.getByTestId('wiz-lane')).toHaveValue('LN-9');
  });
});

test.describe('14 · origins and permissions', () => {
  test('card fields are inside the foreign origin', async ({ page }) => {
    await page.goto('/pages/origins.html');
    const widget = page.frameLocator('[data-testid="pay-frame"]');
    await widget.getByTestId('card-number').fill('4242424242424242');
    await widget.getByTestId('card-exp').fill('08 / 29');
    await widget.getByTestId('card-cvc').fill('123');
    await widget.getByTestId('card-pay').click();
    await expect(page.getByTestId('pay-out')).toContainText('last4=4242');
  });

  test('sandbox ping reaches the parent', async ({ page }) => {
    await page.goto('/pages/origins.html');
    const frame = page.frameLocator('[data-testid="sandbox-frame"]');
    await frame.getByTestId('sandbox-ping').click();
    await expect(page.getByTestId('sandbox-out')).toHaveText('ping');
  });
});
