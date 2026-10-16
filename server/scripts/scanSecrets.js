const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

const allowedPlaceholders = [
  "your-email@gmail.com",
  "your-app-password",
  "your-supabase-anon-key",
  "your-supabase-service-role-key",
  "your-supabase-jwt-secret",
  "postgres.project-ref:password",
];

// Supabase's published demo keys for local stacks (issuer "supabase-demo"),
// used by docker-compose.yml. They only work with the public demo JWT secret.
const supabaseDemoKey = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIi[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/g;

const placeholderValue = /(your[-_]|example|placeholder|replace[-_]with|generated[-_]password|change[-_]?me|xxxx|\*\*\*\*|redacted|required|optional|string|boolean|undefined|process\.env)/i;

// Mirrors the custom rules in /.gitleaks.toml so the check also runs where the
// gitleaks binary is not installed.
const emailPasswordLine = /^[ \t]*[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[ \t]*[:|;,][ \t]*|[ \t]+(?:(?:pass(?:word)?|pwd|pw)[ \t]*[:=]?[ \t]*)?)([^\s@]{6,})[ \t]*$/gim;
const labelledPassword = /\b(?:password|passwd|pwd|app[ _-]?password|smtp[ _-]?pass(?:word)?|email[ _-]?pass)\b["']?[ \t]*[:=][ \t]*["']?([^\s"'#<>${}()[\],]{6,})/gi;
const gmailAppPassword = /(?:pass|pwd|smtp|app)[^\n]{0,30}?\b([a-z]{4} [a-z]{4} [a-z]{4} [a-z]{4})\b/i;
const highEntropyToken = /(?:^|['"`=:\s])([A-Za-z0-9+/_-]{32,}={0,2})(?=$|['"`\s,;])/gm;
const textFile = /(\.(txt|md|csv|json|ya?ml|ini|cfg|conf|toml|env|log|properties)$|(^|[/\\])[^/\\.]+$)/i;
const skippedFile = /((^|[/\\])package-lock\.json$|(^|[/\\])(dist|build|coverage|node_modules)[/\\]|\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|svg|map)$)/i;
// Files whose job is to contain detector patterns and fake samples.
const selfReferentialFiles = new Set([
  "server/scripts/scanSecrets.js",
  "server/test/unit/security-scan.test.js",
  ".gitleaks.toml",
]);

const shannonEntropy = (value) => {
  const counts = new Map();
  for (const char of value) counts.set(char, (counts.get(char) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
};

const lineOf = (text, index) => {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
};

const anyMatch = (pattern, text, accept = () => true) => {
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (accept(match)) return true;
  }
  return false;
};

const detectors = [
  {
    name: "tracked env file",
    test: ({ file }) => /(^|[/\\])\.env($|\.)(?!example$)/i.test(file),
  },
  {
    name: "Supabase service role JWT",
    test: ({ text }) => new RegExp("SUPABASE_SERVICE_ROLE_KEY\\s*=\\s*" + "e" + "yJ", "i").test(text),
  },
  {
    name: "non-placeholder JWT secret",
    test: ({ text }) => /JWT_SECRET\s*=\s*(?!\s*$)(?!your-|change-me|example|placeholder)[^\s#]+/i.test(text),
  },
  {
    name: "non-placeholder email password",
    test: ({ text }) => /EMAIL_PASS\s*=\s*(?!\s*$)(?!your-app-password|example|placeholder)[^\r\n#]+/i.test(text),
  },
  {
    name: "known leaked Gmail app password",
    test: ({ text }) => /wcth\s+vluy\s+roxs\s+dzwt/i.test(text),
  },
  {
    name: "hardcoded Supabase service-role key",
    test: ({ text }) => new RegExp("service[_-]?role[^\"'`\\r\\n]{0,80}" + "e" + "yJ", "i").test(text),
  },
  {
    name: "email:password pair",
    test: ({ text }) => anyMatch(emailPasswordLine, text, (match) => !placeholderValue.test(match[1])),
  },
  {
    name: "literal password in text/config file",
    test: ({ file, text }) =>
      textFile.test(file) &&
      anyMatch(labelledPassword, text, (match) => !placeholderValue.test(match[0]) && shannonEntropy(match[1]) >= 2.8),
  },
  {
    name: "Google app password",
    test: ({ text }) => gmailAppPassword.test(text),
  },
  {
    name: "high-entropy string",
    test: ({ text }) =>
      anyMatch(highEntropyToken, text, (match) => {
        const line = lineOf(text, match.index);
        if (/\b(?:integrity|sha(?:1|256|384|512))[-"':\s]/i.test(line) || /\bdata:image\//i.test(line)) return false;
        return shannonEntropy(match[1]) >= 4.6;
      }),
  },
];

const isAllowedPlaceholder = (text) => allowedPlaceholders.some((placeholder) => text.includes(placeholder));

const scanContent = (file, text) => {
  const normalized = file.replace(/\\/g, "/");
  if (selfReferentialFiles.has(normalized) || skippedFile.test(normalized)) return [];
  if (isAllowedPlaceholder(text) && /env\.example$/i.test(normalized)) return [];
  text = text.replace(supabaseDemoKey, "<supabase-demo-key>");

  return detectors
    .filter((detector) => detector.test({ file: normalized, text }))
    .map((detector) => ({ file: normalized, detector: detector.name }));
};

const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const trackedFiles = () => git(["ls-files"]).split(/\r?\n/).filter(Boolean);
const stagedFiles = () => git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]).split(/\r?\n/).filter(Boolean);

const readTracked = (file) => {
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) return null;
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size > 1024 * 1024) return null;
  return fs.readFileSync(absolute, "utf8");
};

// Pre-commit mode reads the staged blob, not the working copy, so a partially
// staged file is checked exactly as it will be committed.
const readStaged = (file) => {
  const size = Number(git(["cat-file", "-s", `:${file}`]).trim());
  if (size > 1024 * 1024) return null;
  return git(["show", `:${file}`]);
};

const run = ({ staged }) => {
  const findings = [];
  const files = staged ? stagedFiles() : trackedFiles();

  for (const file of files) {
    const text = staged ? readStaged(file) : readTracked(file);
    if (text === null) continue;
    findings.push(...scanContent(file, text));
  }

  if (findings.length) {
    console.error(`Potential secrets found in ${staged ? "staged" : "tracked"} files:`);
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.detector}`);
    }
    process.exit(1);
  }

  console.log(`No obvious ${staged ? "staged" : "tracked"} secrets found.`);
};

const selfTest = () => {
  const samples = [
    ["server/.env", "SUPABASE_SERVICE_ROLE_KEY=" + "e" + "yJabc"],
    ["server/.env", "EMAIL_" + "PASS=" + "wcth" + " vluy roxs dzwt"],
    ["server/src/example.js", "const key = 'service_" + "role " + "e" + "yJabc';"],
    ["users.txt", "someone" + "@iut-dhaka.edu" + ":Tr0ub4dor&3x"],
    ["notes.md", "smtp app pass" + "word: abcd efgh ijkl mnop"],
    ["config.yml", "pass" + "word: Zx9!kq77Lm"],
    ["src/token.js", "const t = '" + "q8Vb3ZpL0rT6yWm2NcX5hJ7sKd1Fg4Ae9Ru" + "';"],
    // A service-role JWT from a real project (issuer "supabase") is still caught.
    ["docker-compose.yml", "SERVICE_ROLE_KEY: " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.x9"],
  ];
  const clean = [
    ["README.md", '{ "email": "student@iut-dhaka.edu", "password": "generated_password" }'],
    ["src/auth.js", "const { email, password } = req.body;"],
    ["package.json", '"integrity": "sha512-' + "q8Vb3ZpL0rT6yWm2NcX5hJ7sKd1Fg4Ae9Ru" + '"'],
    ["docker-compose.yml", "SERVICE_ROLE_KEY: " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"],
  ];

  const missed = samples.filter(([file, text]) => scanContent(file, text).length === 0);
  const falsePositives = clean.filter(([file, text]) => scanContent(file, text).length > 0);
  if (missed.length || falsePositives.length) {
    console.error("Secret scanner self-test failed.", { missed: missed.map(([f]) => f), falsePositives: falsePositives.map(([f]) => f) });
    process.exit(1);
  }
  console.log("Secret scanner self-test passed.");
};

if (require.main === module) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    run({ staged: process.argv.includes("--staged") });
  }
}

module.exports = { scanContent, shannonEntropy };
