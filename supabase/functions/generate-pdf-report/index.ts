import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scanId } = await req.json();
    
    console.log('Generating PDF report for scan:', scanId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get scan data
    const { data: scan, error: scanError } = await supabase
      .from('scan_history')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single();

    if (scanError || !scan) {
      throw new Error('Scan not found');
    }

    // Generate HTML report
    const htmlReport = generateHTMLReport(scan);

    // Return HTML for now (PDF generation would require additional library)
    return new Response(htmlReport, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="security-report-${scanId}.html"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateHTMLReport(scan: unknown) {
  const s = scan as Record<string, unknown>;
  const results = (s.results as Record<string, unknown> | undefined) || {};
  const summary = (results.summary as Record<string, unknown> | undefined) || {};
  const vulnerabilities =
    (summary.severityBreakdown as Record<string, number> | undefined) ||
    (results.vulnerabilities as Record<string, number> | undefined) ||
    {};
  const findings = (results.findings as Array<Record<string, unknown>> | undefined) || [];
  const report = (results.report as Record<string, unknown> | undefined) || {};
  const aiAnalysis = (report.ai_analysis as Record<string, unknown> | undefined) || {};
  const remediationRoadmap = (aiAnalysis.remediationRoadmap as string[] | undefined) || [];
  const limitations = (report.limitations as string[] | undefined) || [];

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Отчет безопасности - ${String(s.target_url || '')}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .critical { background: #fee2e2; color: #991b1b; }
    .high { background: #fed7aa; color: #9a3412; }
    .medium { background: #fef3c7; color: #92400e; }
    .low { background: #dbeafe; color: #1e40af; }
    .finding {
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 15px 0;
      background: #f9fafb;
    }
    .finding h3 {
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    .finding p {
      margin: 5px 0;
      color: #4b5563;
    }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Отчет безопасности ChainScout</h1>
    
    <div style="margin: 20px 0;">
      <p><strong>Цель сканирования:</strong> ${String(s.target_url || '')}</p>
      <p><strong>Тип сканирования:</strong> ${String(s.scan_type || '')}</p>
      <p><strong>Дата:</strong> ${new Date(String(s.created_at || '')).toLocaleString('ru-RU')}</p>
      <p><strong>Risk score:</strong> ${String(summary.riskScore || 0)}/100</p>
      <p><strong>Общее число findings:</strong> ${String(summary.totalFindings || findings.length)}</p>
      ${s.repository_url ? `<p><strong>Репозиторий:</strong> ${String(s.repository_url)}</p>` : ''}
      ${s.contract_address ? `<p><strong>Контракт:</strong> ${String(s.contract_address)} (${String(s.blockchain_network || '')})</p>` : ''}
    </div>

    <h2>📊 Сводка уязвимостей</h2>
    <div class="summary">
      <div class="summary-card critical">
        <h3>${vulnerabilities.critical || 0}</h3>
        <p>Критические</p>
      </div>
      <div class="summary-card high">
        <h3>${vulnerabilities.high || 0}</h3>
        <p>Высокие</p>
      </div>
      <div class="summary-card medium">
        <h3>${vulnerabilities.medium || 0}</h3>
        <p>Средние</p>
      </div>
      <div class="summary-card low">
        <h3>${vulnerabilities.low || 0}</h3>
        <p>Низкие</p>
      </div>
    </div>

    <h2>🔍 Обнаруженные проблемы</h2>
    ${findings
      .map((finding) => {
        const f = finding as Record<string, unknown>;
        const severity = String(f.severity || "");
        const title = String(f.title || "");
        const description = String(f.description || "");
        const location = String(f.location || "");
        const recommendation = String(f.recommendation || "");
        const evidence = String(f.evidence || "");
        const tool = String(f.tool || "");

        return `
      <div class="finding">
        <h3>
          <span class="severity-badge ${severity}">${severity}</span>
          ${title}
        </h3>
        <p><strong>Описание:</strong> ${description}</p>
        <p><strong>Местоположение:</strong> ${location}</p>
        ${tool ? `<p><strong>Инструмент:</strong> ${tool}</p>` : ''}
        ${evidence ? `<p><strong>Evidence:</strong> ${evidence}</p>` : ''}
        <p><strong>Рекомендация:</strong> ${recommendation}</p>
      </div>
    `;
      })
      .join('')}

    ${(aiAnalysis.executiveSummary || s.ai_analysis) ? `
      <h2>🤖 AI Анализ</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap;">
        ${String(aiAnalysis.executiveSummary || s.ai_analysis)}
      </div>
    ` : ''}

    ${remediationRoadmap.length ? `
      <h2>🛠 План фиксов</h2>
      <ol>
        ${remediationRoadmap.map((step) => `<li>${step}</li>`).join("")}
      </ol>
    ` : ''}

    ${limitations.length ? `
      <h2>⚠ Ограничения анализа</h2>
      <ul>
        ${limitations.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    ` : ''}

    <div class="footer">
      <p>Отчет создан с помощью ChainScout - Platform для анализа безопасности Web3</p>
      <p>© ${new Date().getFullYear()} ChainScout. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
