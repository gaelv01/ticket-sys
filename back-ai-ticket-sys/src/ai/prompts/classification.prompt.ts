export function buildClassificationPrompt(
  title: string,
  description: string,
): string {
  return `You are an IT incident classifier for a ticket management system. Analyze the incident and respond ONLY with a single JSON object — no markdown, no code fences, no commentary.

INCIDENT:
Title: ${title}
Description: ${description}

REQUIRED JSON SCHEMA:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "CORRECTIVE" | "PREVENTIVE",
  "impact": "HIGH" | "MEDIUM" | "LOW",
  "category": "PRODUCTION" | "TECHNICAL" | "ADMINISTRATIVE" | "INFRASTRUCTURE" | "OTHER",
  "confidence": <number between 0 and 1>
}

CLASSIFICATION GUIDELINES:

Severity (urgency):
- CRITICAL: production down, business-blocking, immediate action required
- HIGH: errors affecting work, system unstable, important features broken
- MEDIUM: degraded but workable, intermittent issues
- LOW: minor issues, cosmetic problems, non-urgent requests

Type (nature of work):
- CORRECTIVE: something is broken, reactive fix
- PREVENTIVE: proactive maintenance, planned improvement

Impact (reach):
- HIGH: production environment or many users affected
- MEDIUM: a team, department, or several users
- LOW: a single user or limited scope

Category (system area):
- PRODUCTION: live production, customer-facing
- TECHNICAL: code, APIs, applications
- INFRASTRUCTURE: network, VPN, cloud, hardware
- ADMINISTRATIVE: accounts, permissions, licenses, access
- OTHER: anything else

Confidence: how sure you are (0.0 = guessing, 1.0 = certain).

Respond with the JSON object only.`;
}