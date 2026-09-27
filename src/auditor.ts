export interface AuditFinding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  message: string;
  line?: number;
  recommendation: string;
}

export interface AuditResult {
  score: number; // 0 - 100
  passed: boolean;
  totalFindings: number;
  findings: AuditFinding[];
  timestamp: string;
  metadata: {
    language: string;
    linesOfCode: number;
  };
}

export function runSecurityAudit(code: string, language: string = "solidity"): AuditResult {
  const findings: AuditFinding[] = [];
  const lines = code.split("\n");
  const loc = lines.length;

  const patterns = [
    {
      regex: /tx\.origin/i,
      severity: "HIGH" as const,
      category: "Authorization Flaw",
      message: "Usage of tx.origin for authorization is vulnerable to phishing attacks.",
      recommendation: "Use msg.sender instead of tx.origin."
    },
    {
      regex: /selfdestruct\s*\(/i,
      severity: "CRITICAL" as const,
      category: "Dangerous Operation",
      message: "selfdestruct instruction detected. Can lead to permanent contract destruction.",
      recommendation: "Avoid selfdestruct or restrict to multi-sig governance."
    },
    {
      regex: /\bblock\.timestamp\b|\bnow\b/i,
      severity: "LOW" as const,
      category: "Miner Manipulation",
      message: "block.timestamp can be manipulated by miners within small intervals.",
      recommendation: "Do not rely on block.timestamp for critical randomness or exact timing."
    },
    {
      regex: /(?:private[_\s]key|secret[_\s]key|api[_\s]key|token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i,
      severity: "CRITICAL" as const,
      category: "Hardcoded Credential",
      message: "Potential hardcoded private key, secret, or API token detected.",
      recommendation: "Use environment variables or key management services."
    },
    {
      regex: /eval\s*\(|exec\s*\(/i,
      severity: "CRITICAL" as const,
      category: "Arbitrary Code Execution",
      message: "eval() or exec() usage allows arbitrary code execution.",
      recommendation: "Avoid dynamic execution of untrusted input."
    },
    {
      regex: /\.call\{value:/i,
      severity: "HIGH" as const,
      category: "Reentrancy Risk",
      message: "Low-level call with value detected without checks-effects-interactions guard.",
      recommendation: "Ensure ReentrancyGuard is applied and state changes precede the call."
    }
  ];

  lines.forEach((lineText, idx) => {
    for (const pat of patterns) {
      if (pat.regex.test(lineText)) {
        findings.push({
          severity: pat.severity,
          category: pat.category,
          message: pat.message,
          line: idx + 1,
          recommendation: pat.recommendation
        });
      }
    }
  });

  // Calculate score
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "CRITICAL") penalty += 35;
    else if (f.severity === "HIGH") penalty += 20;
    else if (f.severity === "MEDIUM") penalty += 10;
    else if (f.severity === "LOW") penalty += 5;
  }

  const score = Math.max(0, 100 - penalty);
  const hasBlockingFinding = findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH");

  return {
    score,
    passed: score >= 75 && !hasBlockingFinding,
    totalFindings: findings.length,
    findings,
    timestamp: new Date().toISOString(),
    metadata: {
      language,
      linesOfCode: loc
    }
  };
}
