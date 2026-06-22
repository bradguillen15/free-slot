import {
  test,
  expect,
  signUp,
  serviceClient,
  seedGuest,
  readGuestScheduleBlocks,
  readGuestActivities,
} from './fixtures/auth';

/**
 * Cloud migration — the guest→cloud import (`migrateGuestToCloud`). Seed guest
 * data in localStorage, sign up (which surfaces the migrate dialog), choose
 * "Import", and assert the rows land in Postgres for the new user and the guest
 * copy is cleared.
 */
test.describe('cloud guest→cloud migration', () => {
  test("imports seeded guest data into the user's account", async ({
    page,
  }) => {
    await seedGuest(page, {
      scheduleBlocks: [
        {
          id: 'g1',
          name: 'Guest work',
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: [1, 2, 3, 4, 5],
        },
      ],
      activities: [
        { id: 'a1', name: 'Guest reading', target_hours_per_week: 2 },
      ],
    });

    // Guest data is present, so signup opens the migrate dialog instead of navigating.
    const { userId } = await signUp(page, { expectMigrateDialog: true });
    await page.getByTestId('migrate-import').click();

    // After a successful import the dialog closes and the app navigates away from /auth.
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), {
      timeout: 20_000,
    });

    const svc = serviceClient();
    await expect
      .poll(async () => {
        const { data } = await svc
          .from('schedule_blocks')
          .select('name')
          .eq('user_id', userId);
        return (data ?? []).map(b => (b as { name: string }).name);
      })
      .toContain('Guest work');

    const { data: acts } = await svc
      .from('activities')
      .select('name')
      .eq('user_id', userId);
    expect((acts ?? []).map(a => (a as { name: string }).name)).toContain(
      'Guest reading',
    );

    // The guest copy is destroyed only after a fully successful migration.
    expect(await readGuestScheduleBlocks(page)).toHaveLength(0);
    expect(await readGuestActivities(page)).toHaveLength(0);
  });

  test('shows migrated data on first render without a manual reload', async ({
    page,
  }) => {
    await seedGuest(page, {
      scheduleBlocks: [
        {
          id: 'g1',
          name: 'Imported block',
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: [1, 2, 3, 4, 5],
        },
      ],
    });

    const { userId } = await signUp(page, { expectMigrateDialog: true });
    await page.getByTestId('migrate-import').click();

    // Navigation is deferred until migration + cache invalidation settle; a fresh
    // signup lands on the onboarding flow, whose step-1 ScheduleEditor lists blocks.
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });

    // Find the new cloud id for the imported block.
    const svc = serviceClient();
    let blockId = '';
    await expect
      .poll(async () => {
        const { data } = await svc
          .from('schedule_blocks')
          .select('id,name')
          .eq('user_id', userId);
        const row = (data ?? []).find(
          b => (b as { name: string }).name === 'Imported block',
        ) as { id: string } | undefined;
        blockId = row?.id ?? '';
        return blockId;
      })
      .not.toBe('');

    // First authenticated render — the migrated block must already show, with NO page.reload().
    await expect(page.getByTestId(`schedule-name-${blockId}`)).toHaveValue(
      'Imported block',
    );
  });

  test('a signup with no guest data lands clean — no migrate dialog, no phantom rows', async ({
    page,
  }) => {
    // No seedGuest(): a brand-new visitor with empty localStorage. The migrate
    // dialog must never appear, and the account must hold only the trigger-seeded
    // defaults (zero schedule blocks / time logs).
    const { userId } = await signUp(page);

    await expect(page.getByTestId('migrate-import')).toHaveCount(0);

    const svc = serviceClient();
    const { data: blocks } = await svc
      .from('schedule_blocks')
      .select('id')
      .eq('user_id', userId);
    expect(blocks ?? []).toHaveLength(0);
    const { data: logs } = await svc
      .from('time_logs')
      .select('id')
      .eq('user_id', userId);
    expect(logs ?? []).toHaveLength(0);
  });

  test('choosing Start fresh discards guest data and starts an empty account', async ({
    page,
  }) => {
    await seedGuest(page, {
      scheduleBlocks: [
        {
          id: 'g1',
          name: 'Discarded block',
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: [1, 2, 3, 4, 5],
        },
      ],
    });

    const { userId } = await signUp(page, { expectMigrateDialog: true });
    await page.getByTestId('migrate-start-fresh').click();

    // Start fresh clears the guest copy and continues into the app.
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), {
      timeout: 20_000,
    });

    // Guest localStorage is wiped, nothing was imported into the account...
    expect(await readGuestScheduleBlocks(page)).toHaveLength(0);
    const svc = serviceClient();
    const { data: blocks } = await svc
      .from('schedule_blocks')
      .select('id')
      .eq('user_id', userId);
    expect(blocks ?? []).toHaveLength(0);

    // ...and revisiting /auth does not re-prompt the migrate dialog.
    await page.goto('/auth');
    await expect(page.getByTestId('migrate-import')).toHaveCount(0);
  });
});
