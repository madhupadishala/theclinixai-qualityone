# Sprint 3 — Assessment + Qualification

## Objective
Turn training completion into evidence-based qualification.

## Evidence classes
1. Knowledge assessment — objective questions scored by the platform.
2. Practical/OJT observation — supervised task evidence evaluated by an assessor.
3. SME sign-off — final competency authorization tied to the qualification state.

## Qualification rule
A learner becomes `QUALIFIED` only when every configured requirement for the curriculum is satisfied. Example for Literature Screening:
- training curriculum complete;
- knowledge assessment >= 80%;
- practical quality score >= 95%;
- minimum 20 supervised items/cases;
- SME sign-off recorded.

Until all required evidence exists the qualification remains `IN_PROGRESS`. A failed threshold results in `NOT_STARTED`/`IN_PROGRESS`, never a silent qualification.

## Regulated evidence principles
- assessment attempts are retained;
- answers are stored separately from question definitions;
- score and pass/fail are persisted;
- practical observations identify assessor, date, sample count, score and notes;
- SME sign-off generates an electronic signature against the qualification evaluation;
- qualification transitions generate audit events;
- tenant boundaries apply to every service operation.

## Sprint 3 permissions
- assessments.read
- assessments.manage
- assessments.attempt
- practical.record
- qualification.read
- qualification.evaluate
- qualification.signoff
