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
