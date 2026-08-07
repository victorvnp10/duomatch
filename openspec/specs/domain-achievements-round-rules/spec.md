# domain-achievements-round-rules Specification

## Purpose

Pure, side-effect-free business rules for evaluating which achievements a couple has newly unlocked and for evaluating cyclical round scoring penalties, so that achievement and round-scoring behavior is a single tested, typed source of truth independent of any datastore or UI framework.

## Requirements

### Requirement: Achievement evaluation

The system SHALL provide a single catalog of achievement definitions, each with a unique id and a pure unlock condition evaluated against a couple's statistics, and SHALL provide a pure function that returns exactly the achievement ids newly unlocked by a given statistics snapshot.

#### Scenario: No thresholds met

- **WHEN** evaluating achievements against a statistics snapshot that meets none of the catalog's unlock conditions
- **THEN** no achievement ids are returned

#### Scenario: Threshold newly met

- **WHEN** evaluating achievements against a statistics snapshot that meets an achievement's unlock condition, and that achievement's id is not already in the couple's current achievements
- **THEN** that achievement's id is returned as newly unlocked

#### Scenario: Already-unlocked achievement is not re-reported

- **WHEN** evaluating achievements against a statistics snapshot that still meets an achievement's unlock condition, but that achievement's id is already present in the couple's current achievements
- **THEN** that achievement's id is not returned again

#### Scenario: Multiple thresholds met at once

- **WHEN** evaluating achievements against a statistics snapshot that meets more than one achievement's unlock condition simultaneously
- **THEN** every newly-met achievement's id is returned

### Requirement: Cyclical round-rule evaluation

The system SHALL provide a pure function that, given an active round's configured minimum-activity and minimum-challenge goals and each partner's counts toward those goals, determines the resulting score adjustments (a penalty transferred from the partner who missed a goal to the partner who met it) and which goals were evaluated, without performing any I/O.

#### Scenario: No active round

- **WHEN** evaluating cyclical rules with no round active on the given date
- **THEN** no evaluation result is produced

#### Scenario: No rules configured on the active round

- **WHEN** the active round has neither a minimum-activities nor a minimum-challenges rule configured
- **THEN** no evaluation result is produced

#### Scenario: Rule not yet due

- **WHEN** a configured rule's evaluation period has not yet elapsed since it was last checked
- **THEN** that rule contributes no score change and is not marked as freshly checked

#### Scenario: One partner meets the goal, the other does not

- **WHEN** a configured rule is due for evaluation and exactly one partner's count meets its goal
- **THEN** the partner who met the goal receives a positive score adjustment equal to the rule's penalty, and the partner who did not receive the equal negative adjustment

#### Scenario: Both partners meet the goal

- **WHEN** a configured rule is due for evaluation and both partners' counts meet its goal
- **THEN** neither partner's score is adjusted for that rule, and the rule is marked as freshly checked

#### Scenario: Neither partner meets the goal

- **WHEN** a configured rule is due for evaluation and neither partner's count meets its goal
- **THEN** neither partner's score is adjusted for that rule, and the rule is marked as freshly checked

#### Scenario: Both goals due with opposite outcomes

- **WHEN** both the minimum-activities and minimum-challenges rules are due for evaluation in the same call, with different partners meeting each goal
- **THEN** the resulting score adjustments for each partner are the sum of both rules' individual adjustments, and both rules are marked as freshly checked
