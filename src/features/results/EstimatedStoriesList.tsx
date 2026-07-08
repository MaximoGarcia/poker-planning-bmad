import type { ElementType } from 'react'
import type { SessionSnapshot } from '@shared/contracts/snapshots'

interface EstimatedStoriesListProps {
  headingLevel?: 2 | 3
  snapshot: SessionSnapshot
}

export function EstimatedStoriesList({
  headingLevel = 2,
  snapshot,
}: EstimatedStoriesListProps) {
  const Heading = `h${headingLevel}` as ElementType
  const estimatedStories = snapshot.estimatedStories ?? []

  return (
    <section className="estimated-stories" aria-labelledby="estimated-stories-title">
      <Heading id="estimated-stories-title">Estimated stories</Heading>
      {estimatedStories.length === 0 ? (
        <p className="estimated-stories-empty">No estimates recorded yet.</p>
      ) : (
        <ul aria-label="Estimated stories list" className="estimated-stories-list">
          {estimatedStories.map((estimatedStory) => (
            <li className="estimated-stories-item" key={estimatedStory.storyId}>
              <dl className="estimated-story-fields">
                <div className="estimated-story-field">
                  <dt>Story identifier</dt>
                  <dd>{estimatedStory.storyId}</dd>
                </div>
                <div className="estimated-story-field">
                  <dt>Brief description</dt>
                  <dd>{estimatedStory.title}</dd>
                </div>
                <div className="estimated-story-field">
                  <dt>Deck</dt>
                  <dd>{estimatedStory.deck.label}</dd>
                </div>
                <div className="estimated-story-field">
                  <dt>Final estimate</dt>
                  <dd>{estimatedStory.finalEstimate}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
