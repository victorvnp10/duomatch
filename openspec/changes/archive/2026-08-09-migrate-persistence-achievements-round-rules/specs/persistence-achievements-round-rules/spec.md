## Purpose

End-to-end behavior for evaluating a couple's achievements and cyclical round-rule score adjustments against data stored in Postgres, and durably persisting the results, so the domain rules in `domain-achievements-round-rules` operate on real couple data instead of Firestore.

## ADDED Requirements

### Requirement: Achievement stats sourced from stored couple data

The system SHALL derive a couple's achievement statistics from that couple's stored activities, rewards, wishlist items, and aggregate counters, and SHALL pass the result to the existing achievement-evaluation rule unchanged.

#### Scenario: Stats reflect stored records

- **WHEN** achievement evaluation runs for a couple with stored activities, rewards, and wishlist items
- **THEN** the computed statistics reflect exactly those stored records, with no data from any other couple included

#### Scenario: Couple with no activity yet

- **WHEN** achievement evaluation runs for a couple with no stored activities, rewards, or wishlist items
- **THEN** the computed statistics represent zero/empty values and evaluation proceeds without error

### Requirement: Newly unlocked achievements are persisted exactly once

The system SHALL persist each achievement id returned by the domain evaluation as newly unlocked for that couple, and SHALL NOT persist an achievement id that is already recorded as unlocked for that couple.

#### Scenario: First time a threshold is met

- **WHEN** evaluation determines an achievement is newly unlocked for a couple
- **THEN** that achievement id is recorded as unlocked for that couple, associated with the date it was unlocked

#### Scenario: Re-running evaluation after nothing changed

- **WHEN** evaluation runs again for a couple whose stored data has not changed since the last run
- **THEN** no new achievement records are written

### Requirement: Round-rule evaluation sourced from the couple's active round

The system SHALL load a couple's currently active round (if any) and its rule-check state from storage, evaluate it using the existing cyclical round-rule domain logic, and SHALL NOT evaluate a round that is not active on the evaluation date.

#### Scenario: Couple has no active round

- **WHEN** round-rule evaluation runs for a couple with no round active on the evaluation date
- **THEN** no score adjustment is computed or persisted

#### Scenario: Active round with a rule due

- **WHEN** round-rule evaluation runs for a couple with an active round whose minimum-activities or minimum-challenges rule is due
- **THEN** the resulting score adjustment and the rule's updated last-checked date are persisted for that round

### Requirement: Round-rule score adjustments are applied exactly once per due period

The system SHALL apply a computed score adjustment to each partner's stored score and update the rule's last-checked date in the same persisted operation, such that a rule already marked as checked for its current period is not evaluated again until its next period is due.

#### Scenario: Rule already checked for its current period

- **WHEN** round-rule evaluation runs for a round whose rule's last-checked date shows it was already evaluated for the current period
- **THEN** no additional score adjustment is applied for that rule

#### Scenario: Partial failure does not apply a partial adjustment

- **WHEN** persisting a computed score adjustment fails partway through
- **THEN** neither partner's score reflects a partial adjustment for that evaluation

### Requirement: Couple data isolation

The system SHALL restrict read and write access to a couple's activities, rewards, wishlist items, rounds, and achievement records to the two members of that couple.

#### Scenario: Member of a different couple attempts access

- **WHEN** a user who is not one of the two members of a couple attempts to read or write that couple's stored achievement or round-rule data
- **THEN** the access is denied
