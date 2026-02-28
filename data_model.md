# Data Schema

## User

| Field          | Type                       | Notes                                                           |
| -------------- | -------------------------- | --------------------------------------------------------------- |
| id             | uuid (PK)                  |                                                                 |
| chosen_name    | str                        |                                                                 |
| last_name      | str                        |                                                                 |
| phone_number   | str                        |                                                                 |
| date_of_birth  | date                       | used for age matching                                           |
| gender         | enum('Male','Female','Non-Binary') \| null | user's own gender; used by discover filter       |
| role           | enum('dater', 'winger')    | set at signup; 'winger' skips DatingProfile creation           |
| created_at     | timestamp                  |                                                                 |
| _...auth data_ |                            | from Supabase                                                   |

---

## DatingProfile

| Field                | Type                                          | Notes                                           |
| -------------------- | --------------------------------------------- | ----------------------------------------------- |
| id                   | uuid (PK)                                     |                                                 |
| user_id              | uuid (FK → User, unique)                      | no reverse FK on User                           |
| bio                  | str \| null                                   |                                                 |
| interested_gender    | array of enum['Male', 'Female', 'Non-Binary'] |                                                 |
| age_from             | int                                           |                                                 |
| age_to               | int \| null                                   |                                                 |
| religion             | enum                                          |                                                 |
| religious_preference | enum \| null                                  |                                                 |
| interests            | array of enum[]                               |                                                 |
| city                 | enum                                          | supported cities only (expand as rollout grows)              |
| is_active            | bool                                          | default true; hides profile when false                       |
| dating_status        | enum('open', 'break', 'winging')              | user-controlled; shown on profile; default 'open'            |
| created_at           | timestamp                                     |                                                              |
| updated_at           | timestamp                                     |                                                              |

---

## ProfilePhoto

| Field             | Type                      | Notes                                                          |
| ----------------- | ------------------------- | -------------------------------------------------------------- |
| id                | uuid (PK)                 |                                                                |
| dating_profile_id | uuid (FK → DatingProfile) |                                                                |
| suggester_id      | uuid (FK → User) \| null  | null = self-uploaded; set when a wingperson suggests the photo |
| storage_url       | str                       | bucket-relative path (e.g. `{user_id}/{photo_id}.jpg`)         |
| display_order     | int                       |                                                                |
| approved_at       | timestamp \| null         | null = pending approval by profile owner                       |
| created_at        | timestamp                 |                                                                |

---

## PromptTemplate

Predefined questions users can choose from.

| Field    | Type      | Notes |
| -------- | --------- | ----- |
| id       | uuid (PK) |       |
| question | str       |       |

## ProfilePrompt

A profile's chosen prompt + their answer.

| Field              | Type                       | Notes |
| ------------------ | -------------------------- | ----- |
| id                 | uuid (PK)                  |       |
| dating_profile_id  | uuid (FK → DatingProfile)  |       |
| prompt_template_id | uuid (FK → PromptTemplate) |       |
| answer             | str                        |       |
| created_at         | timestamp                  |       |

## PromptResponse

Someone sending a message in response to a prompt (e.g. Hinge-style comment).

| Field             | Type                      | Notes                                                       |
| ----------------- | ------------------------- | ----------------------------------------------------------- |
| id                | uuid (PK)                 |                                                             |
| user_id           | uuid (FK → User)          | person responding                                           |
| profile_prompt_id | uuid (FK → ProfilePrompt) | prompt being responded to                                   |
| message           | str                       |                                                             |
| is_approved       | bool                      | default false; profile owner must approve before it's shown |
| created_at        | timestamp                 |                                                             |

---

## Contact

Represents a dater → winger relationship. Direction is always dater-initiated.

| Field             | Type                                 | Notes                                                                   |
| ----------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| id                | uuid (PK)                            |                                                                         |
| user_id           | uuid (FK → User)                     | the dater (inviter)                                                     |
| phone_number      | str                                  | used to send the invite SMS                                             |
| winger_id         | uuid (FK → User) \| null             | set once invitee joins and accepts; null while pending                  |
| wingperson_status | enum('invited', 'active', 'removed') | default 'invited'                                                       |
| created_at        | timestamp                            |                                                                         |

Query patterns:
- "My wingpeople" → `user_id = me AND status = active`
- "You're winging for" → `winger_id = me AND status = active`
- "Pending invitations" → `winger_id = me AND status = invited`

---

## Decision

Covers direct swipes and wingperson suggestions. A mutual 'approved' pair creates a Match.

| Field        | Type                                 | Notes                                                           |
| ------------ | ------------------------------------ | --------------------------------------------------------------- |
| id           | uuid (PK)                            |                                                                 |
| actor_id     | uuid (FK → User)                     | the dater making (or being prompted to make) the decision      |
| recipient_id | uuid (FK → User)                     | person being decided on                                         |
| decision     | enum('approved', 'declined') \| null | null = wingperson suggestion not yet acted on by the dater      |
| suggested_by | uuid (FK → User) \| null             | set when a wingperson created this row on the dater's behalf    |
| note         | str \| null                          | optional message from the wingperson; shown in the Discover card|
| created_at   | timestamp                            |                                                                 |

## Match

Created when actor→recipient and recipient→actor both have decision = 'approved'.

| Field      | Type             | Notes |
| ---------- | ---------------- | ----- |
| id         | uuid (PK)        |       |
| user_a_id  | uuid (FK → User) |       |
| user_b_id  | uuid (FK → User) |       |
| created_at | timestamp        |       |

---

## Message

| Field      | Type              | Notes         |
| ---------- | ----------------- | ------------- |
| id         | uuid (PK)         |               |
| match_id   | uuid (FK → Match) |               |
| sender_id  | uuid (FK → User)  |               |
| body       | str               |               |
| is_read    | bool              | default false |
| created_at | timestamp         |               |
