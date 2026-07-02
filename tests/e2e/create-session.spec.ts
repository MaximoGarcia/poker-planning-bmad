import { expect, test } from '@playwright/test'

test('moderator creates a session and lands in the empty moderator room', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'ADR Buddy' })).toBeVisible()
  await page.getByLabel('Moderator name').fill('Maxi')
  await page.getByRole('button', { name: 'Create session' }).click()

  await expect(page).toHaveURL(/\/session\/[A-Z0-9]{4,12}\/moderator$/)

  const roomCodeMatch = page.url().match(/\/session\/([A-Z0-9]{4,12})\/moderator$/)
  const roomCode = roomCodeMatch?.[1] ?? ''

  await expect(page.getByRole('heading', { name: 'Moderator room' })).toBeVisible()
  await expect(page.getByText(roomCode)).toBeVisible()
  await expect(page.getByText('No active story yet')).toBeVisible()

  const tokenKey = `adr-buddy:moderator-token:${roomCode}`
  const sessionToken = await page.evaluate((key) => window.sessionStorage.getItem(key), tokenKey)
  const localToken = await page.evaluate((key) => window.localStorage.getItem(key), tokenKey)

  expect(sessionToken).toMatch(/^[A-Za-z0-9_-]{32,}$/)
  expect(localToken).toBeNull()
})

test('participant joins a session with a room code and display name', async ({ browser }) => {
  const moderatorContext = await browser.newContext()
  const participantContext = await browser.newContext()
  const moderatorPage = await moderatorContext.newPage()
  const participantPage = await participantContext.newPage()

  await moderatorPage.goto('/')
  await moderatorPage.getByLabel('Moderator name').fill('Maxi')
  await moderatorPage.getByRole('button', { name: 'Create session' }).click()
  await expect(moderatorPage).toHaveURL(/\/session\/[A-Z0-9]{4,12}\/moderator$/)

  const roomCodeMatch = moderatorPage.url().match(/\/session\/([A-Z0-9]{4,12})\/moderator$/)
  const roomCode = roomCodeMatch?.[1] ?? ''

  await participantPage.goto('/')
  await participantPage.getByLabel('Room code').fill(roomCode)
  await participantPage.getByLabel('Display name').fill('Maxi')
  await participantPage.getByRole('button', { name: 'Join session' }).click()

  await expect(participantPage).toHaveURL(new RegExp(`/session/${roomCode}$`))
  const joinedParticipant = moderatorPage
    .getByRole('list', { name: 'Joined participants' })
    .getByRole('listitem')
    .filter({ hasText: 'Maxi (2)' })

  await expect(joinedParticipant).toBeVisible()
  await expect(joinedParticipant).toContainText('Not voted')
  await expect(joinedParticipant).toContainText('Joined')
  await expect(participantPage.getByRole('heading', { name: 'Participant room' })).toBeVisible()
  await expect(participantPage.getByText(roomCode)).toBeVisible()
  await expect(participantPage.getByText('Maxi (2)')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'No active story yet' })).toBeVisible()
  await expect(participantPage.getByRole('button', { name: /Copy room code/i })).toHaveCount(0)

  const storageState = await participantPage.evaluate((code) => {
    const sessionEntries = Object.entries(window.sessionStorage).filter(([key]) =>
      key.startsWith(`adr-buddy:participant-token:${code}:`),
    )

    return {
      sessionEntries,
      localLength: window.localStorage.length,
    }
  }, roomCode)

  expect(storageState.sessionEntries).toHaveLength(1)
  expect(storageState.sessionEntries[0][1]).toMatch(/^[A-Za-z0-9_-]{32,}$/)
  expect(storageState.localLength).toBe(0)

  await moderatorContext.close()
  await participantContext.close()
})
