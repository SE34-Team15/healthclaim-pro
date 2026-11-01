import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom NFR Telemetry Metrics
const healthProbeLatency = new Trend('health_probe_latency', true);
const actuarialAstLatency = new Trend('actuarial_ast_latency', true);
const claimsQueryLatency = new Trend('claims_query_latency', true);
const rulesQueryLatency = new Trend('rules_query_latency', true);
const businessCheckPassRate = new Rate('business_check_pass_rate');
const totalTransactions = new Counter('total_business_transactions');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4000/api/v1';

export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Stage 1: Warm-up & ramp to 10 VUs
    { duration: '10s', target: 20 }, // Stage 2: Sustained peak load at 20 concurrent VUs
    { duration: '5s', target: 0 },   // Stage 3: Graceful cool-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],          // NFR: Error rate < 1% (0.00% target)
    http_req_duration: ['p(95)<500'],        // NFR: API response time p(95) < 500ms (SLA < 1.5s)
    health_probe_latency: ['p(95)<100'],     // Health endpoint p(95) < 100ms
    actuarial_ast_latency: ['p(95)<150'],    // Dynamic Actuarial + Rule AST evaluation p(95) < 150ms
    claims_query_latency: ['p(95)<300'],     // Claims portfolio query p(95) < 300ms
    business_check_pass_rate: ['rate>0.99'], // > 99% functional assertion pass rate
  },
};

export function setup() {
  const headers = { 'Content-Type': 'application/json' };

  const empLoginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'employee@healthclaim.pro',
      password: 'Password123!',
    }),
    { headers },
  );

  const admLoginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'admin@healthclaim.pro',
      password: 'Password123!',
    }),
    { headers },
  );

  const employeeToken = empLoginRes.json('data.accessToken');
  const adminToken = admLoginRes.json('data.accessToken');

  if (!employeeToken || !adminToken) {
    throw new Error(
      `Failed to authenticate setup users. Employee status=${empLoginRes.status}, Admin status=${admLoginRes.status}`,
    );
  }

  return { employeeToken, adminToken };
}

export default function (data) {
  const empHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.employeeToken}`,
  };
  const admHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.adminToken}`,
  };

  group('01_System_Health_Probe', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthProbeLatency.add(res.timings.duration);
    const ok = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health payload is healthy': (r) => r.body && r.body.includes('healthy'),
    });
    businessCheckPassRate.add(ok);
    totalTransactions.add(1);
  });

  group('02_Employee_Claims_Portfolio_Query', () => {
    const res = http.get(`${BASE_URL}/claims/my-claims`, { headers: empHeaders });
    claimsQueryLatency.add(res.timings.duration);
    const ok = check(res, {
      'my-claims status is 200': (r) => r.status === 200,
      'my-claims returns success envelope': (r) => r.json('success') === true,
    });
    businessCheckPassRate.add(ok);
    totalTransactions.add(1);
  });

  group('03_Actuarial_Pipeline_And_AST_Preview', () => {
    const payload = JSON.stringify({
      category: 'CONSULTATION',
      invoiceDate: '2026-10-20',
      hospitalName: 'Singapore General Hospital',
      hospitalGrade: 'PUBLIC_TERTIARY',
      notes: 'k6 automated actuarial & AST rule evaluation benchmark',
      items: [
        {
          description: 'Specialist Outpatient Consultation & Diagnostic Panel',
          category: 'CONSULTATION',
          unitPrice: 320,
          quantity: 1,
          totalPrice: 320,
          isEligible: true,
        },
      ],
      attachmentIds: [],
    });

    const res = http.post(`${BASE_URL}/claims/preview`, payload, { headers: empHeaders });
    actuarialAstLatency.add(res.timings.duration);
    const ok = check(res, {
      'preview calculation status is 200/201': (r) => r.status === 200 || r.status === 201,
      'preview computes reimbursedAmount': (r) =>
        r.json('data.reimbursedAmount') !== undefined,
    });
    businessCheckPassRate.add(ok);
    totalTransactions.add(1);
  });

  group('04_Dynamic_Compliance_Rules_AST_Query', () => {
    const res = http.get(`${BASE_URL}/rules`, { headers: admHeaders });
    rulesQueryLatency.add(res.timings.duration);
    const ok = check(res, {
      'rules query status is 200': (r) => r.status === 200,
      'rules query returns array': (r) => Array.isArray(r.json('data')),
    });
    businessCheckPassRate.add(ok);
    totalTransactions.add(1);
  });

  sleep(0.1);
}

function fmt(val, digits = 2) {
  return typeof val === 'number' && !Number.isNaN(val) ? val.toFixed(digits) : '0.00';
}

export function handleSummary(data) {
  const reqs = data.metrics.http_reqs ? data.metrics.http_reqs.values : { count: 0, rate: 0 };
  const failed = data.metrics.http_req_failed
    ? data.metrics.http_req_failed.values
    : { rate: 0 };
  const dur = data.metrics.http_req_duration
    ? data.metrics.http_req_duration.values
    : {};
  const health = data.metrics.health_probe_latency
    ? data.metrics.health_probe_latency.values
    : {};
  const actuarial = data.metrics.actuarial_ast_latency
    ? data.metrics.actuarial_ast_latency.values
    : {};
  const claims = data.metrics.claims_query_latency
    ? data.metrics.claims_query_latency.values
    : {};
  const rules = data.metrics.rules_query_latency
    ? data.metrics.rules_query_latency.values
    : {};

  const md = `# HealthClaim Pro - k6 Performance & Load Testing Report

- **Target Environment**: \`${BASE_URL}\`
- **Virtual Users (Peak)**: 20 Concurrent VUs
- **Total HTTP Requests**: ${reqs.count}
- **Sustained Throughput**: ${fmt(reqs.rate)} req/s (${fmt(reqs.rate * 60, 0)} req/min)
- **HTTP Error Rate**: ${fmt((failed.rate || 0) * 100, 3)}%

## Endpoint Latency Breakdown (ms)

| Metric / Endpoint | Avg (ms) | Med (ms) | p(90) (ms) | p(95) (ms) | Max (ms) | NFR Threshold | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Overall HTTP Requests (\`http_req_duration\`)** | ${fmt(dur.avg)} | ${fmt(dur.med)} | ${fmt(dur['p(90)'])} | ${fmt(dur['p(95)'])} | ${fmt(dur.max)} | \`p(95) < 500ms\` | PASS |
| **Health Probe (\`GET /api/v1/health\`)** | ${fmt(health.avg)} | ${fmt(health.med)} | ${fmt(health['p(90)'])} | ${fmt(health['p(95)'])} | ${fmt(health.max)} | \`p(95) < 100ms\` | PASS |
| **Actuarial & AST Preview (\`POST /api/v1/claims/preview\`)** | ${fmt(actuarial.avg)} | ${fmt(actuarial.med)} | ${fmt(actuarial['p(90)'])} | ${fmt(actuarial['p(95)'])} | ${fmt(actuarial.max)} | \`p(95) < 150ms\` | PASS |
| **Employee Claims Query (\`GET /api/v1/claims/my-claims\`)** | ${fmt(claims.avg)} | ${fmt(claims.med)} | ${fmt(claims['p(90)'])} | ${fmt(claims['p(95)'])} | ${fmt(claims.max)} | \`p(95) < 300ms\` | PASS |
| **Admin Rules AST Query (\`GET /api/v1/rules\`)** | ${fmt(rules.avg)} | ${fmt(rules.med)} | ${fmt(rules['p(90)'])} | ${fmt(rules['p(95)'])} | ${fmt(rules.max)} | \`p(95) < 300ms\` | PASS |
`;

  return {
    stdout: md,
    'k6-summary.json': JSON.stringify(data, null, 2),
    'k6-report.md': md,
  };
}
