import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GitHub API Scanner
async function scanGitHubRepository(repoUrl: string, githubToken?: string) {
  try {
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();

    return {
      repository: repoData.full_name,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      open_issues: repoData.open_issues_count,
    };
  } catch (error) {
    console.error('GitHub scan error:', error);
    return null;
  }
}

// Etherscan Smart Contract Scanner
async function scanSmartContract(contractAddress: string, network: string, etherscanKey?: string) {
  try {
    if (!etherscanKey) {
      return null;
    }

    const baseUrls: Record<string, string> = {
      ethereum: 'https://api.etherscan.io/api',
      bsc: 'https://api.bscscan.com/api',
      polygon: 'https://api.polygonscan.com/api',
    };

    const baseUrl = baseUrls[network] || baseUrls.ethereum;

    // Get contract source code
    const sourceResponse = await fetch(
      `${baseUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${etherscanKey}`
    );

    if (!sourceResponse.ok) {
      throw new Error(`Etherscan API error: ${sourceResponse.statusText}`);
    }

    const sourceData = await sourceResponse.json();

    if (sourceData.status === '1' && sourceData.result[0]) {
      const contract = sourceData.result[0];
      return {
        contract_name: contract.ContractName,
        compiler_version: contract.CompilerVersion,
        optimization_used: contract.OptimizationUsed === '1',
        runs: contract.Runs,
        source_code: contract.SourceCode,
        abi: contract.ABI,
        is_verified: contract.SourceCode !== '',
      };
    }

    return null;
  } catch (error) {
    console.error('Etherscan scan error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetUrl, scanType, repositoryUrl, contractAddress, blockchainNetwork, templateId } = await req.json();
    
    console.log('Starting security analysis:', { targetUrl, scanType, repositoryUrl });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase environment variables are not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check scan limits
    const { data: canScan, error: limitError } = await supabase.rpc('can_user_create_scan', {
      user_uuid: user.id
    });

    if (limitError) {
      console.error('Error checking scan limits:', limitError);
    }

    if (!canScan) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Превышен лимит сканирований. Обновите подписку для продолжения.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's integrations
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

  const githubIntegration = integrations?.find((i: Record<string, unknown>) => String(i.provider) === 'github');
  const etherscanIntegration = integrations?.find((i: Record<string, unknown>) => String(i.provider) === 'etherscan');

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scan_history')
      .insert({
        user_id: user.id,
        target_url: targetUrl,
        scan_type: scanType,
        status: 'processing',
        repository_url: repositoryUrl,
        contract_address: contractAddress,
        blockchain_network: blockchainNetwork,
        template_id: templateId,
      })
      .select()
      .single();

    if (scanError) throw scanError;

    // Perform scan
    let mockResults = await simulateScan(targetUrl, scanType);

    // Add GitHub analysis if repository URL provided
    if (repositoryUrl && githubIntegration) {
      const githubData = await scanGitHubRepository(repositoryUrl, githubIntegration.api_key);
      if (githubData) {
        mockResults = {
          ...mockResults,
          github_analysis: githubData,
        };
      }
    }

    // Add Smart Contract analysis if contract address provided
    if (contractAddress && blockchainNetwork && etherscanIntegration) {
      const contractData = await scanSmartContract(
        contractAddress, 
        blockchainNetwork, 
        etherscanIntegration.api_key
      );
      if (contractData) {
        mockResults = {
          ...mockResults,
          smart_contract_analysis: contractData,
        };
      }
    }

    // Get AI analysis
    const aiAnalysis = await analyzeWithAI(targetUrl, scanType, mockResults);

    // Update scan with results
    const { error: updateError } = await supabase
      .from('scan_history')
      .update({
        status: 'completed',
        results: mockResults,
        ai_analysis: aiAnalysis,
      })
      .eq('id', scan.id);

    if (updateError) throw updateError;

    // Update subscription usage
    await supabase.rpc('increment_scans_used', { p_user_id: user.id });

    return new Response(
      JSON.stringify({
        success: true,
        scanId: scan.id,
        results: mockResults,
        aiAnalysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Security analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Internal error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function simulateScan(targetUrl: string, scanType: string) {
  const vulnerabilities = {
    critical: Math.floor(Math.random() * 3),
    high: Math.floor(Math.random() * 5),
    medium: Math.floor(Math.random() * 10),
    low: Math.floor(Math.random() * 15),
  };

  const findings = [];
  const severities = ['critical', 'high', 'medium', 'low'];
  const titles = [
    'SQL Injection vulnerability detected',
    'Cross-Site Scripting (XSS) vulnerability',
    'Insecure authentication mechanism',
    'Missing security headers',
    'Outdated dependencies detected',
    'Reentrancy vulnerability in smart contract',
    'Integer overflow possible',
    'Unprotected function calls',
  ];

  for (const severity of severities) {
    const count = vulnerabilities[severity];
    for (let i = 0; i < count; i++) {
      findings.push({
        id: crypto.randomUUID(),
        severity,
        title: titles[Math.floor(Math.random() * titles.length)],
        description: `Detailed description of ${severity} severity issue found during ${scanType} scan`,
        location: `Line ${Math.floor(Math.random() * 1000) + 1}`,
        recommendation: 'Update to latest version and implement proper validation',
      });
    }
  }

  return {
    scanner: scanType,
    targetUrl,
    timestamp: new Date().toISOString(),
    vulnerabilities,
    findings,
    summary: {
      totalIssues: findings.length,
      riskScore: calculateRiskScore(vulnerabilities),
    },
  };
}

function calculateRiskScore(vulnerabilities: Record<string, number>) {
  const weights: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1 };
  const score =
    (vulnerabilities.critical || 0) * weights.critical +
    (vulnerabilities.high || 0) * weights.high +
    (vulnerabilities.medium || 0) * weights.medium +
    (vulnerabilities.low || 0) * weights.low;

  return Math.min(100, score);
}

async function analyzeWithAI(targetUrl: string, scanType: string, results: unknown) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not configured, skipping AI analysis');
    return 'AI analysis not available';
  }

  try {
  const prompt = `Analyze the following security scan results for ${targetUrl} using ${scanType}:

${JSON.stringify(results, null, 2)}

Provide a concise security assessment including:
1. Overall security posture
2. Critical issues that need immediate attention
3. Recommendations for improvement
4. Priority action items

Keep the response under 500 words and focus on actionable insights.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert specializing in smart contract and web application security analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI analysis error:', response.status, errorText);
      return 'AI analysis temporarily unavailable';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No analysis generated';

  } catch (error) {
    console.error('AI analysis exception:', error);
    return 'AI analysis failed';
  }
}