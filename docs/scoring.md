# Explainable qualification

Scores are business prioritization rules, not conversion probabilities or machine-learned predictions. No protected characteristics are used. The original inquiry remains unchanged.

| Factor | Rule | Maximum |
| --- | --- | --- |
| Budget fit | ≥₹100,000: 25; ≥₹50,000: 15; positive lower budget: 5; unknown/zero: 0 | 25 |
| Service fit | Selected service belongs to the six-service catalog | 25 |
| Timeline | Inquiry contains explicit day/week/month/quarter/urgent/ASAP language | 15 |
| Completeness | Company, ≥80-character message, and email: 5 each | 15 |
| Purchase intent | Explicit proposal/quote/hire/ready/looking for/need/build/launch language | 20 |

The ₹50,000 reference band is a fictional agency assumption, not market pricing. Keywords are intentionally simple and may misinterpret negation or exploratory language. Human qualification remains necessary.

Missing budget, timeline, and company are shown separately. Two or more missing fields result in **Needs more information**. Otherwise, score ≥ workspace threshold (default 75) is **High priority**, ≥45 is **Medium priority**, and lower is **Low priority**. The threshold is configurable from 50–100. Other weights remain code-configured in this MVP.

Creating or editing a lead recalculates its score. Recalculate Score applies current preferences to an existing record. Updating a workspace threshold does not silently rewrite old qualification snapshots. Automatic task creation is optional, happens once per lead, and remains idempotent even after the task is completed.

Live extraction returns a validated typed object containing explicit facts, evidence quotes, missing details, and uncertainty. It never supplies an arbitrary score. A human can confirm suggested facts in Edit Lead; the same transparent rules then recalculate the score. Demo extraction displays recorded facts and retains the original text without pretending to perform model inference.
