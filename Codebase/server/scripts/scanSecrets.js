const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const allowedPlaceholders = [
  "your-email@gmail.com",
  "your-app-password",
  "your-supabase-anon-key",
  "your-supabase-service-role-key",
  "your-supabase-jwt-secret",
  "postgres.project-ref:password",
];

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
];

const isAllowedPlaceholder = (text) => allowedPlaceholders.some((placeholder) => text.includes(placeholder));

const scanContent = (file, text) => {
  if (isAllowedPlaceholder(text) && /env\.example$/i.test(file)) return [];

  return detectors
    .filter((detector) => detector.test({ file, text }))
    .map((detector) => ({ file, detector: detector.name }));
};

const trackedFiles = () =>
  execFileSync("git", ["ls-files"], {
    cwd: path.resolve(__dirname, "../../.."),
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);

const run = () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const findings = [];

  for (const file of trackedFiles()) {
    const absolute = path.join(repoRoot, file);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > 1024 * 1024) continue;

    const text = fs.readFileSync(absolute, "utf8");
    findings.push(...scanContent(file, text));
  }

  if (findings.length) {
    console.error("Potential secrets found in tracked files:");
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.detector}`);
    }
    process.exit(1);
  }

  console.log("No obvious tracked env secrets found.");
};

const selfTest = () => {
  const samples = [
    ["server/.env", "SUPABASE_SERVICE_ROLE_KEY=" + "e" + "yJabc"],
    ["server/.env", "EMAIL_" + "PASS=" + "wcth" + " vluy roxs dzwt"],
    ["server/src/example.js", "const key = 'service_" + "role " + "e" + "yJabc';"],
  ];

  const detected = samples.every(([file, text]) => scanContent(file, text).length > 0);
  if (!detected) {
    console.error("Secret scanner self-test failed.");
    process.exit(1);
  }
  console.log("Secret scanner self-test passed.");
};

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  run();
}
