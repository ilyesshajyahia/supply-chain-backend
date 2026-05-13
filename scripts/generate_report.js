const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '../../test_results.json');
const outputPath = path.join(__dirname, '../../test_report.html');

try {
    const rawData = fs.readFileSync(resultsPath, 'utf8');
    const lines = rawData.split('\n').filter(l => l.trim());
    
    let tests = [];
    let currentTest = null;
    let startTime = Date.now();
    let endTime = Date.now();

    lines.forEach(line => {
        try {
            const msg = JSON.parse(line);
            if (msg.type === 'start') {
                startTime = msg.time;
            }
            if (msg.type === 'testStart') {
                currentTest = {
                    name: msg.test.name,
                    startTime: msg.time,
                    status: 'pending',
                    errors: []
                };
            }
            if (msg.type === 'error' && currentTest) {
                currentTest.errors.push(msg.error);
                currentTest.status = 'failed';
            }
            if (msg.type === 'testDone' && currentTest) {
                currentTest.endTime = msg.time;
                if (currentTest.status === 'pending') {
                    currentTest.status = msg.result === 'success' ? 'passed' : 'failed';
                }
                tests.push(currentTest);
                currentTest = null;
            }
            if (msg.type === 'done') {
                endTime = msg.time;
            }
        } catch (e) {}
    });

    const passedCount = tests.filter(t => t.status === 'passed').length;
    const failedCount = tests.filter(t => t.status === 'failed').length;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChainTrace — Flutter Test Report</title>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .stats { display: flex; gap: 20px; }
        .stat-card { background: #1e293b; padding: 20px; border-radius: 12px; min-width: 120px; border: 1px solid #334155; }
        .stat-val { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
        .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .test-list { background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
        .test-item { padding: 20px; border-bottom: 1px solid #334155; display: flex; flex-direction: column; }
        .test-item:last-child { border-bottom: none; }
        .test-header { display: flex; justify-content: space-between; align-items: center; }
        .test-name { font-weight: 600; font-size: 16px; }
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-passed { background: #065f46; color: #34d399; }
        .status-failed { background: #7f1d1d; color: #f87171; }
        .error-log { margin-top: 12px; background: #0f172a; padding: 12px; border-radius: 8px; color: #f87171; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
        .screenshots { margin-top: 40px; }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot-item { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
        .screenshot-item img { width: 100%; display: block; }
        .screenshot-label { padding: 10px; font-size: 12px; text-align: center; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 style="margin:0; font-size: 28px;">ChainTrace V-Model Report</h1>
                <p style="color: #94a3b8; margin: 8px 0 0;">Automated Flutter Validation Suite</p>
            </div>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-val" style="color: #34d399;">${passedCount}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-val" style="color: #f87171;">${failedCount}</div>
                    <div class="stat-label">Failed</div>
                </div>
            </div>
        </div>

        <div class="test-list">
            ${tests.map(test => `
                <div class="test-item">
                    <div class="test-header">
                        <span class="test-name">${test.name}</span>
                        <span class="status-pill status-${test.status}">${test.status}</span>
                    </div>
                    ${test.errors.length > 0 ? `<div class="error-log">${test.errors.join('\n')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="screenshots">
            <h2>Workflow Screenshots</h2>
            <div class="screenshot-grid">
                ${fs.readdirSync(path.join(__dirname, '../../screenshots')).filter(f => f.endsWith('.png')).map(f => `
                    <div class="screenshot-item">
                        <img src="./screenshots/${f}" alt="${f}">
                        <div class="screenshot-label">${f.replace('.png', '').replace(/_/g, ' ')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(outputPath, html);
    console.log(`✅ HTML Report generated at: ${outputPath}`);
} catch (err) {
    console.error('Failed to generate report:', err);
}
