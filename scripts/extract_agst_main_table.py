"""Extract the preserved AGST 50104 Original_Draft sheet for the web matrix."""

from pathlib import Path
from zipfile import ZipFile
import json
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "coursework/courses/agst-50104/Main_table.xlsx"
OUTPUT = ROOT / "assets/data/agst-50104-main-table.js"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

DESIGNS = [
    {"key": "one-crd", "family": "One Factor Design (Simple Design)", "name": "One Factor CRD", "start": 12, "end": 22},
    {"key": "one-rcbd", "family": "One Factor Design (Simple Design)", "name": "One Factor RCBD", "start": 23, "end": 33},
    {"key": "two-crd", "family": "Factorial Designs", "name": "Two Factors CRD", "start": 34, "end": 44},
    {"key": "two-rcbd", "family": "Factorial Designs", "name": "Two Factors RCBD", "start": 45, "end": 55},
    {"key": "split-crd", "family": "Split-Plot Designs", "name": "Split-Plot CRD", "start": 56, "end": 66},
    {"key": "split-rcbd", "family": "Split-Plot Designs", "name": "Split-plot RCBD", "start": 67, "end": 77},
    {"key": "strip", "family": "Split-Plot Designs", "name": "Strip-plot", "start": 78, "end": 88},
]

# The workbook remains an untouched archive of the original class notes. These
# corrections are deliberately applied only to the web edition so that every
# editorial or technical change is reviewable in version control.
TEXT_CORRECTIONS = {
    "Mathematical Expression of the Model: (Equation)": "Mathematical expression of the model (equation)",
    "Fit the Model: (Code)": "Fit the model (R code)",
    "All treatments levels have the same mean yield.": "All treatment levels have the same mean yield.",
    "At least one treatment level's mean is different from others.": "At least one treatment mean differs from the others.",
    "At least one 𝝉I ≠ 0": "At least one τᵢ ≠ 0.",
    "𝝉1 = 𝝉2 = … = 𝝉i = 0": "τ₁ = τ₂ = … = τₐ = 0.",
    "⍺1 = ⍺2 = … = ⍺i = 0": "α₁ = α₂ = … = αₐ = 0.",
    "At least one ⍺i ≠ 0": "At least one αᵢ ≠ 0.",
    "μ⍺1 = μ⍺2 = … = μ⍺i = 0": "μ_A1 = μ_A2 = … = μ_Aa.",
    "At least one μ⍺i ≠ 0": "Not all factor A marginal means are equal.",
    "𝛾1 = 𝛾2 = … = 𝛾i = 0": "β₁ = β₂ = … = βᵦ = 0.",
    "At least one 𝛾i ≠ 0": "At least one βⱼ ≠ 0.",
    "μ𝛾1 = μ𝛾2 = … = μ𝛾i = 0": "μ_B1 = μ_B2 = … = μ_Bb.",
    "At least one μ𝛾i ≠ 0": "Not all factor B marginal means are equal.",
    "(⍺𝛾)ij = 0 for all i, j.": "(αβ)ᵢⱼ = 0 for every i and j.",
    "At least one (⍺𝛾)ij ≠ 0": "At least one (αβ)ᵢⱼ ≠ 0.",
    "Observed response for treatment 𝑖\n, replicate 𝑗": "Observed response for treatment i and replicate j.",
    "Effect of treatment 𝑖\n (what we want to estimate)": "Effect of treatment i (the estimand of interest).",
    "Effect of factor A with 𝑖 levels\n (what we want to estimate)": "Effect of level i of factor A (an estimand of interest).",
    "Effect of factor B with j levels\n (what we want to estimate)": "Effect of level j of factor B (an estimand of interest).",
    "Effect of Block j\n (what we want to estimate)": "Effect of block j.",
    "Effect of Block k": "Effect of block h.",
    "Random error term ~ N(0, σ2)": "Random error term: ε ~ N(0, σ²).",
    "Within Treatment Var.": "Within-treatment variance",
    "1 < …< a < … < i": "i = 1, …, a",
    "1 < …< b < … < i": "j = 1, …, b",
    "There is no Treatment effect on the response variable.": "There is no treatment effect on the response variable.",
    "There is no Main Effect of Factor ⍺ on the response variable.": "There is no main effect of factor A on the response variable.",
    "At least one level of Factor ⍺ has an effect on the response variable.": "At least one level of factor A affects the response variable.",
    "All levels of Factor ⍺ have the same mean yield.": "All levels of factor A have the same mean yield.",
    "At least one level of Factor ⍺ has a different mean.": "At least one factor A marginal mean differs from the others.",
    "There is no Main Effect of Factor 𝛾 on the response variable.": "There is no main effect of factor B on the response variable.",
    "At least one level of Factor 𝛾 has an effect on the response variable.": "At least one level of factor B affects the response variable.",
    "All levels of Factor 𝛾 have the same mean yield.": "All levels of factor B have the same mean yield.",
    "At least one level of Factor 𝛾 has a different mean.": "At least one factor B marginal mean differs from the others.",
    "Does the effect of one Factor depend on the levels of the other Factor?": "There is no interaction between factors A and B.",
    "Independence ensure plots don't influence each other.": "Independence means that one experimental unit's error does not influence another's.",
    "Randomization ensure that the observations are independent.": "Randomization supports the independence assumption by reducing systematic allocation bias.",
    "Nomality": "Normality",
    "Normal distribution of the residuals ensures F-test is valid (through ANOVA is robust to mild violations with balanced designs)": "The ANOVA F test assumes normally distributed errors.\nWith balanced designs, it is often robust to mild departures from normality.",
    "There is no evidence of the residuals not being normally distributed": "There is insufficient evidence that the residuals depart from normality.",
    "There is no evidence of the residuals being normally distributed": "There is evidence that the residuals depart from normality.",
    "Homocedentacity": "Homoscedasticity",
    "When residuals have constant variance across all treatments, we call it homogenieity of variance. (Equal Variance) Equal Variance prevents treatment comparisons from being biased by different noise levels.": "Homoscedasticity means that the errors have constant variance across treatment groups.\nUnequal variances can distort standard errors and F tests, especially in unbalanced designs.",
    "Residual's (Error) variances σt2 are equal.": "The error variances are equal across groups.",
    "At least one residual's variance σt2 differs from the other residual's variances.": "At least one group has a different error variance.",
    "σ12 = σ22 = … = σt2": "σ₁² = σ₂² = … = σₜ².",
    "At least one residual's variance σk2 ≠ σt2.": "At least one pair of error variances differs: σₖ² ≠ σₜ².",
    "At least one variance σk2 ≠ σt2.": "At least one pair of variances differs: σₖ² ≠ σₜ².",
    "Variances σt2 are equal.": "The group variances are equal.",
    "At least one variance σt2 differs from the others.": "At least one group variance differs from the others.",
    "One-Way Anova": "One-way ANOVA",
    "Two-Way Anova": "Two-way ANOVA",
    "Residual vs Fitted Plot": "Residuals-versus-fitted plot",
    "Scale-Location Plot": "Scale-location plot",
    "Levene’s Test for Equal Variance": "Levene's test for equal variances",
    "anova table on excel": "ANOVA table",
    "Step. 1:": "Step 1:",
    "step 3:": "Step 3:",
    "Treatment Effect is not significant. (No need for further analyses)": "The treatment effect is not statistically significant; no post hoc comparisons are required.",
    "At least one treatment level differs significantly from others": "At least one treatment mean differs significantly from the others.",
    "Treatment Effect is Highly Significant": "The treatment effect is highly statistically significant.",
    "Treatment Explains substantial yield variation": "Treatment explains substantial variation in yield.",
    "p-valueTreatment > ⍺": "p-value for treatment ≥ α",
    "p-valueTreatment < ⍺": "p-value for treatment < α",
    "Lines are non-parallel (diverging) → Suggests interaction. Let’s test it statistically!": "Nonparallel lines suggest a possible interaction.\nConfirm it with the formal interaction test.",
    "when uaing REML": "When using REML:",
    "YOU CAN ONLY COMPAR models that have exacly the same fixed effects": "Use REML likelihood comparisons only for models with the same fixed-effects structure.",
    "that is not a proble is you use ML (Maximum Likelihood": "Use maximum likelihood (ML) when comparing models with different fixed-effects structures.",
    "with Balanced dataset": "With a balanced data set:",
    "REML = ANOVA": "For balanced Gaussian designs, REML variance-component estimates may coincide with classical ANOVA estimates.",
    "Crost vs Nested models ????": "Crossed versus nested random effects",
    "The RCBD randomization in split plot is driven by the constraint.": "In a split-plot RCBD, restricted randomization follows the whole-plot and subplot experimental-unit structure.",
    "Free versions:": "Open-source R option:",
    "lmer": "lmer() function",
    "lme4": "lme4 package",
    "Less biased": "Typically less biased than ML for variance components in small samples",
    "yijk =": "Split-plot model:",
    "mu + Ai + wij + B(ik) + ABik + eijk": "yᵢⱼₖ = μ + αᵢ + wᵢⱼ + βₖ + (αβ)ᵢₖ + εᵢⱼₖ",
    "asreml does only REML": "ASReml-R fits linear mixed models using restricted maximum likelihood (REML).",
    "lmer won't run correctly with m3 <- lmer(yield ~ env + rep + env:rep, data = dat)": "This formula contains only fixed effects:\nm3 <- lm(yield ~ env + rep + env:rep, data = dat)",
    "There is no random effect": "Use lm() because this model has no random-effects term.",
    "it will run in m2 <- lmer(yield ~ env + (1|env:rep), data = dat)": "A mixed model can represent replicate nested within environment:\nm2 <- lmer(yield ~ env + (1 | env:rep), data = dat)",
    'Because in m2 there is no main effect for "rep" then it is a nested model.': "The term (1 | env:rep) specifies a random intercept for replicate within environment.",
    "Dropping Homocedastisity": "Relaxing homoscedasticity",
    "having on the diagonal variances diff from 1 ones": "Allow unequal variances on the covariance matrix diagonal.",
    "Drop the assumption of independence": "Relaxing independence",
    "having on the covariances not = to 0": "Allow nonzero off-diagonal covariances.",
}

CELL_CORRECTIONS = {
    "L4": "yᵢⱼ = μ + τᵢ + εᵢⱼ",
    "W4": "yᵢⱼ = μ + τᵢ + βⱼ + εᵢⱼ",
    "AH4": "yᵢⱼₖ = μ + αᵢ + βⱼ + (αβ)ᵢⱼ + εᵢⱼₖ",
    "AS4": "yₕᵢⱼ = μ + ρₕ + αᵢ + βⱼ + (αβ)ᵢⱼ + εₕᵢⱼ",
    "BD4": "yᵢⱼₖ = μ + αᵢ + wᵢⱼ + βₖ + (αβ)ᵢₖ + εᵢⱼₖ",
    "BO4": "yₕᵢⱼ = μ + ρₕ + αᵢ + (ρα)ₕᵢ + βⱼ + (αβ)ᵢⱼ + εₕᵢⱼ",
    "BZ4": "yₕᵢⱼ = μ + ρₕ + αᵢ + (ρα)ₕᵢ + βⱼ + (ρβ)ₕⱼ + (αβ)ᵢⱼ + εₕᵢⱼ",
    "N13": "model_crd <- aov(yield ~ treatment, data = crd_data)",
    "Y13": "model_rcbd <- aov(yield ~ block + treatment, data = rcbd_data)",
    "AJ13": "model_factorial_crd <- aov(yield ~ factor_a * factor_b, data = factorial_crd_data)",
    "AU13": "model_factorial_rcbd <- aov(yield ~ block + factor_a * factor_b, data = factorial_rcbd_data)",
    "BF13": "model_split_crd <- aov(yield ~ factor_a * factor_b + Error(whole_plot), data = split_crd_data)",
    "BQ13": "model_split_rcbd <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a), data = split_rcbd_data)",
    "CB13": "model_strip <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a) + (1 | block:factor_b), data = strip_data)",
    "AJ14": "summary(model_factorial_crd)",
    "BF14": "summary(model_split_crd)",
    "AP14": "The aov() output reports each error stratum separately.",
    "BL14": "The aov() output reports each error stratum separately.",
    "Y14": "model_rcbd_lmm <- asreml(",
    "AA15": "yield ~ treatment,",
    "AA16": "~ block,",
    "AA17": "rcbd_data",
    "Y70": "model_rcbd <- lm(yield ~ block + treatment, data = rcbd_data)",
    "AJ70": "model_factorial_crd <- lm(yield ~ factor_a * factor_b, data = factorial_crd_data)",
    "AU70": "model_factorial_rcbd <- lm(yield ~ block + factor_a * factor_b, data = factorial_rcbd_data)",
    "BF70": "model_split_crd <- aov(yield ~ factor_a * factor_b + Error(whole_plot), data = split_crd_data)",
    "BQ70": "model_split_rcbd <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a), data = split_rcbd_data)",
    "CB70": "model_strip <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a) + (1 | block:factor_b), data = strip_data)",
    "Y73": "residuals <- resid(model_rcbd)",
    "AJ73": "residuals <- resid(model_factorial_crd)",
    "AU73": "residuals <- resid(model_factorial_rcbd)",
    "BF73": "residuals <- unlist(lapply(model_split_crd, residuals))",
    "BQ73": "residuals <- resid(model_split_rcbd)",
    "CB73": "residuals <- resid(model_strip)",
    "M39": "Main effect of treatment",
    "X39": "Main effect of treatment",
    "AI39": "Main effect of factor A",
    "AT39": "Main effect of factor A",
    "BE39": "Main effect of factor A",
    "BP39": "Main effect of factor A",
    "CA39": "Main effect of factor A",
    "AT103": "Two-way ANOVA",
    "BE103": "Split-plot ANOVA",
    "BP103": "Split-plot ANOVA",
    "CA103": "Strip-plot ANOVA",
    "N106": "model_crd <- aov(yield ~ treatment, data = crd_data)",
    "Y106": "model_rcbd <- aov(yield ~ block + treatment, data = rcbd_data)",
    "AJ106": "model_factorial_crd <- lm(yield ~ factor_a * factor_b, data = factorial_crd_data)",
    "AU106": "model_factorial_rcbd <- lm(yield ~ block + factor_a * factor_b, data = factorial_rcbd_data)",
    "BF106": "model_split_crd <- aov(yield ~ factor_a * factor_b + Error(whole_plot), data = split_crd_data)",
    "BQ106": "model_split_rcbd <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a), data = split_rcbd_data)",
    "CB106": "model_strip <- lmer(yield ~ factor_a * factor_b + (1 | block) + (1 | block:factor_a) + (1 | block:factor_b), data = strip_data)",
    "BE107": "Stratum-specific ANOVA",
    "AJ108": "# Fit the factorial model with interaction\nmodel_factorial_crd <- lm(yield ~ factor_a * factor_b, data = factorial_crd_data)\n\n# Type III tests require appropriate contrast coding\ncar::Anova(model_factorial_crd, type = \"III\")",
    "BF108": "summary(model_split_crd)",
    "Y123": "anova(model_rcbd)",
    "AJ123": "anova(model_factorial_crd)",
    "AU123": "anova(model_factorial_rcbd)",
    "BF123": "summary(model_split_crd)",
    "BQ123": "anova(model_split_rcbd)",
    "CB123": "anova(model_strip)",
    "AT46": "There is no interaction between factors A and B.",
    "BP46": "There is no interaction between factors A and B.",
    "CA46": "There is no interaction between factors A and B.",
    "AT47": "There is an interaction between factors A and B.",
    "BP47": "There is an interaction between factors A and B.",
    "CA47": "There is an interaction between factors A and B.",
    "D171": "Can a constrained design still be randomized? Yes—randomize within the permitted experimental-unit structure.",
}

ANOVA_TABLES = {
    "one-crd": [
        ["", "Treatment", "a − 1", "SS_Treatment", "SS_Treatment / (a − 1)", "MS_Treatment / MS_Error", "P(F₍a−1, a(r−1)₎ ≥ F_obs)"],
        ["", "Error", "a(r − 1)", "SS_Error", "SS_Error / [a(r − 1)]", "—", "—"],
        ["", "Total", "ar − 1", "SS_Total", "—", "—", "—"],
    ],
    "one-rcbd": [
        ["", "Block", "r − 1", "SS_Block", "SS_Block / (r − 1)", "MS_Block / MS_Error", "P(F₍r−1, (r−1)(a−1)₎ ≥ F_obs)"],
        ["", "Treatment", "a − 1", "SS_Treatment", "SS_Treatment / (a − 1)", "MS_Treatment / MS_Error", "P(F₍a−1, (r−1)(a−1)₎ ≥ F_obs)"],
        ["", "Error", "(r − 1)(a − 1)", "SS_Error", "SS_Error / [(r − 1)(a − 1)]", "—", "—"],
        ["", "Total", "ar − 1", "SS_Total", "—", "—", "—"],
    ],
    "two-crd": [
        ["", "Factor A", "a − 1", "SS_A", "SS_A / (a − 1)", "MS_A / MS_Error", "P(F₍a−1, ab(r−1)₎ ≥ F_obs)"],
        ["", "Factor B", "b − 1", "SS_B", "SS_B / (b − 1)", "MS_B / MS_Error", "P(F₍b−1, ab(r−1)₎ ≥ F_obs)"],
        ["", "A × B", "(a − 1)(b − 1)", "SS_AB", "SS_AB / [(a − 1)(b − 1)]", "MS_AB / MS_Error", "P(F₍(a−1)(b−1), ab(r−1)₎ ≥ F_obs)"],
        ["", "Error", "ab(r − 1)", "SS_Error", "SS_Error / [ab(r − 1)]", "—", "—"],
        ["", "Total", "abr − 1", "SS_Total", "—", "—", "—"],
    ],
    "two-rcbd": [
        ["", "Block", "r − 1", "SS_Block", "SS_Block / (r − 1)", "MS_Block / MS_Error", "P(F₍r−1, (r−1)(ab−1)₎ ≥ F_obs)"],
        ["", "Factor A", "a − 1", "SS_A", "SS_A / (a − 1)", "MS_A / MS_Error", "P(F₍a−1, (r−1)(ab−1)₎ ≥ F_obs)"],
        ["", "Factor B", "b − 1", "SS_B", "SS_B / (b − 1)", "MS_B / MS_Error", "P(F₍b−1, (r−1)(ab−1)₎ ≥ F_obs)"],
        ["", "A × B", "(a − 1)(b − 1)", "SS_AB", "SS_AB / [(a − 1)(b − 1)]", "MS_AB / MS_Error", "P(F₍(a−1)(b−1), (r−1)(ab−1)₎ ≥ F_obs)"],
        ["", "Error", "(r − 1)(ab − 1)", "SS_Error", "SS_Error / [(r − 1)(ab − 1)]", "—", "—"],
        ["", "Total", "abr − 1", "SS_Total", "—", "—", "—"],
    ],
    "split-crd": [
        ["Whole plot", "Factor A", "a − 1", "SS_A", "SS_A / (a − 1)", "MS_A / MS_WP Error", "P(F₍a−1, a(r−1)₎ ≥ F_obs)"],
        ["Whole plot", "Whole-plot error", "a(r − 1)", "SS_WP Error", "SS_WP Error / [a(r − 1)]", "—", "—"],
        ["Subplot", "Factor B", "b − 1", "SS_B", "SS_B / (b − 1)", "MS_B / MS_SP Error", "P(F₍b−1, a(r−1)(b−1)₎ ≥ F_obs)"],
        ["Subplot", "A × B", "(a − 1)(b − 1)", "SS_AB", "SS_AB / [(a − 1)(b − 1)]", "MS_AB / MS_SP Error", "P(F₍(a−1)(b−1), a(r−1)(b−1)₎ ≥ F_obs)"],
        ["Subplot", "Subplot error", "a(r − 1)(b − 1)", "SS_SP Error", "SS_SP Error / [a(r − 1)(b − 1)]", "—", "—"],
        ["", "Total", "arb − 1", "SS_Total", "—", "—", "—"],
    ],
    "split-rcbd": [
        ["Whole plot", "Block", "r − 1", "SS_Block", "SS_Block / (r − 1)", "MS_Block / MS_Block×A", "P(F₍r−1, (r−1)(a−1)₎ ≥ F_obs)"],
        ["Whole plot", "Factor A", "a − 1", "SS_A", "SS_A / (a − 1)", "MS_A / MS_Block×A", "P(F₍a−1, (r−1)(a−1)₎ ≥ F_obs)"],
        ["Whole plot", "Block × A (whole-plot error)", "(r − 1)(a − 1)", "SS_Block×A", "SS_Block×A / [(r − 1)(a − 1)]", "—", "—"],
        ["Subplot", "Factor B", "b − 1", "SS_B", "SS_B / (b − 1)", "MS_B / MS_SP Error", "P(F₍b−1, a(r−1)(b−1)₎ ≥ F_obs)"],
        ["Subplot", "A × B", "(a − 1)(b − 1)", "SS_AB", "SS_AB / [(a − 1)(b − 1)]", "MS_AB / MS_SP Error", "P(F₍(a−1)(b−1), a(r−1)(b−1)₎ ≥ F_obs)"],
        ["Subplot", "Subplot error", "a(r − 1)(b − 1)", "SS_SP Error", "SS_SP Error / [a(r − 1)(b − 1)]", "—", "—"],
        ["", "Total", "rab − 1", "SS_Total", "—", "—", "—"],
    ],
    "strip": [
        ["", "Block", "r − 1", "SS_Block", "SS_Block / (r − 1)", "—", "—"],
        ["A strip", "Factor A", "a − 1", "SS_A", "SS_A / (a − 1)", "MS_A / MS_Block×A", "P(F₍a−1, (r−1)(a−1)₎ ≥ F_obs)"],
        ["A strip", "Block × A error", "(r − 1)(a − 1)", "SS_Block×A", "SS_Block×A / [(r − 1)(a − 1)]", "—", "—"],
        ["B strip", "Factor B", "b − 1", "SS_B", "SS_B / (b − 1)", "MS_B / MS_Block×B", "P(F₍b−1, (r−1)(b−1)₎ ≥ F_obs)"],
        ["B strip", "Block × B error", "(r − 1)(b − 1)", "SS_Block×B", "SS_Block×B / [(r − 1)(b − 1)]", "—", "—"],
        ["Intersection", "A × B", "(a − 1)(b − 1)", "SS_AB", "SS_AB / [(a − 1)(b − 1)]", "MS_AB / MS_Residual", "P(F₍(a−1)(b−1), (r−1)(a−1)(b−1)₎ ≥ F_obs)"],
        ["Intersection", "Residual", "(r − 1)(a − 1)(b − 1)", "SS_Residual", "SS_Residual / [(r − 1)(a − 1)(b − 1)]", "—", "—"],
        ["", "Total", "rab − 1", "SS_Total", "—", "—", "—"],
    ],
}


def column_number(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference).group(0)
    number = 0
    for letter in letters:
        number = number * 26 + ord(letter) - 64
    return number


def cell_text(cell: ET.Element) -> str | None:
    inline = cell.find("x:is", NS)
    if inline is not None:
        return "".join(node.text or "" for node in inline.findall(".//x:t", NS))
    value = cell.find("x:v", NS)
    return value.text if value is not None else None


with ZipFile(SOURCE) as workbook:
    sheet = ET.fromstring(workbook.read("xl/worksheets/sheet6.xml"))

rows = []
for row in sheet.findall(".//x:sheetData/x:row", NS):
    source_row = int(row.attrib["r"])
    if source_row < 4:
        continue

    context = []
    design_cells = {design["key"]: [] for design in DESIGNS}
    for cell in row.findall("x:c", NS):
        text = cell_text(cell)
        if text is None or text == "":
            continue
        reference = cell.attrib["r"]
        text = CELL_CORRECTIONS.get(reference, TEXT_CORRECTIONS.get(text.strip(), text.strip()))
        column = column_number(cell.attrib["r"])
        item = {"slot": None, "ref": reference, "text": text}
        if 3 <= column <= 11:
            item["slot"] = column - 3
            context.append(item)
            continue
        for design in DESIGNS:
            if design["start"] <= column <= design["end"]:
                item["slot"] = column - design["start"]
                design_cells[design["key"]].append(item)
                break

    if context or any(design_cells.values()):
        rows.append({"sourceRow": source_row, "context": context, "designs": design_cells})

payload = {
    "sourceSheet": "Original_Draft",
    "contextColumns": 9,
    "designColumns": 11,
    "designs": [{key: value for key, value in design.items() if key not in {"start", "end"}} for design in DESIGNS],
    "anovaTables": ANOVA_TABLES,
    "rows": rows,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(
    "window.AGST_MAIN_TABLE = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
