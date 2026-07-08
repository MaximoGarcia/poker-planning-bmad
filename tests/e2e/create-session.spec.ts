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

test('moderator updates the current story and deck for all participants', async ({ browser }) => {
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
  await participantPage.getByLabel('Display name').fill('Ana')
  await participantPage.getByRole('button', { name: 'Join session' }).click()
  await expect(participantPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await moderatorPage.getByLabel('Story identifier').fill('ADR-21')
  await moderatorPage.getByLabel('Brief description').fill('Estimate socket moderation flow')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()

  await expect(moderatorPage.getByRole('heading', { name: 'ADR-21' })).toBeVisible()
  await expect(moderatorPage.getByText('Estimate socket moderation flow')).toBeVisible()
  await expect(participantPage.getByText('ADR-21')).toBeVisible()
  await expect(participantPage.getByText('Estimate socket moderation flow')).toBeVisible()

  await moderatorPage.getByRole('button', { name: 'T-shirt' }).click()

  await expect(moderatorPage.getByText('Deck: T-shirt')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'T-shirt options' })).toBeVisible()
  await expect(participantPage.getByText('XL')).toBeVisible()

  await moderatorContext.close()
  await participantContext.close()
})

test('moderator starts a voting round and participant plus moderator votes stay hidden before reveal', async ({
  browser,
}) => {
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
  await participantPage.getByLabel('Display name').fill('Ana')
  await participantPage.getByRole('button', { name: 'Join session' }).click()
  await expect(participantPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await moderatorPage.getByLabel('Story identifier').fill('ADR-21')
  await moderatorPage.getByLabel('Brief description').fill('Estimate socket moderation flow')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()
  await expect(participantPage.getByText('ADR-21')).toBeVisible()

  await moderatorPage.getByRole('button', { name: 'Start round' }).click()

  await expect(moderatorPage.getByRole('button', { name: 'Round active' })).toBeDisabled()
  await expect(moderatorPage.getByText('Story and deck are locked during an active round.')).toBeVisible()
  await expect(participantPage.getByText('Voting')).toBeVisible()
  await expect(participantPage.getByRole('button', { name: 'Start round' })).toHaveCount(0)

  await expect(moderatorPage.getByRole('group', { name: 'Moderator vote cards' })).toBeVisible()
  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 13' }).click()
  await expect(moderatorPage.getByText('Vote submitted')).toBeVisible()
  await moderatorPage.getByRole('button', { name: 'Change moderator vote to 21' }).click()
  await expect(moderatorPage.getByText('Vote change submitted')).toBeVisible()
  await expect(participantPage.getByText('Vote submitted')).toHaveCount(0)
  await expect(participantPage.getByText('Selected')).toHaveCount(0)
  await expect(participantPage.getByText('Not submitted', { exact: true })).toBeVisible()

  await participantPage.getByRole('button', { name: 'Submit vote 8' }).click()

  await expect(participantPage.getByText('Vote submitted')).toBeVisible()
  await expect(participantPage.getByText('Submitted', { exact: true })).toBeVisible()

  const participantRow = moderatorPage
    .getByRole('list', { name: 'Joined participants' })
    .getByRole('listitem')
    .filter({ hasText: 'Ana' })

  await expect(participantRow).toContainText('Voted')
  await expect(participantRow).not.toContainText('8')

  await participantPage.getByRole('button', { name: 'Change vote to 5' }).click()

  await expect(participantPage.getByText('Vote change submitted')).toBeVisible()
  await expect(participantRow).toContainText('Voted')
  await expect(participantRow).not.toContainText('5')

  await moderatorContext.close()
  await participantContext.close()
})

test('moderator reveals grouped results to voters and non-voters across live session pages', async ({ browser }) => {
  const moderatorContext = await browser.newContext()
  const voterContext = await browser.newContext()
  const outlierContext = await browser.newContext()
  const nonVoterContext = await browser.newContext()
  const moderatorPage = await moderatorContext.newPage()
  const voterPage = await voterContext.newPage()
  const outlierPage = await outlierContext.newPage()
  const nonVoterPage = await nonVoterContext.newPage()

  await moderatorPage.goto('/')
  await moderatorPage.getByLabel('Moderator name').fill('Maxi')
  await moderatorPage.getByRole('button', { name: 'Create session' }).click()
  await expect(moderatorPage).toHaveURL(/\/session\/[A-Z0-9]{4,12}\/moderator$/)

  const roomCodeMatch = moderatorPage.url().match(/\/session\/([A-Z0-9]{4,12})\/moderator$/)
  const roomCode = roomCodeMatch?.[1] ?? ''

  await voterPage.goto('/')
  await voterPage.getByLabel('Room code').fill(roomCode)
  await voterPage.getByLabel('Display name').fill('Ana')
  await voterPage.getByRole('button', { name: 'Join session' }).click()
  await expect(voterPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await outlierPage.goto('/')
  await outlierPage.getByLabel('Room code').fill(roomCode)
  await outlierPage.getByLabel('Display name').fill('Priya')
  await outlierPage.getByRole('button', { name: 'Join session' }).click()
  await expect(outlierPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await nonVoterPage.goto('/')
  await nonVoterPage.getByLabel('Room code').fill(roomCode)
  await nonVoterPage.getByLabel('Display name').fill('Lee')
  await nonVoterPage.getByRole('button', { name: 'Join session' }).click()
  await expect(nonVoterPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await moderatorPage.getByLabel('Story identifier').fill('ADR-31')
  await moderatorPage.getByLabel('Brief description').fill('Reveal active round results')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()
  await expect(voterPage.getByText('ADR-31')).toBeVisible()
  await expect(outlierPage.getByText('ADR-31')).toBeVisible()
  await expect(nonVoterPage.getByText('ADR-31')).toBeVisible()

  await moderatorPage.getByRole('button', { name: 'Start round' }).click()
  await expect(voterPage.getByText('Voting')).toBeVisible()

  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 8' }).click()
  await expect(moderatorPage.getByText('Vote submitted')).toBeVisible()
  await voterPage.getByRole('button', { name: 'Submit vote 8' }).click()
  await expect(voterPage.getByText('Vote submitted')).toBeVisible()
  await outlierPage.getByRole('button', { name: 'Submit vote 5' }).click()
  await expect(outlierPage.getByText('Vote submitted')).toBeVisible()

  const nonVoterRow = moderatorPage
    .getByRole('list', { name: 'Joined participants' })
    .getByRole('listitem')
    .filter({ hasText: 'Lee' })
  await expect(nonVoterRow).toContainText('Not voted')

  await moderatorPage.getByRole('button', { name: 'Reveal results' }).click()

  await expect(moderatorPage.getByLabel('Majority: 2 votes for 8 by Maxi, Ana')).toBeVisible()
  await expect(moderatorPage.getByLabel('Outlier: 1 vote for 5 by Priya')).toBeVisible()
  await expect(voterPage.getByLabel('Majority: 2 votes for 8 by Maxi, Ana')).toBeVisible()
  await expect(voterPage.getByLabel('Outlier: 1 vote for 5 by Priya')).toBeVisible()
  await expect(outlierPage.getByLabel('Majority: 2 votes for 8 by Maxi, Ana')).toBeVisible()
  await expect(outlierPage.getByLabel('Outlier: 1 vote for 5 by Priya')).toBeVisible()
  await expect(nonVoterPage.getByLabel('Majority: 2 votes for 8 by Maxi, Ana')).toBeVisible()
  await expect(nonVoterPage.getByLabel('Outlier: 1 vote for 5 by Priya')).toBeVisible()
  await expect(voterPage.getByText('Lee - Not voted')).toBeVisible()
  await expect(outlierPage.getByText('Lee - Not voted')).toBeVisible()
  await expect(nonVoterPage.getByText('Lee - Not voted')).toBeVisible()
  await expect(voterPage.getByText('Revealed', { exact: true })).toBeVisible()
  await expect(outlierPage.getByText('Revealed', { exact: true })).toBeVisible()
  await expect(nonVoterPage.getByText('Revealed', { exact: true })).toBeVisible()
  await expect(voterPage.getByRole('button', { name: 'Voting unavailable for 13' })).toBeDisabled()
  await expect(outlierPage.getByRole('button', { name: 'Voting unavailable for 8' })).toBeDisabled()
  await expect(nonVoterPage.getByRole('button', { name: 'Voting unavailable for 8' })).toBeDisabled()
  await expect(moderatorPage.getByRole('heading', { name: 'Final estimate' })).toBeVisible()
  await expect(voterPage.getByText(/final estimate/i)).toHaveCount(0)

  await moderatorPage.getByRole('button', { name: 'Record final estimate 8' }).click()

  await expect(moderatorPage.getByText('Recorded estimate: 8')).toBeVisible()
  await expect(
    moderatorPage.getByRole('button', { name: 'Recorded final estimate 8' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(voterPage.getByText('Recorded estimate: 8')).toHaveCount(0)
  await expect(outlierPage.getByText('Recorded estimate: 8')).toHaveCount(0)
  await expect(nonVoterPage.getByText('Recorded estimate: 8')).toHaveCount(0)

  await moderatorContext.close()
  await voterContext.close()
  await outlierContext.close()
  await nonVoterContext.close()
})

test('moderator can reset a revealed round and later advance after recording a final estimate', async ({
  browser,
}) => {
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
  await participantPage.getByLabel('Display name').fill('Ana')
  await participantPage.getByRole('button', { name: 'Join session' }).click()
  await expect(participantPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await moderatorPage.getByLabel('Story identifier').fill('ADR-34')
  await moderatorPage.getByLabel('Brief description').fill('Reset and advance the session flow')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()

  await moderatorPage.getByRole('button', { name: 'Start round' }).click()
  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 8' }).click()
  await participantPage.getByRole('button', { name: 'Submit vote 5' }).click()
  await moderatorPage.getByRole('button', { name: 'Reveal results' }).click()

  await expect(moderatorPage.getByLabel('Majority: 1 vote for 5 by Ana')).toBeVisible()
  await expect(participantPage.getByLabel('Majority: 1 vote for 5 by Ana')).toBeVisible()

  await moderatorPage.getByRole('button', { name: 'Reset round' }).click()

  await expect(moderatorPage.getByText('Story and deck are ready to edit.')).toBeVisible()
  await expect(participantPage.getByText('Waiting')).toBeVisible()
  await expect(moderatorPage.getByLabel('Story identifier')).toHaveValue('ADR-34')
  await expect(moderatorPage.getByText('Deck: Fibonacci')).toBeVisible()
  await expect(moderatorPage.getByLabel('Majority: 1 vote for 5 by Ana')).toHaveCount(0)
  await expect(participantPage.getByLabel('Majority: 1 vote for 5 by Ana')).toHaveCount(0)
  await expect(participantPage.getByText('Selected')).toHaveCount(0)

  await moderatorPage.getByRole('button', { name: 'Start round' }).click()
  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 13' }).click()
  await participantPage.getByRole('button', { name: 'Submit vote 8' }).click()
  await moderatorPage.getByRole('button', { name: 'Reveal results' }).click()
  await moderatorPage.getByRole('button', { name: 'Record final estimate 8' }).click()

  await expect(moderatorPage.getByText('Recorded estimate: 8')).toBeVisible()
  await expect(participantPage.getByText('Recorded estimate: 8')).toHaveCount(0)

  await moderatorPage.getByRole('button', { name: 'Advance to next story' }).click()

  await expect(moderatorPage.getByText('No active story yet')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'No active story yet' })).toBeVisible()
  await expect(moderatorPage.getByText('Deck: Fibonacci')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'Fibonacci options' })).toBeVisible()
  await expect(participantPage.getByText('Recorded estimate: 8')).toHaveCount(0)

  await moderatorContext.close()
  await participantContext.close()
})

test('moderator sees a live estimated stories list that remains moderator-only during the session', async ({
  browser,
}) => {
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
  await participantPage.getByLabel('Display name').fill('Ana')
  await participantPage.getByRole('button', { name: 'Join session' }).click()
  await expect(participantPage).toHaveURL(new RegExp(`/session/${roomCode}$`))

  await expect(moderatorPage.getByRole('heading', { name: 'Estimated stories' })).toBeVisible()
  await expect(moderatorPage.getByText('No estimates recorded yet.')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'Estimated stories' })).toHaveCount(0)

  await moderatorPage.getByLabel('Story identifier').fill('ADR-21')
  await moderatorPage.getByLabel('Brief description').fill('Estimate socket moderation flow')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()
  await moderatorPage.getByRole('button', { name: 'Start round' }).click()
  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 8' }).click()
  await participantPage.getByRole('button', { name: 'Submit vote 5' }).click()
  await moderatorPage.getByRole('button', { name: 'Reveal results' }).click()
  await moderatorPage.getByRole('button', { name: 'Record final estimate 8' }).click()

  const estimatedStoriesList = moderatorPage.getByRole('list', { name: 'Estimated stories list' })
  await expect(estimatedStoriesList).toBeVisible()
  await expect(estimatedStoriesList).toContainText('ADR-21')
  await expect(estimatedStoriesList).toContainText('Estimate socket moderation flow')
  await expect(estimatedStoriesList).toContainText('Fibonacci')
  await expect(estimatedStoriesList).toContainText('8')
  await expect(participantPage.getByRole('heading', { name: 'Estimated stories' })).toHaveCount(0)

  await moderatorPage.getByRole('button', { name: 'Advance to next story' }).click()

  await expect(moderatorPage.getByText('No active story yet')).toBeVisible()
  await expect(estimatedStoriesList).toContainText('ADR-21')

  await moderatorPage.getByLabel('Story identifier').fill('ADR-34')
  await moderatorPage.getByLabel('Brief description').fill('Advance to the next story')
  await moderatorPage.getByRole('button', { name: 'Save story' }).click()
  await moderatorPage.getByRole('button', { name: 'Start round' }).click()
  await moderatorPage.getByRole('button', { name: 'Submit moderator vote 13' }).click()
  await participantPage.getByRole('button', { name: 'Submit vote 8' }).click()
  await moderatorPage.getByRole('button', { name: 'Reveal results' }).click()
  await moderatorPage.getByRole('button', { name: 'Record final estimate 8' }).click()

  await expect(estimatedStoriesList).toContainText('ADR-21')
  await expect(estimatedStoriesList).toContainText('ADR-34')
  await expect(estimatedStoriesList).toContainText('Advance to the next story')
  await expect(estimatedStoriesList).toContainText('Fibonacci')
  await expect(estimatedStoriesList).toContainText('8')
  await expect(participantPage.getByText('ADR-34')).toBeVisible()
  await expect(participantPage.getByRole('heading', { name: 'Estimated stories' })).toHaveCount(0)
  await expect(participantPage.getByRole('list', { name: 'Estimated stories list' })).toHaveCount(0)

  await moderatorContext.close()
  await participantContext.close()
})
