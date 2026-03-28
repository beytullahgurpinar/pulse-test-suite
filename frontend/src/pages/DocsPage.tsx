import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Sheet,
  Chip,
  Divider,
  Stack,
  Table,
} from '@mui/joy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TocItem {
  id: string;
  label: string;
  subsections?: { id: string; label: string }[];
}

const TOC_ITEMS: TocItem[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'getting-started',
    label: 'Getting Started',
    subsections: [
      { id: 'gs-docker', label: 'Docker' },
      { id: 'gs-local', label: 'Local Dev' },
      { id: 'gs-env', label: 'Environment Variables' },
    ],
  },
  { id: 'tests', label: 'Tests' },
  { id: 'assertions', label: 'Assertions' },
  { id: 'flows', label: 'Flows' },
  { id: 'environments', label: 'Environments' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'security', label: 'Security' },
  {
    id: 'mcp-integration',
    label: 'MCP Integration',
    subsections: [
      { id: 'mcp-what', label: 'What is MCP?' },
      { id: 'mcp-key', label: 'Creating a Key' },
      { id: 'mcp-stdio', label: 'Stdio (local)' },
      { id: 'mcp-http', label: 'HTTP (remote)' },
      { id: 'mcp-tools', label: 'Available Tools' },
    ],
  },
  { id: 'user-management', label: 'User Management' },
];

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Typography
      id={id}
      level="h3"
      sx={{
        fontWeight: 800,
        letterSpacing: '-0.03em',
        borderLeft: '3px solid',
        borderImage: 'linear-gradient(180deg, #4c6ef5, #5c7cfa) 1',
        pl: 2,
        mb: 2,
        scrollMarginTop: '80px',
      }}
    >
      {children}
    </Typography>
  );
}

function SubSectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Typography
      id={id}
      level="h4"
      sx={{
        fontWeight: 700,
        mt: 3,
        mb: 1.5,
        scrollMarginTop: '80px',
      }}
    >
      {children}
    </Typography>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'background.level2',
        fontFamily: 'monospace',
        borderRadius: 'md',
        p: 2,
        fontSize: '0.82rem',
        overflowX: 'auto',
        lineHeight: 1.7,
        m: 0,
        whiteSpace: 'pre',
      }}
    >
      {children}
    </Box>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <Chip
      size="sm"
      variant="soft"
      color="neutral"
      sx={{ fontFamily: 'monospace', fontSize: '0.78rem', px: 0.75 }}
    >
      {children}
    </Chip>
  );
}

function SectionDivider() {
  return <Divider sx={{ my: 5, opacity: 0.5 }} />;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function DocsSidebar({ activeId }: { activeId: string }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      component="nav"
      sx={{
        width: 220,
        flexShrink: 0,
        position: 'sticky',
        top: 24,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        display: { xs: 'none', md: 'block' },
        pr: 2,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'background.level3', borderRadius: 4 },
      }}
    >
      <Typography
        level="body-xs"
        fontWeight={700}
        sx={{
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 2,
          color: 'text.tertiary',
        }}
      >
        Contents
      </Typography>

      {TOC_ITEMS.map((item) => {
        const isActive = activeId === item.id || item.subsections?.some((s) => s.id === activeId);
        return (
          <Box key={item.id} sx={{ mb: 0.5 }}>
            <Box
              component="button"
              onClick={() => scrollTo(item.id)}
              sx={{
                all: 'unset',
                display: 'block',
                width: '100%',
                cursor: 'pointer',
                py: 0.5,
                px: 1,
                borderRadius: 'sm',
                fontSize: '0.84rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'primary.500' : 'text.secondary',
                bgcolor: isActive ? 'primary.softBg' : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { color: 'primary.500', bgcolor: 'primary.softBg' },
              }}
            >
              {item.label}
            </Box>
            {item.subsections && (
              <Box sx={{ pl: 2, mt: 0.25 }}>
                {item.subsections.map((sub) => {
                  const subActive = activeId === sub.id;
                  return (
                    <Box
                      key={sub.id}
                      component="button"
                      onClick={() => scrollTo(sub.id)}
                      sx={{
                        all: 'unset',
                        display: 'block',
                        width: '100%',
                        cursor: 'pointer',
                        py: 0.4,
                        px: 1,
                        borderRadius: 'sm',
                        fontSize: '0.78rem',
                        fontWeight: subActive ? 700 : 400,
                        color: subActive ? 'primary.500' : 'text.tertiary',
                        bgcolor: subActive ? 'primary.softBg' : 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': { color: 'primary.500' },
                      }}
                    >
                      {sub.label}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Mobile TOC (collapsible top bar)
// ---------------------------------------------------------------------------

function MobileToc() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
      <Sheet
        variant="outlined"
        sx={{ borderRadius: 'md', overflow: 'hidden' }}
      >
        <Box
          component="button"
          onClick={() => setOpen((v) => !v)}
          sx={{
            all: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            p: 2,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <span>Table of Contents</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
        </Box>
        {open && (
          <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {TOC_ITEMS.map((item) => (
              <Box key={item.id}>
                <Box
                  component="button"
                  onClick={() => scrollTo(item.id)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'primary.500',
                    py: 0.3,
                    display: 'block',
                  }}
                >
                  {item.label}
                </Box>
                {item.subsections?.map((sub) => (
                  <Box
                    key={sub.id}
                    component="button"
                    onClick={() => scrollTo(sub.id)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      color: 'text.tertiary',
                      pl: 2,
                      py: 0.25,
                      display: 'block',
                    }}
                  >
                    {sub.label}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Sheet>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DocsPage() {
  const [activeId, setActiveId] = useState('overview');

  // Intersection observer to highlight active section
  useEffect(() => {
    const allIds: string[] = [];
    TOC_ITEMS.forEach((item) => {
      allIds.push(item.id);
      item.subsections?.forEach((s) => allIds.push(s.id));
    });

    const observers: IntersectionObserver[] = [];

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1f3c 0%, #2d3561 50%, #1a2a4a 100%)',
          py: { xs: 6, md: 9 },
          px: { xs: 3, md: 6 },
          mb: 6,
          borderRadius: { xs: 0, md: 'xl' },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-40%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(76,110,245,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {['Tests', 'Flows', 'Schedules', 'Environments', 'MCP / AI', 'Security'].map((tag) => (
            <Chip
              key={tag}
              size="sm"
              variant="soft"
              sx={{
                bgcolor: 'rgba(76,110,245,0.22)',
                color: '#a5b4fc',
                fontWeight: 600,
                border: '1px solid rgba(165,180,252,0.18)',
              }}
            >
              {tag}
            </Chip>
          ))}
        </Stack>
        <Typography
          level="h1"
          sx={{
            color: '#fff',
            fontWeight: 900,
            fontSize: { xs: '2.2rem', md: '3rem' },
            letterSpacing: '-0.04em',
            mb: 1.5,
          }}
        >
          Documentation
        </Typography>
        <Typography
          level="body-lg"
          sx={{ color: 'rgba(255,255,255,0.65)', maxWidth: 560, lineHeight: 1.7 }}
        >
          Everything you need to set up, configure, and get the most out of{' '}
          <strong style={{ color: '#a5b4fc' }}>Pulse Test Suite</strong> — from running your
          first API test to automating entire workflows with AI.
        </Typography>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column layout */}
      {/* ------------------------------------------------------------------ */}
      <Box
        sx={{
          display: 'flex',
          gap: 6,
          alignItems: 'flex-start',
          px: { xs: 2, md: 4 },
          pb: 12,
        }}
      >
        {/* Sidebar */}
        <DocsSidebar activeId={activeId} />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MobileToc />

          {/* ============================================================ */}
          {/* 1. Overview */}
          {/* ============================================================ */}
          <SectionTitle id="overview">Overview</SectionTitle>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            <strong>Pulse Test Suite</strong> is an open-source, self-hosted API testing platform
            built for engineering teams. Write HTTP tests once, run them on a schedule or on
            demand, chain them into end-to-end flows, and let AI tools drive them directly from
            your editor via the Model Context Protocol. Everything lives inside your own
            infrastructure — no data ever leaves your network.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {[
              { label: 'Tests', color: 'primary' },
              { label: 'Flows', color: 'success' },
              { label: 'Schedules', color: 'warning' },
              { label: 'Environments', color: 'neutral' },
              { label: 'MCP / AI', color: 'danger' },
              { label: 'Security', color: 'neutral' },
            ].map((c) => (
              <Chip key={c.label} color={c.color as any} variant="soft" size="md">
                {c.label}
              </Chip>
            ))}
          </Stack>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 2. Getting Started */}
          {/* ============================================================ */}
          <SectionTitle id="getting-started">Getting Started</SectionTitle>

          <SubSectionTitle id="gs-docker">Docker (recommended)</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            The fastest way to run Pulse Test Suite is with Docker Compose. A single command
            builds and starts the API server, frontend, and a MySQL database. The application
            will be reachable at{' '}
            <InlineCode>http://localhost:8181</InlineCode> once all containers are healthy.
          </Typography>
          <CodeBlock>{`git clone https://github.com/your-org/pulse-test-suite.git
cd pulse-test-suite

# Copy and edit the environment file
cp .env.example .env
# (fill in ENCRYPTION_KEY, JWT_SECRET, GOOGLE_CLIENT_* — see table below)

docker-compose up -d --build`}</CodeBlock>
          <Typography level="body-sm" sx={{ mt: 1.5, color: 'text.tertiary', lineHeight: 1.7 }}>
            The first run compiles the Go binary and the React frontend inside Docker, which takes
            roughly 2–3 minutes. Subsequent starts are instant because the image is cached.
          </Typography>

          <SubSectionTitle id="gs-local">Local Development</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            For a faster iteration cycle you can run the API server and frontend separately.
            Make sure you have <strong>Go 1.22+</strong> and <strong>Node 20+</strong> installed,
            and that a MySQL 8 instance is accessible.
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography level="body-sm" fontWeight={700} sx={{ mb: 1 }}>
                1. Start the API server
              </Typography>
              <CodeBlock>{`# From the project root
go run ./cmd/server`}</CodeBlock>
            </Box>
            <Box>
              <Typography level="body-sm" fontWeight={700} sx={{ mb: 1 }}>
                2. Start the frontend dev server (hot-reload)
              </Typography>
              <CodeBlock>{`cd frontend
npm install
npm run dev
# → http://localhost:5173`}</CodeBlock>
            </Box>
          </Stack>

          <SubSectionTitle id="gs-env">Environment Variables</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            All configuration is done via environment variables (or a <InlineCode>.env</InlineCode>{' '}
            file at the project root). Required variables are marked with *.
          </Typography>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 2 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.2 },
                minWidth: 520,
              }}
            >
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><InlineCode>ENCRYPTION_KEY</InlineCode></td>
                  <td>*</td>
                  <td>32-byte hex key used for AES-256-GCM encryption of secured env vars and snapshots.</td>
                </tr>
                <tr>
                  <td><InlineCode>JWT_SECRET</InlineCode></td>
                  <td>*</td>
                  <td>Secret used to sign and verify JWT access tokens.</td>
                </tr>
                <tr>
                  <td><InlineCode>GOOGLE_CLIENT_ID</InlineCode></td>
                  <td></td>
                  <td>OAuth 2.0 client ID for Google Sign-In. Leave empty to disable Google login.</td>
                </tr>
                <tr>
                  <td><InlineCode>GOOGLE_CLIENT_SECRET</InlineCode></td>
                  <td></td>
                  <td>OAuth 2.0 client secret for Google Sign-In.</td>
                </tr>
                <tr>
                  <td><InlineCode>APP_URL</InlineCode></td>
                  <td>*</td>
                  <td>Public base URL of the application, e.g. <InlineCode>https://pulse.example.com</InlineCode>. Used for OAuth redirect URIs.</td>
                </tr>
                <tr>
                  <td><InlineCode>MYSQL_HOST</InlineCode></td>
                  <td>*</td>
                  <td>MySQL server hostname or IP address.</td>
                </tr>
                <tr>
                  <td><InlineCode>MYSQL_PORT</InlineCode></td>
                  <td></td>
                  <td>MySQL port (default: <InlineCode>3306</InlineCode>).</td>
                </tr>
                <tr>
                  <td><InlineCode>MYSQL_USER</InlineCode></td>
                  <td>*</td>
                  <td>MySQL username.</td>
                </tr>
                <tr>
                  <td><InlineCode>MYSQL_PASSWORD</InlineCode></td>
                  <td>*</td>
                  <td>MySQL password.</td>
                </tr>
                <tr>
                  <td><InlineCode>MYSQL_DATABASE</InlineCode></td>
                  <td>*</td>
                  <td>Name of the MySQL database to use.</td>
                </tr>
                <tr>
                  <td><InlineCode>PORT</InlineCode></td>
                  <td></td>
                  <td>HTTP port the Go server listens on (default: <InlineCode>8181</InlineCode>).</td>
                </tr>
              </tbody>
            </Table>
          </Sheet>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 3. Tests */}
          {/* ============================================================ */}
          <SectionTitle id="tests">Tests</SectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            A <strong>Test</strong> is a single HTTP request paired with a set of assertions and
            optional configuration. Tests belong to a project and can be run manually, on a
            schedule, or as a step in a Flow.
          </Typography>

          <SubSectionTitle id="tests-creating">Creating a Test</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Navigate to <strong>Project → Tests → New Test</strong> and fill in:
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {[
              ['Method', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'],
              ['URL', 'Full URL including protocol, e.g. https://api.example.com/users'],
              ['Headers', 'Key-value pairs added to the request. Supports {{VAR}} placeholders.'],
              ['Body', 'Raw JSON, form-data, or plain text. Supports {{VAR}} placeholders.'],
              ['Timeout', 'Per-request timeout in milliseconds (default: 10 000).'],
            ].map(([field, desc]) => (
              <Box key={field} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Chip size="sm" variant="outlined" color="primary" sx={{ flexShrink: 0, mt: 0.15, fontWeight: 700 }}>
                  {field}
                </Chip>
                <Typography level="body-sm" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {desc}
                </Typography>
              </Box>
            ))}
          </Stack>

          <SubSectionTitle id="tests-placeholders">Dynamic Placeholders</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Use the following built-in placeholders anywhere in the URL, headers, or body of a
            test. They are resolved at runtime — every test run gets fresh values.
          </Typography>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 3 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.2 },
                minWidth: 420,
              }}
            >
              <thead>
                <tr>
                  <th>Placeholder</th>
                  <th>Generates</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['{{guid}}', 'A random UUID v4, e.g. 550e8400-e29b-41d4-a716-446655440000'],
                  ['{{email}}', 'A random valid email address, e.g. rand7f2a@test-pulse.io'],
                  ['{{timestamp}}', 'Current Unix timestamp in seconds'],
                  ['{{name}}', 'A random full name, e.g. "Jordan Blake"'],
                  ['{{phone}}', 'A random E.164 phone number, e.g. +15551234567'],
                ].map(([ph, desc]) => (
                  <tr key={ph}>
                    <td><InlineCode>{ph}</InlineCode></td>
                    <td><Typography level="body-sm" sx={{ color: 'text.secondary' }}>{desc}</Typography></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>

          <SubSectionTitle id="tests-retry">Retry on Failure</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Enable retries per test to handle flaky endpoints. When a test fails, Pulse will
            re-execute it up to the configured number of times before recording a final failure.
            Configure the <InlineCode>Retry Count</InlineCode> (max attempts, 0–5) and{' '}
            <InlineCode>Retry Delay</InlineCode> (pause between attempts in milliseconds).
            Only the last attempt is stored as the canonical result.
          </Typography>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 4. Assertions */}
          {/* ============================================================ */}
          <SectionTitle id="assertions">Assertions</SectionTitle>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            Assertions define what a passing test response looks like. A test passes only when
            every assertion is satisfied. You can add as many assertions as needed and mix
            different types freely.
          </Typography>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 3 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.4, verticalAlign: 'top' },
                minWidth: 600,
              }}
            >
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Checks</th>
                  <th>Operators / Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><InlineCode>status</InlineCode></td>
                  <td>HTTP status code of the response</td>
                  <td>
                    <Typography level="body-sm">
                      Exact match: <InlineCode>200</InlineCode>,{' '}
                      <InlineCode>404</InlineCode>,{' '}
                      <InlineCode>201</InlineCode>
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><InlineCode>json_path</InlineCode></td>
                  <td>Any JSON field in the response body, addressed by JSONPath</td>
                  <td>
                    <Typography level="body-sm" sx={{ lineHeight: 1.9 }}>
                      <InlineCode>eq</InlineCode> <InlineCode>ne</InlineCode>{' '}
                      <InlineCode>contains</InlineCode> <InlineCode>exists</InlineCode>{' '}
                      <InlineCode>not_exists</InlineCode><br />
                      <InlineCode>is_null</InlineCode> <InlineCode>is_not_null</InlineCode>{' '}
                      <InlineCode>is_true</InlineCode> <InlineCode>is_false</InlineCode>
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><InlineCode>response_time</InlineCode></td>
                  <td>End-to-end latency from request send to full body received</td>
                  <td>
                    <Typography level="body-sm" sx={{ lineHeight: 1.9 }}>
                      <InlineCode>lt</InlineCode> <InlineCode>lte</InlineCode>{' '}
                      <InlineCode>gt</InlineCode> <InlineCode>gte</InlineCode><br />
                      Example: response time <InlineCode>lt</InlineCode>{' '}
                      <InlineCode>500</InlineCode> (ms)
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><InlineCode>header</InlineCode></td>
                  <td>Any response header by name (case-insensitive)</td>
                  <td>
                    <Typography level="body-sm" sx={{ lineHeight: 1.9 }}>
                      <InlineCode>eq</InlineCode> <InlineCode>ne</InlineCode>{' '}
                      <InlineCode>contains</InlineCode> <InlineCode>exists</InlineCode><br />
                      Example: <InlineCode>content-type</InlineCode>{' '}
                      <InlineCode>contains</InlineCode>{' '}
                      <InlineCode>application/json</InlineCode>
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><InlineCode>json_schema</InlineCode></td>
                  <td>Full response body structure validated against a JSON Schema</td>
                  <td>
                    <Typography level="body-sm">
                      JSON Schema Draft 7. The entire response body must be valid against the
                      provided schema document.
                    </Typography>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Sheet>

          <Sheet
            variant="soft"
            color="primary"
            sx={{ borderRadius: 'md', p: 2, mb: 2 }}
          >
            <Typography level="body-sm" sx={{ lineHeight: 1.8 }}>
              <strong>Tip:</strong> In the <em>Expected Value</em> field of any assertion you can
              reference environment variables or values extracted by a Flow step using the{' '}
              <InlineCode>{'{{VAR}}'}</InlineCode> syntax. For example, if a flow extracted a
              user ID into <InlineCode>{'{{USER_ID}}'}</InlineCode>, an assertion can compare a
              JSON field against <InlineCode>{'{{USER_ID}}'}</InlineCode> at runtime.
            </Typography>
          </Sheet>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 5. Flows */}
          {/* ============================================================ */}
          <SectionTitle id="flows">Flows</SectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            <strong>Flows</strong> let you orchestrate multiple HTTP requests as an ordered
            sequence. Each step is a full test (with its own assertions), and data from one step
            is automatically injected into later steps via extracted variables.
          </Typography>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Common use cases include:
          </Typography>
          <Stack component="ul" spacing={1} sx={{ pl: 3, mb: 3 }}>
            {[
              'Authenticate → receive token → call protected endpoints with that token.',
              'Create a resource → retrieve it → update it → delete it, asserting consistency at each step.',
              'Run a checkout flow end-to-end: cart → payment → order confirmation.',
            ].map((item) => (
              <Typography key={item} component="li" level="body-md" sx={{ lineHeight: 1.7 }}>
                {item}
              </Typography>
            ))}
          </Stack>

          <SubSectionTitle id="flows-extraction">Data Extraction</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            In each step you can define one or more <strong>extractions</strong>. An extraction
            uses a JSONPath expression to pull a value from the response body and store it under
            a variable name for subsequent steps.
          </Typography>
          <CodeBlock>{`# Example extraction config in a step
JSONPath:       response.data.token
Variable name:  TOKEN

# The extracted value is now available as {{TOKEN}} in all later steps:
# Header:  Authorization: Bearer {{TOKEN}}`}</CodeBlock>
          <Typography level="body-md" sx={{ mt: 2, lineHeight: 1.8 }}>
            If any step's assertions fail, the flow halts immediately and reports the failed step.
            Steps after the failure are not executed, keeping your data consistent.
          </Typography>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 6. Environments */}
          {/* ============================================================ */}
          <SectionTitle id="environments">Environments</SectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Environments are named sets of key-value variables scoped to a project. They allow
            you to maintain the same tests across multiple deployment targets without duplicating
            them.
          </Typography>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            Typical environment names: <InlineCode>Dev</InlineCode>,{' '}
            <InlineCode>Staging</InlineCode>, <InlineCode>Production</InlineCode>. Any{' '}
            <InlineCode>{'{{variable}}'}</InlineCode> reference in a test's URL, headers, or body
            is resolved against the active environment at run time.
          </Typography>

          <SubSectionTitle id="env-secured">Secured Variables</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Mark a variable as <strong>Secured</strong> to encrypt its value with AES-256-GCM
            before writing it to the database. Secured values are displayed as{' '}
            <InlineCode>secret:***</InlineCode> in the UI and are never returned by the API in
            plain text. They are decrypted only in-memory at request execution time.
          </Typography>

          <SubSectionTitle id="env-operations">Managing Environments</SubSectionTitle>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {[
              ['Duplicate', 'Clone an environment with all its variables to quickly create a new target.'],
              ['Set as Default', 'Mark one environment as the default so new test runs use it automatically.'],
              ['Delete', 'Permanently removes the environment and all its variables. Schedules referencing it will fall back to "no environment".'],
            ].map(([op, desc]) => (
              <Box key={op} sx={{ display: 'flex', gap: 2 }}>
                <Chip size="sm" variant="solid" color="neutral" sx={{ flexShrink: 0, mt: 0.1 }}>
                  {op}
                </Chip>
                <Typography level="body-sm" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {desc}
                </Typography>
              </Box>
            ))}
          </Stack>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 7. Schedules */}
          {/* ============================================================ */}
          <SectionTitle id="schedules">Schedules</SectionTitle>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            Schedules trigger test runs automatically at a fixed interval. They run in the
            background on the server — no browser needs to be open.
          </Typography>

          <SubSectionTitle id="sched-targets">Targets</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            A schedule can target one of three things:
          </Typography>
          <Stack spacing={1} sx={{ mb: 3 }}>
            {[
              ['Single Test', 'Run exactly one test by ID. Useful for health-check endpoints.'],
              ['All Project Tests', 'Run every test in the project sequentially. Results are grouped under one schedule run.'],
              ['Flow', 'Run an entire Flow. Each step is executed in order with data extraction.'],
            ].map(([target, desc]) => (
              <Box key={target} sx={{ display: 'flex', gap: 2 }}>
                <Chip size="sm" variant="soft" color="warning" sx={{ flexShrink: 0, mt: 0.1 }}>
                  {target}
                </Chip>
                <Typography level="body-sm" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {desc}
                </Typography>
              </Box>
            ))}
          </Stack>

          <SubSectionTitle id="sched-webhooks">Webhook Notifications</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Each schedule can be configured with a webhook URL that receives a POST request after
            every run. The payload includes the overall pass/fail status, duration, and a link to
            the full result. Works out-of-the-box with:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {['Slack Incoming Webhooks', 'Microsoft Teams', 'Custom endpoint'].map((item) => (
              <Chip key={item} size="sm" variant="outlined" color="neutral">{item}</Chip>
            ))}
          </Stack>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 8. Security */}
          {/* ============================================================ */}
          <SectionTitle id="security">Security</SectionTitle>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            Pulse Test Suite is designed with security in mind. Below is a summary of the
            protections built into the platform.
          </Typography>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 3 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.4, verticalAlign: 'top' },
                minWidth: 480,
              }}
            >
              <thead>
                <tr>
                  <th>Protection</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><Chip size="sm" variant="soft" color="success">AES-256-GCM Encryption</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      Secured environment variables and request/response snapshots are encrypted
                      at rest using AES-256-GCM with a key derived from{' '}
                      <InlineCode>ENCRYPTION_KEY</InlineCode>. Each ciphertext includes a random
                      96-bit nonce — no two encryptions of the same value produce the same bytes.
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><Chip size="sm" variant="soft" color="warning">PCI Masking</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      Before any request or response snapshot is written to the database, Pulse
                      automatically scans all string fields for patterns matching payment card
                      numbers (PAN) and CVV/CVC codes. Detected values are replaced with masked
                      representations (e.g. <InlineCode>****-****-****-1234</InlineCode>) and
                      are never stored in plain text.
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><Chip size="sm" variant="soft" color="danger">SSRF Protection</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      All outbound request URLs are validated before execution. Requests targeting
                      private IP ranges (RFC 1918), loopback addresses (<InlineCode>127.0.0.0/8</InlineCode>),
                      link-local (<InlineCode>169.254.0.0/16</InlineCode>), and cloud metadata
                      endpoints are blocked to prevent server-side request forgery.
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><Chip size="sm" variant="soft" color="primary">JWT Authentication</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      All API endpoints (except <InlineCode>/login</InlineCode> and{' '}
                      <InlineCode>/auth/google</InlineCode>) require a valid JWT in the{' '}
                      <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode> header. Tokens
                      are signed with <InlineCode>JWT_SECRET</InlineCode> and expire after 24 hours.
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><Chip size="sm" variant="soft" color="neutral">Google OAuth</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      When <InlineCode>GOOGLE_CLIENT_ID</InlineCode> is set, users can sign in
                      with their Google accounts. On first login, an account is automatically
                      created. The first user in a workspace is granted the{' '}
                      <InlineCode>admin</InlineCode> role.
                    </Typography>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Sheet>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 9. MCP Integration */}
          {/* ============================================================ */}
          <SectionTitle id="mcp-integration">MCP Integration</SectionTitle>

          <SubSectionTitle id="mcp-what">What is MCP?</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            The <strong>Model Context Protocol (MCP)</strong> is an open standard that allows AI
            assistants — such as Claude — to call external tools and services through a
            structured, typed interface. Pulse Test Suite implements an MCP server that exposes
            your tests and flows as callable tools.
          </Typography>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            This means you can ask Claude (from Claude Code, Claude Desktop, or any MCP-compatible
            client) to run your tests, inspect results, or execute an entire flow — without ever
            leaving your editor.
          </Typography>

          <SubSectionTitle id="mcp-key">Creating a Key</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            MCP Keys are project-scoped API keys used to authenticate MCP requests. To create one:
          </Typography>
          <Stack component="ol" spacing={1} sx={{ pl: 3, mb: 2 }}>
            {[
              'Open your project in the Pulse web UI.',
              'Navigate to MCP Keys in the left sidebar.',
              'Click New Key, give it a name, and optionally select a default environment.',
              'The key is shown exactly once in the format below — copy it immediately.',
            ].map((step, i) => (
              <Typography key={i} component="li" level="body-md" sx={{ lineHeight: 1.7 }}>
                {step}
              </Typography>
            ))}
          </Stack>
          <CodeBlock>{`zts_<40 hex characters>
# example: zts_a3f8c2d1e4b5a6f7c8d9e0f1a2b3c4d5e6f7a8b9`}</CodeBlock>
          <Typography level="body-sm" sx={{ mt: 1.5, color: 'text.tertiary' }}>
            Keys cannot be retrieved after creation. If a key is lost, delete it and generate a
            new one. Keys can be revoked at any time from the MCP Keys page.
          </Typography>

          <SubSectionTitle id="mcp-stdio">Stdio Transport (local binary)</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            The <InlineCode>zotlo-mcp</InlineCode> binary speaks the MCP stdio transport protocol.
            Download the binary for your platform from the releases page, then run it with your key:
          </Typography>
          <CodeBlock>{`MCP_KEY=zts_yourkey ./zotlo-mcp`}</CodeBlock>
          <Typography level="body-md" sx={{ mt: 2, mb: 1.5, lineHeight: 1.8 }}>
            To register it with <strong>Claude Code</strong> so it is available in every session:
          </Typography>
          <CodeBlock>{`claude mcp add zotlo ./zotlo-mcp --env MCP_KEY=zts_yourkey`}</CodeBlock>
          <Typography level="body-sm" sx={{ mt: 1.5, color: 'text.tertiary', lineHeight: 1.7 }}>
            The binary connects directly to the Pulse server at the URL embedded in the key.
            No additional network configuration is required when running locally.
          </Typography>

          <SubSectionTitle id="mcp-http">HTTP Transport (remote server)</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            The Pulse API server itself exposes the MCP protocol at the{' '}
            <InlineCode>/mcp</InlineCode> endpoint over HTTP with SSE. This lets remote AI agents
            connect without a locally installed binary. Authentication is passed via the{' '}
            <InlineCode>key</InlineCode> query parameter.
          </Typography>
          <Typography level="body-md" sx={{ mb: 1.5, fontWeight: 600 }}>
            Step 1 — Initialize the session:
          </Typography>
          <CodeBlock>{`curl -X POST "https://your-server.com/mcp?key=zts_yourkey" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0"}}}' \\
  -D -

# The response headers contain:
# Mcp-Session-Id: <session-uuid>`}</CodeBlock>
          <Typography level="body-md" sx={{ mt: 2, mb: 1.5, fontWeight: 600 }}>
            Step 2 — Call a tool (use the session ID from Step 1):
          </Typography>
          <CodeBlock>{`curl -X POST "https://your-server.com/mcp?key=zts_yourkey" \\
  -H "Content-Type: application/json" \\
  -H "Mcp-Session-Id: <session-uuid>" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"run_all_tests","arguments":{}}}'`}</CodeBlock>
          <Typography level="body-md" sx={{ mt: 2, mb: 1.5, lineHeight: 1.8 }}>
            To register the HTTP server with <strong>Claude Code</strong> (add to your{' '}
            <InlineCode>claude_desktop_config.json</InlineCode> or Claude Code settings):
          </Typography>
          <CodeBlock>{`{
  "mcpServers": {
    "pulse": {
      "type": "http",
      "url": "https://your-server.com/mcp?key=zts_yourkey"
    }
  }
}`}</CodeBlock>

          <SubSectionTitle id="mcp-tools">Available Tools</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            The following tools are exposed via the MCP server. Each tool is scoped to the project
            associated with the MCP key used for authentication.
          </Typography>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 2 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.4, verticalAlign: 'top' },
                minWidth: 480,
              }}
            >
              <thead>
                <tr>
                  <th>Tool Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['list_tests', 'List all tests in the project. Returns test IDs, names, methods, and URLs.'],
                  ['run_test', 'Run a single test by ID. Executes the request immediately and returns the full result including status, duration, and assertion outcomes.'],
                  ['run_all_tests', 'Run every test in the project sequentially. Returns a pass/fail summary with counts and per-test status.'],
                  ['list_flows', 'List all flows in the project. Returns flow IDs, names, and step counts.'],
                  ['run_flow', 'Run a flow by ID step-by-step. Returns the result for each step including extracted variable values, making it easy for the AI to reason about the data.'],
                ].map(([name, desc]) => (
                  <tr key={name}>
                    <td><InlineCode>{name}</InlineCode></td>
                    <td><Typography level="body-sm" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{desc}</Typography></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>

          <SectionDivider />

          {/* ============================================================ */}
          {/* 10. User Management */}
          {/* ============================================================ */}
          <SectionTitle id="user-management">User Management</SectionTitle>
          <Typography level="body-md" sx={{ mb: 3, lineHeight: 1.8 }}>
            Pulse Test Suite uses a <strong>workspace</strong> model. Every user and project
            belongs to exactly one workspace. Data from different workspaces is fully isolated —
            users in workspace A cannot see any projects, tests, or results from workspace B.
          </Typography>

          <SubSectionTitle id="um-roles">Roles</SubSectionTitle>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 3 }}>
            <Table
              size="sm"
              sx={{
                '& thead th': { fontWeight: 700, bgcolor: 'background.level1' },
                '& td, & th': { px: 2, py: 1.2 },
                minWidth: 420,
              }}
            >
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><Chip size="sm" variant="solid" color="danger">admin</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      Full access: manage projects, tests, flows, schedules, environments, MCP
                      keys, and users. Can invite new members, change roles, and delete any
                      resource in the workspace.
                    </Typography>
                  </td>
                </tr>
                <tr>
                  <td><Chip size="sm" variant="solid" color="primary">editor</Chip></td>
                  <td>
                    <Typography level="body-sm">
                      Can create, edit, and run tests, flows, schedules, and environments within
                      any project they have access to. Cannot manage users or workspace settings.
                    </Typography>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Sheet>

          <SubSectionTitle id="um-first-user">First User = Admin</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            When a new workspace is created (i.e. the very first user signs in via Google OAuth),
            that user is automatically granted the <InlineCode>admin</InlineCode> role. There is
            always at least one admin in a workspace; the last admin cannot be demoted.
          </Typography>

          <SubSectionTitle id="um-invites">Inviting Team Members</SubSectionTitle>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Admins can invite new members from the <strong>Users</strong> page. Pulse generates a
            single-use invite link that is valid for 48 hours. Send the link to your colleague —
            when they open it, they are prompted to sign in with Google and their account is
            automatically added to the workspace with the <InlineCode>editor</InlineCode> role.
          </Typography>
          <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.8 }}>
            Invite links expire after a single use or after 48 hours, whichever comes first. If a
            link expires, the admin can generate a new one from the Users page at any time.
          </Typography>

          <SectionDivider />

          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              Pulse Test Suite — Documentation — Last updated March 2026
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
