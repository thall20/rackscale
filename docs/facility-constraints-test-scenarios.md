# Facility Constraints — QA Test Scenarios

These scenarios are used to verify that the Facility Constraints calculation engine, result display, and comparison page behave correctly. All expected outputs are derived from the live `calculateScenario` engine.

---

## Scenario 1: Good Facility Fit

A standard mid-density air-cooled build with comfortable floor space and proper aisle spacing. Expected to produce a clean facility review with no risk flags.

### Inputs

| Field | Value |
|---|---|
| Rack Count | 80 |
| kW per Rack | 15 |
| Growth Buffer | 20% |
| Redundancy | N+1 |
| Cooling Type | Air |
| Cost per MW | $8,500,000 |
| Cost per Rack | $12,000 |
| Facility Constraints | Enabled |
| Sqft per Floor | 12,000 |
| Floor Level | 1 |
| Floors Used | 1 |
| Flooring Type | Slab |
| Server Spacing | 4 ft |
| Ceiling Height | 14 ft |

### Expected Outputs

| Metric | Expected Value |
|---|---|
| Total MW | 1.80 MW |
| Cooling Tons | ~409 TR |
| Estimated Cost | $16,260,000 |
| Risk Level | Valid Design |
| Design Health Score | 100 / 100 |
| Total Available Sqft | 12,000 sqft |
| Estimated Rack Footprint | 3,280 sqft |
| Space Utilization | 27.3% |
| Physical Fit Status | **Good Fit** |
| Facility Risk Messages | None |

### What to verify

- Physical Fit Status shows "Good Fit" in green on the Results page.
- Facility Constraints Review section shows 0 risk flags and the green confirmation banner: "No major facility constraint risks identified in the preliminary review."
- Dashboard "Facility Risks" KPI does **not** increment for this scenario.
- Comparison page: this scenario wins on space utilization against Scenario 2.

---

## Scenario 2: Tight High-Density Fit

A high-density hybrid-cooled build on an upper floor with raised flooring and tight aisle spacing. Expected to surface multiple facility risk flags and a reduced health score.

### Inputs

| Field | Value |
|---|---|
| Rack Count | 150 |
| kW per Rack | 35 |
| Growth Buffer | 15% |
| Redundancy | N+1 |
| Cooling Type | Hybrid |
| Cost per MW | $9,000,000 |
| Cost per Rack | $14,000 |
| Facility Constraints | Enabled |
| Sqft per Floor | 8,000 |
| Floor Level | 2 |
| Floors Used | 1 |
| Flooring Type | Raised Floor |
| Server Spacing | 2.5 ft |
| Ceiling Height | 11 ft |

### Expected Outputs

| Metric | Expected Value |
|---|---|
| Total MW | 7.55 MW |
| Cooling Tons | ~1,717 TR |
| Estimated Cost | $70,050,000 |
| Risk Level | Medium Risk |
| Design Health Score | 45 / 100 |
| Total Available Sqft | 8,000 sqft |
| Estimated Rack Footprint | 5,250 sqft |
| Space Utilization | 65.6% |
| Physical Fit Status | **Review Recommended** |
| Facility Risk Messages | 4 |

### Expected facility risk messages

1. `[warning]` Spacing Risk — server spacing below 3 ft threshold.
2. `[warning]` Cooling Risk — ceiling height (11 ft) below 12 ft with high-density racks (35 kW).
3. `[warning]` Flooring Risk — raised floor with racks exceeding 30 kW.
4. `[warning]` Structural Review — upper-floor (level 2) deployment with racks exceeding 30 kW.

### What to verify

- Physical Fit Status shows "Review Recommended" in amber on the Results page.
- Facility risk flags appear in the amber alert box with individual bullet indicators.
- Dashboard "Facility Risks" KPI **increments by 1** for this scenario.
- Dashboard "High-Risk" KPI does **not** increment (Risk Level is Medium Risk, not High Risk).
- Comparison page: Scenario 2 loses on spacing, ceiling height, and facility risk count vs Scenario 1.

---

## Scenario 3: AI Liquid Cooling Build

A large liquid-cooled build across two floors with 2N redundancy and high-density racks on slab flooring. Expected to flag a slab structural review while producing a generally valid design at high cost.

### Inputs

| Field | Value |
|---|---|
| Rack Count | 120 |
| kW per Rack | 60 |
| Growth Buffer | 25% |
| Redundancy | 2N |
| Cooling Type | Liquid |
| Cost per MW | $11,000,000 |
| Cost per Rack | $18,000 |
| Facility Constraints | Enabled |
| Sqft per Floor | 15,000 |
| Floor Level | 1 |
| Floors Used | 2 |
| Flooring Type | Slab |
| Server Spacing | 4 ft |
| Ceiling Height | 16 ft |

### Expected Outputs

| Metric | Expected Value |
|---|---|
| Total MW | 18.00 MW |
| Cooling Tons | ~2,559 TR |
| Estimated Cost | $200,160,000 |
| Risk Level | Valid Design |
| Design Health Score | 80 / 100 |
| Total Available Sqft | 30,000 sqft |
| Estimated Rack Footprint | 4,920 sqft |
| Space Utilization | 16.4% |
| Physical Fit Status | **Review Recommended** |
| Facility Risk Messages | 1 |

### Expected facility risk message

1. `[warning]` Structural Review — high-density rack loads (60 kW) on slab flooring.

### What to verify

- Physical Fit Status shows "Review Recommended" in amber despite Risk Level being "Valid Design" — the facility layer adds its own review flag independently of the core risk engine.
- Design Health Score of 80 reflects the 2N redundancy deduction (−10) and slab structural deduction (−10).
- Dashboard "Facility Risks" KPI **increments by 1** for this scenario.
- Comparison page: Scenario 3 wins on available sqft and space utilization vs Scenario 2, but loses on cost and cooling load.

---

## Cross-scenario comparison notes

| | Scenario 1 | Scenario 2 | Scenario 3 |
|---|---|---|---|
| Physical Fit | Good Fit | Review Recommended | Review Recommended |
| Risk Level | Valid Design | Medium Risk | Valid Design |
| Health Score | 100 | 45 | 80 |
| Facility Risk Flags | 0 | 4 | 1 |
| Space Utilization | 27.3% | 65.6% | 16.4% |
| Est. Cost | $16.3M | $70.1M | $200.2M |

When comparing Scenario 1 vs Scenario 2 in the comparison page, Scenario 1 should win on: lower space utilization, higher server spacing, higher ceiling height, fewer facility risks, better physical fit, lower risk level, higher health score, and lower cost.

---

*All values computed from the live `calculateScenario` engine. Re-run verification if engine logic changes.*
